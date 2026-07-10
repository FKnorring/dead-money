import { supabase } from './supabaseClient';
import { calculateNet } from './net';
import type { Player } from './players';
import type { LeaderboardRow } from './leaderboard';

export interface PlayerSessionRow {
	sessionId: string;
	sessionLabel: string | null;
	sessionCreatedAt: string;
	sessionClosedAt: string | null;
	buyInAmount: number;
	totalBuyIns: number;
	buyInCount: number;
	finalStack: number | null;
	net: number;
	/** Stack event rows (snapshots only), ordered by created_at asc. */
	stackTimeline: { amount: number; createdAt: string }[];
}

/**
 * Load the lowest stack each player reached during a session, derived from
 * stack_events snapshots. Used for the biggest-comeback award.
 * Returns a Record<playerId, minStack>.
 */
export async function loadStackLows(sessionId: string): Promise<Record<string, number>> {
	const { data, error } = await supabase
		.from('stack_events')
		.select('player_id, amount')
		.eq('session_id', sessionId)
		.eq('type', 'snapshot');

	if (error) throw error;

	const lows: Record<string, number> = {};
	for (const row of data ?? []) {
		if (lows[row.player_id] === undefined || row.amount < lows[row.player_id]) {
			lows[row.player_id] = row.amount;
		}
	}
	return lows;
}

/**
 * Load total buy-ins per player for a session.
 * Returns a Record<playerId, totalKr>.
 */
export async function loadBuyInTotals(sessionId: string): Promise<Record<string, number>> {
	const { data, error } = await supabase
		.from('buy_ins')
		.select('player_id, amount')
		.eq('session_id', sessionId);

	if (error) throw error;

	const totals: Record<string, number> = {};
	for (const row of data ?? []) {
		totals[row.player_id] = (totals[row.player_id] ?? 0) + row.amount;
	}
	return totals;
}

/**
 * Load the number of buy-in events per player for a session.
 * Returns a Record<playerId, count>.
 */
export async function loadBuyInCounts(sessionId: string): Promise<Record<string, number>> {
	const { data, error } = await supabase
		.from('buy_ins')
		.select('player_id')
		.eq('session_id', sessionId);

	if (error) throw error;

	const counts: Record<string, number> = {};
	for (const row of data ?? []) {
		counts[row.player_id] = (counts[row.player_id] ?? 0) + 1;
	}
	return counts;
}

/**
 * Load all closed sessions' seats with player names and per-seat buy-in totals.
 * Returns one LeaderboardRow per (player × closed session).
 * Client-side aggregation is done by buildLeaderboard().
 */
export async function loadLeaderboardData(): Promise<LeaderboardRow[]> {
	// Fetch all cashed-out seats for closed sessions, joined with the player name.
	// The cashed_out filter matches the PRD formula: only seats that locked a final stack.
	const { data: seats, error: seatsError } = await supabase
		.from('seats')
		.select('id, player_id, session_id, final_stack, players(id, name), sessions!inner(state)')
		.eq('sessions.state', 'closed')
		.eq('cashed_out', true);

	if (seatsError) throw seatsError;

	if (!seats || seats.length === 0) return [];

	// Collect all session IDs so we can batch-load buy-in totals
	const sessionIds = [...new Set(seats.map(s => s.session_id))];

	const { data: buyIns, error: buyInsError } = await supabase
		.from('buy_ins')
		.select('player_id, session_id, amount')
		.in('session_id', sessionIds);

	if (buyInsError) throw buyInsError;

	// Build a lookup: (sessionId + playerId) → totalBuyIns
	const buyInMap = new Map<string, number>();
	for (const row of buyIns ?? []) {
		const key = `${row.session_id}:${row.player_id}`;
		buyInMap.set(key, (buyInMap.get(key) ?? 0) + row.amount);
	}

	return seats.map((seat) => {
		const player = seat.players as { id: string; name: string } | null;
		const key = `${seat.session_id}:${seat.player_id}`;
		return {
			playerId: seat.player_id,
			playerName: player?.name ?? seat.player_id,
			sessionId: seat.session_id,
			totalBuyIns: buyInMap.get(key) ?? 0,
			finalStack: seat.final_stack,
		};
	});
}

