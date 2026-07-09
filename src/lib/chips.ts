import type { Session } from './session';

/** 1 BB = buy_in_amount / 100 kr */
export function bbSizeKr(session: Pick<Session, 'buy_in_amount'>): number {
	return session.buy_in_amount / 100;
}

/** Convert a kr amount to BBs for display. */
export function krToBb(kr: number, session: Pick<Session, 'buy_in_amount'>): number {
	return kr / bbSizeKr(session);
}

/** Convert a BB amount to kr. */
export function bbToKr(bb: number, session: Pick<Session, 'buy_in_amount'>): number {
	return bb * bbSizeKr(session);
}

/**
 * Format a kr amount for display, respecting the active display unit.
 * Returns e.g. "480 kr" or "2.4 BB".
 */
export function formatAmount(
	kr: number,
	displayUnit: 'kr' | 'bb',
	session: Pick<Session, 'buy_in_amount'>
): string {
	if (displayUnit === 'bb') {
		const bb = krToBb(kr, session);
		return `${bb % 1 === 0 ? bb.toFixed(0) : bb.toFixed(1)} BB`;
	}
	return `${kr} kr`;
}

/** CSS class for a net value. */
export function netClass(net: number): string {
	return net > 0 ? 'net-positive' : net < 0 ? 'net-negative' : 'net-zero';
}

/** Sign prefix for a net value ('+' or ''). */
export function netSign(net: number): string {
	return net > 0 ? '+' : '';
}

/**
 * Format a net value for display, e.g. "+450 kr" or "-200 kr".
 * Uses tabular sign prefix so positive and negative values align.
 */
export function formatNet(net: number): string {
	return `${netSign(net)}${Math.abs(net)} kr`;
}

/** Format a win-rate fraction as a percentage string, e.g. "67%". */
export function formatPercent(rate: number): string {
	return `${Math.round(rate * 100)}%`;
}
