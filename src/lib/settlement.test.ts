import { describe, it, expect } from 'vitest';
import { calculateSettlement } from './settlement';

describe('calculateSettlement', () => {
	it('produces one transfer between two players', () => {
		// Erik lost 200kr, Anna won 200kr — Erik owes Anna
		const result = calculateSettlement([
			{ playerId: 'erik', net: -200 },
			{ playerId: 'anna', net: 200 }
		]);

		expect(result).toEqual([{ from: 'erik', to: 'anna', amount: 200 }]);
	});

	it('splits one debtor across two creditors', () => {
		// Erik lost 200kr, Anna and Bo each won 100kr
		const result = calculateSettlement([
			{ playerId: 'erik', net: -200 },
			{ playerId: 'anna', net: 100 },
			{ playerId: 'bo', net: 100 }
		]);

		expect(result).toEqual([
			{ from: 'erik', to: 'anna', amount: 100 },
			{ from: 'erik', to: 'bo', amount: 100 }
		]);
	});

	it('uses the fewest transfers for multiple debtors and creditors', () => {
		// Erik -300, Anna -100 / Bo +200, Chloe +200
		// Naive: 4 transfers. Minimized: 3.
		const result = calculateSettlement([
			{ playerId: 'erik', net: -300 },
			{ playerId: 'anna', net: -100 },
			{ playerId: 'bo', net: 200 },
			{ playerId: 'chloe', net: 200 }
		]);

		expect(result).toEqual([
			{ from: 'erik', to: 'bo', amount: 200 },
			{ from: 'erik', to: 'chloe', amount: 100 },
			{ from: 'anna', to: 'chloe', amount: 100 }
		]);
	});

	it('ignores break-even players', () => {
		// Bo is exactly break-even — should produce no transfer involving Bo
		const result = calculateSettlement([
			{ playerId: 'erik', net: -200 },
			{ playerId: 'anna', net: 200 },
			{ playerId: 'bo', net: 0 }
		]);

		expect(result).toEqual([{ from: 'erik', to: 'anna', amount: 200 }]);
	});

	it('returns empty list when all players break even', () => {
		const result = calculateSettlement([
			{ playerId: 'erik', net: 0 },
			{ playerId: 'anna', net: 0 }
		]);

		expect(result).toEqual([]);
	});
});
