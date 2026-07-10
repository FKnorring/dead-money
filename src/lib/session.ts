import { supabase } from './supabaseClient';
import type { Tables } from './database.types';
import { bbSizeKr } from './chips';
import { setHost, setMyPlayerId } from './identity';
import { calculateNet } from './net';
import type { LeaderboardRow } from './leaderboard';

export type Session = Tables<'sessions'>;
export type Player = Tables<'players'>;
export type Seat = Tables<'seats'> & { players: Pick<Player, 'id' | 'name' | 'swish_number'> };
/** Seat with the player join already loaded — the shape returned by loadSeats(). */
export type SeatWithPlayer = Seat;

// ─── Session ──────────────────────────────────────────────────────────────────

/**
 * Create a new Session in Lobby state and insert the host's Seat.
 * Stores host_token and player_id in localStorage.
 */
export async function createSession({
	hostPlayerId,
	buyInAmount,
	label,
	location
}: {
	hostPlayerId: string;
	buyInAmount: number;
	label?: string;
	location?: string;
}): Promise<Session> {
	const { data: session, error } = await supabase
		.from('sessions')
		.insert({
			host_player_id: hostPlayerId,
			buy_in_amount: buyInAmount,
			bb_size: bbSizeKr({ buy_in_amount: buyInAmount }),
			label: label || null,
			location: location || null,
			state: 'lobby'
		})
		.select()
		.single();

	if (error) throw error;

	// Host's seat — claimed immediately
	await upsertSeat({ sessionId: session.id, playerId: hostPlayerId, claimed: true });

	// Persist host identity (ADR-0002)
	setHost(session.id);
	setMyPlayerId(session.id, hostPlayerId);

	return session;
}

/**
 * Transition a Session from lobby → active.
 */
export async function startSession(sessionId: string): Promise<void> {
	const { error } = await supabase
		.from('sessions')
		.update({ state: 'active', started_at: new Date().toISOString() })
		.eq('id', sessionId);

	if (error) throw error;
}

/**
 * Load a single Session by ID. Returns null if not found.
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
	const { data, error } = await supabase
		.from('sessions')
		.select('*')
		.eq('id', sessionId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

// ─── Players ──────────────────────────────────────────────────────────────────

/**
 * Search the global player registry by name (case-insensitive prefix match).
 * Returns up to 10 results.
 */
export async function searchPlayers(query: string): Promise<Player[]> {
	if (!query.trim()) return [];

	const { data, error } = await supabase
		.from('players')
		.select()
		.ilike('name', `%${query}%`)
		.order('name')
		.limit(10);

	if (error) throw error;
	return data ?? [];
}

/**
 * Find an existing player by exact name (case-insensitive), or create a new one.
 */
export async function findOrCreatePlayer(name: string): Promise<Player> {
	const trimmed = name.trim();

	// Try exact match first
	const { data: existing } = await supabase
		.from('players')
		.select()
		.ilike('name', trimmed)
		.limit(1)
		.single();

	if (existing) return existing;

	// Create new player
	const { data: created, error } = await supabase
		.from('players')
		.insert({ name: trimmed })
		.select()
		.single();

	if (error) throw error;
	return created;
}

// ─── Seats ───────────────────────────────────────────────────────────────────

/**
 * Load all Seats for a Session, joined with the Player's name.
 */
export async function loadSeats(sessionId: string): Promise<Seat[]> {
	const { data, error } = await supabase
		.from('seats')
		.select('*, players(id, name, swish_number)')
		.eq('session_id', sessionId)
		.order('joined_at');

	if (error) throw error;
	return (data ?? []) as Seat[];
}

/**
 * Add a player to a session (or claim their existing seat).
 * Handles both: host adding someone (claimed=false) and player joining (claimed=true).
 */
export async function upsertSeat({
	sessionId,
	playerId,
	claimed
}: {
	sessionId: string;
	playerId: string;
	claimed: boolean;
}): Promise<void> {
	const { error } = await supabase
		.from('seats')
		.upsert(
			{ session_id: sessionId, player_id: playerId, claimed },
			{ onConflict: 'session_id,player_id', ignoreDuplicates: false }
		);

	if (error) throw error;
}

/**
 * Claim an existing seat by its ID (player identifying themselves).
 */
export async function claimSeat(seatId: string): Promise<void> {
	const { error } = await supabase
		.from('seats')
		.update({ claimed: true })
		.eq('id', seatId);

	if (error) throw error;
}

/**
 * Remove a player's seat from a session (host only).
 */
export async function removeSeat(seatId: string): Promise<void> {
	const { error } = await supabase
		.from('seats')
		.delete()
		.eq('id', seatId);

	if (error) throw error;
}

