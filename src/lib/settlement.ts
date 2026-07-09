export interface SeatResult {
	playerId: string;
	net: number;
}

export interface Transfer {
	from: string;
	to: string;
	amount: number;
	swishLink?: string;
}

export function calculateSettlement(seats: SeatResult[]): Transfer[] {
	const transfers: Transfer[] = [];

	const debtors = seats
		.filter((s) => s.net < 0)
		.map((s) => ({ playerId: s.playerId, amount: -s.net }))
		.sort((a, b) => b.amount - a.amount);

	const creditors = seats
		.filter((s) => s.net > 0)
		.map((s) => ({ playerId: s.playerId, amount: s.net }))
		.sort((a, b) => b.amount - a.amount);

	let d = 0;
	let c = 0;

	while (d < debtors.length && c < creditors.length) {
		const debtor = debtors[d];
		const creditor = creditors[c];
		const amount = Math.min(debtor.amount, creditor.amount);

		transfers.push({ from: debtor.playerId, to: creditor.playerId, amount });

		debtor.amount -= amount;
		creditor.amount -= amount;

		if (debtor.amount === 0) d++;
		if (creditor.amount === 0) c++;
	}

	return transfers;
}
