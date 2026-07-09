export interface NetInput {
	totalBuyIns: number;
	finalStack: number | null;
}

/**
 * Net result for a Seat: final stack minus total buy-ins.
 * A null finalStack means the player busted and never updated — treated as 0.
 */
export function calculateNet({ totalBuyIns, finalStack }: NetInput): number {
	return (finalStack ?? 0) - totalBuyIns;
}
