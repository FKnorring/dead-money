/**
 * Session identity — who is the current user and are they the Host?
 *
 * Owns the localStorage key convention so no other module needs to know it.
 * All reads and writes go through this module (ADR-0001, ADR-0002).
 *
 * Key layout (per-session):
 *   player_id_<sessionId>   — the Player ID this device represents
 *   host_token_<sessionId>  — "true" when this device created the Session
 */

function playerKey(sessionId: string): string {
	return `player_id_${sessionId}`;
}

function hostKey(sessionId: string): string {
	return `host_token_${sessionId}`;
}

/** Returns the Player ID stored for this Session on this device, or null. */
export function getMyPlayerId(sessionId: string): string | null {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(playerKey(sessionId));
}

/** Returns true when this device created (and is therefore Host of) this Session. */
export function isHost(sessionId: string): boolean {
	if (typeof localStorage === 'undefined') return false;
	return localStorage.getItem(hostKey(sessionId)) === 'true';
}

/** Persist the Player ID this device is using for the given Session. */
export function setMyPlayerId(sessionId: string, playerId: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(playerKey(sessionId), playerId);
}

/** Mark this device as Host of the given Session. */
export function setHost(sessionId: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(hostKey(sessionId), 'true');
}

/** Clear all identity tokens for the given Session (e.g. on session close). */
export function clearIdentity(sessionId: string): void {
	if (typeof localStorage === 'undefined') return;
	localStorage.removeItem(playerKey(sessionId));
	localStorage.removeItem(hostKey(sessionId));
}
