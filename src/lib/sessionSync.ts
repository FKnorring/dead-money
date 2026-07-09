/**
 * useSessionSync — Svelte 5 rune-based module that owns the Realtime subscription
 * for seats in a Session. Centralises the seats query and the channel setup so
 * every route crosses the same seam instead of each page maintaining its own
 * mirror-image $effect.
 *
 * Usage:
 *   const sync = useSessionSync(sessionId, initialSeats);
 *   // bind sync.seats in the template
 *   // call sync.destroy() in an $effect cleanup (or let the effect return it)
 */

import { supabase } from './supabaseClient';
import { loadSeats } from './session';
import type { SeatWithPlayer } from './session';

export interface SessionSync {
	/** Reactive seats array — replace-assigned on every change. */
	seats: SeatWithPlayer[];
	/** Tear down the Supabase channels. */
	destroy: () => void;
}

/**
 * Subscribe to seat changes for a Session and keep `seats` up to date.
 * Returns a { seats, destroy } object. Call destroy() when the component unmounts.
 *
 * @param sessionId  The Session to watch.
 * @param initial    Seed value from the server load — avoids a flash of empty.
 * @param onUpdate   Optional callback invoked after seats are refreshed.
 */
export function useSessionSync(
	sessionId: string,
	initial: SeatWithPlayer[],
	onUpdate?: (seats: SeatWithPlayer[]) => void
): SessionSync {
	// Plain mutable object — callers in Svelte components wrap this in $state
	// at the call site so that assignments to .seats trigger reactivity.
	const sync: SessionSync = {
		seats: initial,
		destroy: () => { /* replaced below */ },
	};

	const channel = supabase
		.channel(`sync:seats:${sessionId}`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'seats', filter: `session_id=eq.${sessionId}` },
			async () => {
				const fresh = await loadSeats(sessionId);
				sync.seats = fresh;
				onUpdate?.(fresh);
			}
		)
		.subscribe();

	sync.destroy = () => { supabase.removeChannel(channel); };

	return sync;
}