// ─── Active session tracking ──────────────────────────────────────────────────

export type BuyIn = Tables<'buy_ins'>;
export type StackEvent = Tables<'stack_events'>;

async function emitStackSnapshot({
	seatId,
	sessionId,
	playerId,
	amount
}: {
	seatId: string;
	sessionId: string;
	playerId: string;
	amount: number;
}): Promise<void> {
	const { error } = await supabase
		.from('stack_events')
		.insert({ seat_id: seatId, session_id: sessionId, player_id: playerId, amount, type: 'snapshot' as const });

	if (error) throw error;
}

/**
 * Record a buy-in for a player in an active session.
 * - Inserts a buy_ins row.
 * - Updates seats.stack to newStack.
 * - Writes a single stack_events snapshot row with amount = newStack (the resulting stack).
 */
export async function recordBuyIn({
	seatId,
	sessionId,
	playerId,
	amount,
	newStack
}: {
	seatId: string;
	sessionId: string;
	playerId: string;
	amount: number;
	newStack: number;
}): Promise<void> {
	// Insert the buy-in.
	const { error: buyInError } = await supabase
		.from('buy_ins')
		.insert({ seat_id: seatId, session_id: sessionId, player_id: playerId, amount });

	if (buyInError) throw buyInError;

	// Update seats.stack to the resulting stack after this buy-in.
	const { error: seatError } = await supabase
		.from('seats')
		.update({ stack: newStack })
		.eq('id', seatId);

	if (seatError) throw seatError;

	// Write a single stack_events snapshot with the actual resulting stack.
	await emitStackSnapshot({ seatId, sessionId, playerId, amount: newStack });
}

/**
 * Update a player's stack to an absolute value.
 * - Updates seats.stack.
 * - Writes a stack_events snapshot row.
 */
export async function updateStack({
	seatId,
	sessionId,
	playerId,
	stack
}: {
	seatId: string;
	sessionId: string;
	playerId: string;
	stack: number;
}): Promise<void> {
	const { error: seatError } = await supabase
		.from('seats')
		.update({ stack })
		.eq('id', seatId);

	if (seatError) throw seatError;

	await emitStackSnapshot({ seatId, sessionId, playerId, amount: stack });
}

/**
 * Lock a player's final stack and mark them as cashed out.
 * - Sets seats.cashed_out=true, final_stack, cashed_out_at=now().
 * - Writes a stack_events row with type='cash_out'.
 */
export async function cashOutSeat({
	seatId,
	finalStack
}: {
	seatId: string;
	finalStack: number;
}): Promise<void> {
	// First fetch the seat so we have session_id and player_id for the event row.
	const { data: seat, error: fetchError } = await supabase
		.from('seats')
		.select('session_id, player_id')
		.eq('id', seatId)
		.single();

	if (fetchError) throw fetchError;

	const { error: seatError } = await supabase
		.from('seats')
		.update({
			cashed_out: true,
			final_stack: finalStack,
			cashed_out_at: new Date().toISOString(),
		})
		.eq('id', seatId);

	if (seatError) throw seatError;

	const { error: eventError } = await supabase
		.from('stack_events')
		.insert({
			seat_id: seatId,
			session_id: seat.session_id,
			player_id: seat.player_id,
			amount: finalStack,
			type: 'cash_out' as const,
		});

	if (eventError) throw eventError;
}

/**
 * Transition a Session from active → closed.
 */
export async function closeSession(sessionId: string): Promise<void> {
	const { error } = await supabase
		.from('sessions')
		.update({ state: 'closed', closed_at: new Date().toISOString() })
		.eq('id', sessionId);

	if (error) throw error;
}

/**
 * Update a player's Swish number (for receiving payments on the settlement screen).
 */
export async function updatePlayerSwish(playerId: string, swishNumber: string): Promise<void> {
	const { error } = await supabase
		.from('players')
		.update({ swish_number: swishNumber })
		.eq('id', playerId);

	if (error) throw error;
}

/**
 * Build a Swish deep-link for a payment.
 * Format: swish://payment?payee=<swishNumber>&amount=<amount>&message=Poker+<date>
 *
 * @param swishNumber  The payee's Swish number (digits only, e.g. "0701234567")
 * @param amount       Amount in kr (integer)
 * @param date         Date string used in the message, e.g. "2026-07-09"
 */
export function buildSwishLink({
	swishNumber,
	amount,
	date,
}: {
	swishNumber: string;
	amount: number;
	date: string;
}): string {
	return `swish://payment?payee=${swishNumber}&amount=${amount}&message=Poker+${date}`;
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

// ─── Leaderboard ──────────────────────────────────────────────────────────────

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

// ─── Player history ───────────────────────────────────────────────────────────

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
