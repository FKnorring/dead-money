import { describe, it, expect } from 'vitest';
import { calculateNet } from './net';

describe('calculateNet', () => {
	it('returns final stack minus total buy-ins', () => {
		// Bought in 200kr, cashed out with 450kr — won 250kr
		expect(calculateNet({ totalBuyIns: 200, finalStack: 450 })).toBe(250);
	});

	it('returns a negative value when player lost', () => {
		// Bought in 400kr (two buy-ins), left with 150kr — lost 250kr
		expect(calculateNet({ totalBuyIns: 400, finalStack: 150 })).toBe(-250);
	});

	it('returns zero for a break-even player', () => {
		expect(calculateNet({ totalBuyIns: 200, finalStack: 200 })).toBe(0);
	});

	it('uses zero as final stack when player has no stack recorded', () => {
		// Player busted completely and never updated their stack
		expect(calculateNet({ totalBuyIns: 200, finalStack: null })).toBe(-200);
	});
});
