export interface AwardInput {
	name: string;
	net: number;
	totalBuyIns: number;
	finalStack: number | null;
	buyInCount: number;
	/** The standard single buy-in amount (used as fallback comeback baseline). */
	buyInAmount: number;
	/** ISO timestamp of when this player cashed out (null if still active). */
	cashedOutAt: string | null;
	/**
	 * The lowest stack this player reached during the session, derived from
	 * stack_events snapshots. Used for biggest-comeback: swing = finalStack - stackLow.
	 * Null if no stack events exist yet (falls back to buyInAmount baseline).
	 */
	stackLow: number | null;
}

export interface Award {
	id: string;
	recipientName: string;
	title: string;
	description: string;
	stat: string;
}

// ── Copy pools (pick one variant per award per session) ───────────────────────
// Each pool has enough variety that repeated sessions feel fresh.

const COPY: Record<string, { title: string; descriptions: string[] }> = {
	'biggest-winner': {
		title: 'The Whale',
		descriptions: [
			"Beginner's luck or genuine skill? Either way, collect your chips.",
			'The fish were biting tonight and somehow you were holding the rod.',
			'Nutted every hand, apparently. Very humble. Very suspicious.',
			"You played J7 and it worked. We're all very proud.",
			'The table tilted so hard everything slid into your stack.',
		],
	},
	'biggest-loser': {
		title: 'The Philanthropist',
		descriptions: [
			'Your generosity kept the game alive. The table thanks you sincerely.',
			"You didn't lose money. You redistributed it. Very noble.",
			"Fish of the night. The kind that swims upstream into everyone else's net.",
			'Board coverage: you were in every pot that cost money. Respect.',
			'Your buy-ins were the only consistent thing about your session.',
		],
	},
	'break-even': {
		title: 'The Philosopher',
		descriptions: [
			'Congratulations on your net-zero. A masterpiece of pointlessness.',
			'You sat here for hours and ended up exactly where you started. Inspiring.',
			'Neither winner nor loser — you achieved perfect nothingness.',
			'The nit award. You played scared and it showed. Break-even is its own punishment.',
			'Spent all night grinding to zero. The journey was the destination, apparently.',
		],
	},
	'most-buyins': {
		title: 'The ATM',
		descriptions: [
			'Your dedication to losing money is unmatched. The table thanks you.',
			"Four buy-ins. Bold strategy. Let's see if it pays off — oh wait, it didn't.",
			"The fish swims back. And back. And back. We love you for it.",
			'You kept the game funded and the spirit alive. Mostly the former.',
			'Rebuy king. Every time you left the table, the chips came with you. Somehow not yours.',
		],
	},
	'last-stand': {
		title: 'The Final Table',
		descriptions: [
			"Last one standing. Whether that's heroic or just stubborn is unclear.",
			'You outlasted everyone. Unfortunately "outlasted" and "outplayed" are different words.',
			'Still at the table when the lights came on. Dedication or desperation — you decide.',
			"The last chip survived the longest. The player behind it? Jury's out.",
			"Refused to leave. The felt had to ask you to go. Respect.",
		],
	},
	'first-bust': {
		title: 'The Pioneer',
		descriptions: [
			'First to go. You led the charge into defeat so the rest of us could follow.',
			"Out before the first break. You played fast and loose and the cards said: noted.",
			"Blazed a trail. Straight into the rail. Classic.",
			'Speed-ran the session. Impressive efficiency. Wrong direction, but impressive.',
			"First bust of the night. The poker gods demanded a sacrifice — you volunteered.",
		],
	},
	'biggest-comeback': {
		title: 'The Comeback Kid',
		descriptions: [
			'Dug out of a hole and clawed back. Grudging respect. Extremely grudging.',
			"Down bad and came back swinging. The J7 would be proud.",
			'From short-stack to stack. Almost makes up for how you got there.',
			'The table wrote you off. You proved them right, then wrong, then right again.',
			'Nutted your way back from the felt. The arc of the moral universe bends toward variance.',
		],
	},
};

/**
 * Pick a description deterministically but variably per session.
 * Uses the sum of char codes in the recipient name as a stable seed.
 */
function pickDescription(awardId: string, recipientName: string): string {
	const pool = COPY[awardId]?.descriptions ?? ['Remarkable performance.'];
	const seed = recipientName.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
	return pool[seed % pool.length];
}

