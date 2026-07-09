import { calculateNet } from './net';

/**
 * One row from the leaderboard data query — one seat per closed session.
 * Used as input to buildLeaderboard().
 */
export interface LeaderboardRow {
	playerId: string;
	playerName: string;
	sessionId: string;
	totalBuyIns: number;
	finalStack: number | null;
}

/**
 * Aggregated cross-session stats for a single Player on the leaderboard.
 */
export interface LeaderboardEntry {
	playerId: string;
	playerName: string;
	/** Sum of (finalStack - totalBuyIns) across all sessions. */
	totalNet: number;
	sessionsPlayed: number;
	/** Sessions where net > 0. */
	wins: number;
	/** wins / sessionsPlayed (0 if no sessions). */
	winRate: number;
	/** Maximum single-session net (0 if never positive). */
	biggestWin: number;
	/** Minimum single-session net (0 if never negative). */
	worstNet: number;
}

/**
 * Aggregate per-seat session rows into a ranked leaderboard.
 * Pure function — no DB calls.
 *
 * @param rows  One entry per (player × closed session) — e.g. from loadLeaderboardData().
 * @returns     Players sorted by totalNet descending.
 */
export function buildLeaderboard(rows: LeaderboardRow[]): LeaderboardEntry[] {
	const map = new Map<string, LeaderboardEntry>();

	for (const row of rows) {
		const net = calculateNet({ totalBuyIns: row.totalBuyIns, finalStack: row.finalStack });

		let entry = map.get(row.playerId);
		if (!entry) {
			entry = {
				playerId: row.playerId,
				playerName: row.playerName,
				totalNet: 0,
				sessionsPlayed: 0,
				wins: 0,
				winRate: 0,
				biggestWin: 0,
				worstNet: 0,
			};
			map.set(row.playerId, entry);
		}

		entry.totalNet += net;
		entry.sessionsPlayed += 1;
		if (net > 0) entry.wins += 1;
		if (net > entry.biggestWin) entry.biggestWin = net;
		if (net < entry.worstNet) entry.worstNet = net;
	}

	const entries = Array.from(map.values());

	// Compute win rate now that sessionsPlayed is final
	for (const entry of entries) {
		entry.winRate = entry.sessionsPlayed > 0 ? entry.wins / entry.sessionsPlayed : 0;
	}

	return entries.sort((a, b) => b.totalNet - a.totalNet);
}
