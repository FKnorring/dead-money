import { supabase } from './supabaseClient';
import type { Tables } from './database.types';

export type Session = Tables<'sessions'>;
export type Player = Tables<'players'>;
export type Seat = Tables<'seats'> & { players: Pick<Player, 'id' | 'name' | 'swish_number'> };

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
			bb_size: Math.round(buyInAmount / 100),
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
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(`host_token_${session.id}`, 'true');
		localStorage.setItem(`player_id_${session.id}`, hostPlayerId);
	}

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
 * - Writes a stack_events snapshot row.
 * - If the seat's stack is currently null (first buy-in), seeds it to the buy-in amount.
 */
export async function recordBuyIn({
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
	// Insert the buy-in
	const { error: buyInError } = await supabase
		.from('buy_ins')
		.insert({ seat_id: seatId, session_id: sessionId, player_id: playerId, amount });

	if (buyInError) throw buyInError;

	// Write a stack_events snapshot
	await emitStackSnapshot({ seatId, sessionId, playerId, amount });

	// Seed stack to buy-in amount if it's the player's first buy-in (stack is null)
	const { data: seat, error: seatFetchError } = await supabase
		.from('seats')
		.select('stack')
		.eq('id', seatId)
		.maybeSingle();

	if (seatFetchError) throw seatFetchError;

	if (seat && seat.stack === null) {
		const { error: stackError } = await supabase
			.from('seats')
			.update({ stack: amount })
			.eq('id', seatId);

		if (stackError) throw stackError;
	}
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
