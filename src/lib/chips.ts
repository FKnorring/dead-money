export interface SessionConfig {
	buyInKr: number;
}

/** 1 BB = buyInKr / 100 */
function bbSizeKr(config: SessionConfig): number {
	return config.buyInKr / 100;
}

/** Convert a kr amount to BBs for display. */
export function krToBb(kr: number, config: SessionConfig): number {
	return kr / bbSizeKr(config);
}

/** Convert a BB amount to kr. */
export function bbToKr(bb: number, config: SessionConfig): number {
	return bb * bbSizeKr(config);
}
