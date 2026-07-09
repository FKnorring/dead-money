// UI components
export { default as Button } from './components/ui/Button.svelte';
export { default as ChipButton } from './components/ui/ChipButton.svelte';
export { default as Card } from './components/ui/Card.svelte';
export { default as Badge } from './components/ui/Badge.svelte';
export { default as NumberInput } from './components/ui/NumberInput.svelte';
export { default as PlayerRow } from './components/ui/PlayerRow.svelte';
export { default as Sheet } from './components/ui/Sheet.svelte';

// Domain utilities
export { calculateSettlement } from './settlement';
export { calculateNet } from './net';
export { krToBb, bbToKr } from './chips';
export type { SeatResult, Transfer } from './settlement';
export type { NetInput } from './net';
export type { SessionConfig } from './chips';

// Supabase client + types
export { supabase } from './supabaseClient';
export type { Database, Tables, Enums } from './database.types';

// Session helpers
export {
	createSession,
	startSession,
	searchPlayers,
	findOrCreatePlayer,
	loadSeats,
	upsertSeat,
	claimSeat,
	removeSeat
} from './session';
export type { Session, Player, Seat } from './session';
