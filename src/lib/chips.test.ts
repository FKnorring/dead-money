import { describe, it, expect } from 'vitest';
import { krToBb, bbToKr } from './chips';

// Session default: 200kr buy-in = 100BB → 1BB = 2kr

describe('krToBb', () => {
	it('converts kr to BB using the session buy-in', () => {
		expect(krToBb(200, { buy_in_amount: 200 })).toBe(100);
	});

	it('converts a partial amount', () => {
		expect(krToBb(50, { buy_in_amount: 200 })).toBe(25);
	});

	it('handles negative values (losses)', () => {
		expect(krToBb(-200, { buy_in_amount: 200 })).toBe(-100);
	});
});

describe('bbToKr', () => {
	it('converts BB to kr using the session buy-in', () => {
		expect(bbToKr(100, { buy_in_amount: 200 })).toBe(200);
	});

	it('converts a partial amount', () => {
		expect(bbToKr(25, { buy_in_amount: 200 })).toBe(50);
	});
});
