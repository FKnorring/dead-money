import { supabase } from './supabaseClient';
import type { Tables } from './database.types';
import { bbSizeKr } from './chips';
import { setHost, setMyPlayerId } from './identity';

export type Session = Tables<'sessions'>;
export type { Player } from './players';
export type Seat = Tables<'seats'> & { players: Pick<Tables<'players'>, 'id' | 'name' | 'swish_number'> };
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
 * Build a Swish deep-link for a payment.
 * Format: https://app.swish.nu/1/p/sw/?sw=<number>&amt=<amount>&cur=SEK&msg=<message>&edit=amt%2Cmsg&src=qr
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
	const msg = encodeURIComponent(`Poker ${date}`);
	return `https://app.swish.nu/1/p/sw/?sw=${swishNumber}&amt=${amount}&cur=SEK&edit=amt&src=qr`;
}
