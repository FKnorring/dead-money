import { describe, it, expect } from 'vitest';
import { calculateAwards } from './awards';
import type { AwardInput } from './awards';

// ── Canonical 4-player session ────────────────────────────────────────────────
//
// Anna:  bought in 200kr once, cashed out with 650kr  → net +450 (biggest winner)
//        stackLow 50 → swing 650-50 = +600 (biggest comeback)
// Bo:    bought in 200kr × 4 = 800kr, cashed out 150kr → net -650 (biggest loser, most buy-ins)
//        stackLow 0 → swing 150-0 = +150
// Chloe: bought in 200kr once, cashed out with 200kr  → net 0    (break-even)
//        stackLow 100 → swing 200-100 = +100
// Dan:   bought in 200kr × 2 = 400kr, cashed out 0kr  → net -400 (first bust)
//        stackLow 0 → swing 0-0 = 0
//
// last-stand: Anna cashed out last
// biggest-comeback: Anna — swing +600 from stackLow 50

const FOUR_PLAYERS: AwardInput[] = [
	{
		name: 'Anna',
		net: 450,
		totalBuyIns: 200,
		finalStack: 650,
		buyInCount: 1,
		buyInAmount: 200,
		cashedOutAt: '2026-07-09T23:59:00Z',
		stackLow: 50,
	},
	{
		name: 'Bo',
		net: -650,
		totalBuyIns: 800,
		finalStack: 150,
		buyInCount: 4,
		buyInAmount: 200,
		cashedOutAt: '2026-07-09T22:00:00Z',
		stackLow: 0,
	},
	{
		name: 'Chloe',
		net: 0,
		totalBuyIns: 200,
		finalStack: 200,
		buyInCount: 1,
		buyInAmount: 200,
		cashedOutAt: '2026-07-09T23:00:00Z',
		stackLow: 100,
	},
	{
		name: 'Dan',
		net: -400,
		totalBuyIns: 400,
		finalStack: 0,
		buyInCount: 2,
		buyInAmount: 200,
		cashedOutAt: '2026-07-09T21:00:00Z',
		stackLow: 0,
	},
];

describe('calculateAwards', () => {
	it('assigns every award category exactly once for the 4-player session', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const ids = awards.map((a) => a.id);
		expect(ids).toContain('biggest-winner');
		expect(ids).toContain('biggest-loser');
		expect(ids).toContain('break-even');
		expect(ids).toContain('most-buyins');
		expect(ids).toContain('last-stand');
		expect(ids).toContain('first-bust');
		expect(ids).toContain('biggest-comeback');
	});

	it('gives biggest-winner to Anna (+450)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'biggest-winner');
		expect(award?.recipientName).toBe('Anna');
		expect(award?.stat).toBe('+450 kr');
	});

	it('gives biggest-loser to Bo (-650)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'biggest-loser');
		expect(award?.recipientName).toBe('Bo');
		expect(award?.stat).toBe('-650 kr');
	});

	it('gives break-even to Chloe (net 0)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'break-even');
		expect(award?.recipientName).toBe('Chloe');
		expect(award?.stat).toBe('0 kr');
	});

	it('gives most-buyins to Bo (4 buy-ins)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'most-buyins');
		expect(award?.recipientName).toBe('Bo');
		expect(award?.stat).toBe('4 buy-ins');
	});

	it('gives last-stand to Anna (cashed out last)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'last-stand');
		expect(award?.recipientName).toBe('Anna');
	});

	it('gives first-bust to Dan (first to cash out with negative net)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'first-bust');
		expect(award?.recipientName).toBe('Dan');
	});

	it('gives biggest-comeback to Anna (swing +600 from stackLow 50)', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		const award = awards.find((a) => a.id === 'biggest-comeback');
		expect(award?.recipientName).toBe('Anna');
		expect(award?.stat).toBe('+600 kr');
	});

	it('each award has non-empty title, description, and stat', () => {
		const awards = calculateAwards(FOUR_PLAYERS);
		for (const a of awards) {
			expect(a.title.length).toBeGreaterThan(0);
			expect(a.description.length).toBeGreaterThan(0);
			expect(a.stat.length).toBeGreaterThan(0);
		}
	});
});

// ── Edge case: tie for biggest-winner ────────────────────────────────────────
//
// Two players tied for most wins — both should receive the award.

describe('calculateAwards — tie for biggest-winner', () => {
	const TIED: AwardInput[] = [
		{
			name: 'Erik',
			net: 300,
			totalBuyIns: 200,
			finalStack: 500,
			buyInCount: 1,
			buyInAmount: 200,
			cashedOutAt: '2026-07-09T22:00:00Z',
			stackLow: 100,
		},
		{
			name: 'Fiona',
			net: 300,
			totalBuyIns: 200,
			finalStack: 500,
			buyInCount: 1,
			buyInAmount: 200,
			cashedOutAt: '2026-07-09T22:30:00Z',
			stackLow: 100,
		},
		{
			name: 'Gunnar',
			net: -600,
			totalBuyIns: 600,
			finalStack: 0,
			buyInCount: 3,
			buyInAmount: 200,
			cashedOutAt: '2026-07-09T21:00:00Z',
			stackLow: 0,
		},
	];

	it('awards biggest-winner to both tied players', () => {
		const awards = calculateAwards(TIED);
		const winners = awards.filter((a) => a.id === 'biggest-winner');
		const names = winners.map((a) => a.recipientName).sort();
		expect(names).toEqual(['Erik', 'Fiona']);
	});
});
