import { describe, it, expect } from 'vitest';
import { buildSwishLink } from './session';

describe('buildSwishLink', () => {
	it('builds a Swish deep-link with the correct format', () => {
		const link = buildSwishLink({
			swishNumber: '0701234567',
			amount: 350,
			date: '2026-07-09',
		});

		expect(link).toBe('swish://payment?payee=0701234567&amount=350&message=Poker+2026-07-09');
	});

	it('handles a single-digit amount', () => {
		const link = buildSwishLink({
			swishNumber: '123456789',
			amount: 5,
			date: '2026-01-01',
		});

		expect(link).toBe('swish://payment?payee=123456789&amount=5&message=Poker+2026-01-01');
	});

	it('includes the exact swish number without modification', () => {
		const link = buildSwishLink({
			swishNumber: '46701234567',
			amount: 100,
			date: '2026-12-31',
		});

		expect(link).toContain('payee=46701234567');
	});
});
