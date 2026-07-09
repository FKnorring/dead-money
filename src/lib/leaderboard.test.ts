import { describe, it, expect } from 'vitest';
import { buildLeaderboard } from './leaderboard';
import type { LeaderboardEntry, LeaderboardRow } from './leaderboard';

// ── Canonical multi-session dataset ──────────────────────────────────────────
//
// Three players, two sessions.
//
// Session A:
//   Anna:  buy-ins 200kr, final_stack 500  → net +300
//   Bo:    buy-ins 400kr, final_stack 100  → net -300
//   Chloe: buy-ins 200kr, final_stack 200  → net 0
//
// Session B:
//   Anna:  buy-ins 200kr, final_stack 100  → net -100
//   Bo:    buy-ins 200kr, final_stack 400  → net +200
//
// Expected totals:
//   Anna:  totalNet +200  (300 - 100),  sessionsPlayed 2, wins 1, winRate 0.5,
//          biggestWin 300, worstNet -100
//   Bo:    totalNet -100  (-300 + 200),  sessionsPlayed 2, wins 1, winRate 0.5,
//          biggestWin 200, worstNet -300
//   Chloe: totalNet 0,    sessionsPlayed 1, wins 0, winRate 0,
//          biggestWin 0,  worstNet 0
//
// Ranking by totalNet: Anna (+200) > Chloe (0) > Bo (-100)

const SESSION_A = 'session-a';
const SESSION_B = 'session-b';

const ROWS: LeaderboardRow[] = [
	// Session A
	{ playerId: 'anna',  playerName: 'Anna',  sessionId: SESSION_A, totalBuyIns: 200, finalStack: 500 },
	{ playerId: 'bo',    playerName: 'Bo',    sessionId: SESSION_A, totalBuyIns: 400, finalStack: 100 },
	{ playerId: 'chloe', playerName: 'Chloe', sessionId: SESSION_A, totalBuyIns: 200, finalStack: 200 },
	// Session B
	{ playerId: 'anna',  playerName: 'Anna',  sessionId: SESSION_B, totalBuyIns: 200, finalStack: 100 },
	{ playerId: 'bo',    playerName: 'Bo',    sessionId: SESSION_B, totalBuyIns: 200, finalStack: 400 },
];

describe('buildLeaderboard', () => {
	it('ranks Anna first, Chloe second, Bo third by totalNet', () => {
		const entries = buildLeaderboard(ROWS);
		expect(entries.map(e => e.playerName)).toEqual(['Anna', 'Chloe', 'Bo']);
	});

	it('computes totalNet correctly for Anna (+200)', () => {
		const entries = buildLeaderboard(ROWS);
		const anna = entries.find(e => e.playerId === 'anna')!;
		expect(anna.totalNet).toBe(200);
	});

	it('computes totalNet correctly for Bo (-100)', () => {
		const entries = buildLeaderboard(ROWS);
		const bo = entries.find(e => e.playerId === 'bo')!;
		expect(bo.totalNet).toBe(-100);
	});

	it('computes totalNet correctly for Chloe (0)', () => {
		const entries = buildLeaderboard(ROWS);
		const chloe = entries.find(e => e.playerId === 'chloe')!;
		expect(chloe.totalNet).toBe(0);
	});

	it('counts sessionsPlayed correctly', () => {
		const entries = buildLeaderboard(ROWS);
		const anna = entries.find(e => e.playerId === 'anna')!;
		const bo = entries.find(e => e.playerId === 'bo')!;
		const chloe = entries.find(e => e.playerId === 'chloe')!;
		expect(anna.sessionsPlayed).toBe(2);
		expect(bo.sessionsPlayed).toBe(2);
		expect(chloe.sessionsPlayed).toBe(1);
	});

	it('counts wins (net > 0) correctly', () => {
		const entries = buildLeaderboard(ROWS);
		const anna = entries.find(e => e.playerId === 'anna')!;
		const bo = entries.find(e => e.playerId === 'bo')!;
		const chloe = entries.find(e => e.playerId === 'chloe')!;
		expect(anna.wins).toBe(1);
		expect(bo.wins).toBe(1);
		expect(chloe.wins).toBe(0);
	});

	it('computes winRate as wins / sessionsPlayed', () => {
		const entries = buildLeaderboard(ROWS);
		const anna = entries.find(e => e.playerId === 'anna')!;
		const chloe = entries.find(e => e.playerId === 'chloe')!;
		expect(anna.winRate).toBeCloseTo(0.5);
		expect(chloe.winRate).toBe(0);
	});

	it('tracks biggestWin and worstNet correctly', () => {
		const entries = buildLeaderboard(ROWS);
		const anna = entries.find(e => e.playerId === 'anna')!;
		const bo = entries.find(e => e.playerId === 'bo')!;
		expect(anna.biggestWin).toBe(300);
		expect(anna.worstNet).toBe(-100);
		expect(bo.biggestWin).toBe(200);
		expect(bo.worstNet).toBe(-300);
	});

	it('returns empty array for empty input', () => {
		expect(buildLeaderboard([])).toEqual([]);
	});

	it('handles a player with only one session and break-even result', () => {
		const single: LeaderboardRow[] = [
			{ playerId: 'x', playerName: 'X', sessionId: 's1', totalBuyIns: 100, finalStack: 100 },
		];
		const [entry] = buildLeaderboard(single);
		expect(entry.totalNet).toBe(0);
		expect(entry.sessionsPlayed).toBe(1);
		expect(entry.wins).toBe(0);
		expect(entry.winRate).toBe(0);
		expect(entry.biggestWin).toBe(0);
		expect(entry.worstNet).toBe(0);
	});
});