/**
 * Load stack event timelines (snapshots) for all players in a session.
 * Returns a Record<playerId, { amount, createdAt }[]> ordered by time asc.
 */
export async function loadSessionTimelines(
	sessionId: string
): Promise<Record<string, { amount: number; createdAt: string }[]>> {
	const { data, error } = await supabase
		.from('stack_events')
		.select('player_id, amount, created_at')
		.eq('session_id', sessionId)
		.eq('type', 'snapshot')
		.order('created_at');

	if (error) throw error;

	const timelines: Record<string, { amount: number; createdAt: string }[]> = {};
	for (const row of data ?? []) {
		const list = timelines[row.player_id] ?? [];
		list.push({ amount: row.amount, createdAt: row.created_at });
		timelines[row.player_id] = list;
	}
	return timelines;
}

/**
 * Load all closed sessions this player participated in, newest first.
 * Includes per-session buy-in totals and any stack_events snapshots for
 * rendering a timeline chart.
 */
export async function loadPlayerHistory(playerId: string): Promise<{
	player: Pick<Player, 'id' | 'name'> | null;
	sessions: PlayerSessionRow[];
}> {
	// Load player info
	const { data: player, error: playerError } = await supabase
		.from('players')
		.select('id, name')
		.eq('id', playerId)
		.maybeSingle();

	if (playerError) throw playerError;

	// Load all cashed-out seats for closed sessions where the player participated.
	// No DB ordering — JS re-sorts by sessionCreatedAt (UUIDs don't sort chronologically).
	const { data: seats, error: seatsError } = await supabase
		.from('seats')
		.select('session_id, final_stack, sessions!inner(id, label, created_at, closed_at, buy_in_amount, state)')
		.eq('player_id', playerId)
		.eq('sessions.state', 'closed')
		.eq('cashed_out', true);

	if (seatsError) throw seatsError;
	if (!seats || seats.length === 0) return { player, sessions: [] };

	const sessionIds = seats.map(s => s.session_id);

	// Batch load buy-ins and stack events for all sessions
	const [buyInsResult, eventsResult] = await Promise.all([
		supabase
			.from('buy_ins')
			.select('session_id, amount')
			.eq('player_id', playerId)
			.in('session_id', sessionIds),
		supabase
			.from('stack_events')
			.select('session_id, amount, created_at')
			.eq('player_id', playerId)
			.eq('type', 'snapshot')
			.in('session_id', sessionIds)
			.order('created_at'),
	]);

	if (buyInsResult.error) throw buyInsResult.error;
	if (eventsResult.error) throw eventsResult.error;

	// Buy-in totals per session
	const buyInTotals = new Map<string, number>();
	const buyInCounts = new Map<string, number>();
	for (const row of buyInsResult.data ?? []) {
		buyInTotals.set(row.session_id, (buyInTotals.get(row.session_id) ?? 0) + row.amount);
		buyInCounts.set(row.session_id, (buyInCounts.get(row.session_id) ?? 0) + 1);
	}

	// Stack event timelines per session
	const timelines = new Map<string, { amount: number; createdAt: string }[]>();
	for (const row of eventsResult.data ?? []) {
		const list = timelines.get(row.session_id) ?? [];
		list.push({ amount: row.amount, createdAt: row.created_at });
		timelines.set(row.session_id, list);
	}

	const sessionRows: PlayerSessionRow[] = seats.map((seat) => {
		const session = seat.sessions as {
			id: string;
			label: string | null;
			created_at: string;
			closed_at: string | null;
			buy_in_amount: number;
			state: string;
		};
		const totalBuyIns = buyInTotals.get(seat.session_id) ?? 0;
		const net = calculateNet({ totalBuyIns, finalStack: seat.final_stack });
		return {
			sessionId: seat.session_id,
			sessionLabel: session.label,
			sessionCreatedAt: session.created_at,
			sessionClosedAt: session.closed_at,
			buyInAmount: session.buy_in_amount,
			totalBuyIns,
			buyInCount: buyInCounts.get(seat.session_id) ?? 0,
			finalStack: seat.final_stack,
			net,
			stackTimeline: timelines.get(seat.session_id) ?? [],
		};
	});

	// Sort newest first
	sessionRows.sort((a, b) => b.sessionCreatedAt.localeCompare(a.sessionCreatedAt));

	return { player, sessions: sessionRows };
}
