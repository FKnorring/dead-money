/**
 * useSessionSync — subscribes to seat changes for a Session and invokes a
 * callback with the fresh seats array on every change. Centralises the
 * Realtime channel setup so every route crosses the same seam instead of each
 * page maintaining its own mirror-image $effect.
 *
 * Usage:
 *   const sync = useSessionSync(sessionId, (fresh) => { seats = fresh; });
 *   // call sync.destroy() in an $effect cleanup (or let the effect return it)
 */

import { supabase } from './supabaseClient';
import { loadSeats } from './session';
import type { SeatWithPlayer } from './session';

export interface SessionSync {
	/** Tear down the Supabase channels. */
	destroy: () => void;
}

/**
 * Subscribe to seat changes for a Session and invoke a callback with the
 * refreshed seats on every change. Returns a { destroy } object — call
 * destroy() when the component unmounts.
 *
 * @param sessionId  The Session to watch.
 * @param onUpdate   Callback invoked with the fresh seats array after each change.
 */
export function useSessionSync(
	sessionId: string,
	onUpdate: (seats: SeatWithPlayer[]) => void
): SessionSync {
	const channel = supabase
		.channel(`sync:seats:${sessionId}`)
		.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'seats', filter: `session_id=eq.${sessionId}` },
			async () => {
				const fresh = await loadSeats(sessionId);
				onUpdate(fresh);
			}
		)
		.subscribe();

	return { destroy: () => { supabase.removeChannel(channel); } };
}
