// UI components
export { default as Button } from './components/ui/Button.svelte';
export { default as ChipButton } from './components/ui/ChipButton.svelte';
export { default as Card } from './components/ui/Card.svelte';
export { default as Badge } from './components/ui/Badge.svelte';
export { default as NumberInput } from './components/ui/NumberInput.svelte';
export { default as PlayerRow } from './components/ui/PlayerRow.svelte';
export { default as Sheet } from './components/ui/Sheet.svelte';

// Domain utilities
export { buildChart, nearestPoint } from './stackChart';
export type { ChartPoint, ChartData } from './stackChart';
export { calculateSettlement } from './settlement';
export { calculateNet } from './net';
export { calculateAwards } from './awards';
export { buildLeaderboard } from './leaderboard';
export { krToBb, bbToKr, bbSizeKr, formatAmount, netClass, netSign, formatNet, formatPercent } from './chips';
export type { SeatResult, Transfer } from './settlement';
export type { NetInput } from './net';
export type { AwardInput, Award } from './awards';
export type { LeaderboardRow, LeaderboardEntry } from './leaderboard';

// Identity (ADR-0001, ADR-0002)
export { getMyPlayerId, isHost, setMyPlayerId, setHost, clearIdentity } from './identity';

// Realtime seat sync
export { useSessionSync } from './sessionSync';
export type { SessionSync } from './sessionSync';

// Supabase client + types
export { supabase } from './supabaseClient';
export type { Database, Tables, Enums } from './database.types';

// Session helpers
export {
	createSession,
	startSession,
	closeSession,
	loadSession,
	loadSeats,
	upsertSeat,
	claimSeat,
	removeSeat,
	cashOutSeat,
	recordBuyIn,
	updateStack,
	buildSwishLink,
} from './session';
export type { Session, Seat, SeatWithPlayer, BuyIn, StackEvent } from './session';

// Player registry
export { searchPlayers, findOrCreatePlayer, updatePlayerSwish } from './players';
export type { Player } from './players';

// Session read-model / reporting queries
export {
	loadBuyInTotals,
	loadBuyInCounts,
	loadStackLows,
	loadLeaderboardData,
	loadPlayerHistory,
} from './sessionReads';
export type { PlayerSessionRow } from './sessionReads';