/**
 * Compute the set of awards for a completed session.
 * Pure function — no DB calls.
 *
 * Awards with ties produce multiple entries with the same `id`.
 */
export function calculateAwards(seats: AwardInput[]): Award[] {
	if (seats.length === 0) return [];

	const awards: Award[] = [];

	// ── Helper to emit one or more awards for a category ─────────────────────
	function emit(id: string, winners: AwardInput[], stat: (w: AwardInput) => string) {
		const copy = COPY[id];
		for (const w of winners) {
			awards.push({
				id,
				recipientName: w.name,
				title: copy?.title ?? id,
				description: pickDescription(id, w.name),
				stat: stat(w),
			});
		}
	}

	// ── biggest-winner: highest net ───────────────────────────────────────────
	const maxNet = Math.max(...seats.map((s) => s.net));
	const biggestWinners = seats.filter((s) => s.net === maxNet);
	emit('biggest-winner', biggestWinners, (w) => `+${w.net} kr`);

	// ── biggest-loser: lowest net ─────────────────────────────────────────────
	const minNet = Math.min(...seats.map((s) => s.net));
	const biggestLosers = seats.filter((s) => s.net === minNet);
	emit('biggest-loser', biggestLosers, (w) => `${w.net} kr`);

	// ── break-even: net closest to 0 ─────────────────────────────────────────
	const minAbsNet = Math.min(...seats.map((s) => Math.abs(s.net)));
	const breakEvens = seats.filter((s) => Math.abs(s.net) === minAbsNet);
	emit('break-even', breakEvens, (w) => `${w.net} kr`);

	// ── most-buyins: most buy-in events ──────────────────────────────────────
	const maxBuyIns = Math.max(...seats.map((s) => s.buyInCount));
	const mostBuyIns = seats.filter((s) => s.buyInCount === maxBuyIns);
	emit('most-buyins', mostBuyIns, (w) => `${w.buyInCount} buy-ins`);

	// ── last-stand: cashed out last (latest cashedOutAt) ─────────────────────
	const seatsWithCashOut = seats.filter((s) => s.cashedOutAt !== null);
	if (seatsWithCashOut.length > 0) {
		const latestTime = seatsWithCashOut
			.map((s) => s.cashedOutAt as string)
			.sort()
			.at(-1)!;
		const lastStands = seatsWithCashOut.filter((s) => s.cashedOutAt === latestTime);
		emit('last-stand', lastStands, (w) => {
			const sign = w.net >= 0 ? '+' : '';
			return `${sign}${w.net} kr`;
		});
	} else {
		// No cashout timestamps — fall back to the last-seated player
		emit('last-stand', [seats[seats.length - 1]], (w) => {
			const sign = w.net >= 0 ? '+' : '';
			return `${sign}${w.net} kr`;
		});
	}

	// ── first-bust: first to cash out with negative net ──────────────────────
	const bustedSeats = seatsWithCashOut.filter((s) => s.net < 0);
	if (bustedSeats.length > 0) {
		const earliestBustTime = bustedSeats
			.map((s) => s.cashedOutAt as string)
			.sort()[0];
		const firstBusts = bustedSeats.filter((s) => s.cashedOutAt === earliestBustTime);
		emit('first-bust', firstBusts, (w) => `${w.net} kr`);
	} else {
		// Nobody busted — award goes to the biggest loser as a consolation
		emit('first-bust', biggestLosers, (w) => `${w.net} kr`);
	}

	// ── biggest-comeback: biggest positive swing from stack low ──────────────
	// Swing = finalStack - stackLow (or buyInAmount as fallback baseline).
	// A positive swing means the player dug out of a hole.
	const swings = seats.map((s) => {
		const baseline = s.stackLow ?? s.buyInAmount;
		return { seat: s, swing: (s.finalStack ?? 0) - baseline };
	});
	const maxSwing = Math.max(...swings.map((x) => x.swing));
	const comebackWinners = swings
		.filter((x) => x.swing === maxSwing)
		.map((x) => x.seat);
	emit('biggest-comeback', comebackWinners, (w) => {
		const baseline = w.stackLow ?? w.buyInAmount;
		const swing = (w.finalStack ?? 0) - baseline;
		const sign = swing >= 0 ? '+' : '';
		return `${sign}${swing} kr`;
	});

	return awards;
}
