import { error } from '@sveltejs/kit';
import { loadSession, loadSeats, loadBuyInTotals, loadBuyInCounts, loadStackLows, loadSessionTimelines } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const session = await loadSession(params.id);

	if (!session) error(404, 'Session not found');

	const [seats, buyInTotals, buyInCounts, stackLows, stackTimelines] = await Promise.all([
		loadSeats(params.id),
		loadBuyInTotals(params.id),
		loadBuyInCounts(params.id),
		loadStackLows(params.id),
		loadSessionTimelines(params.id),
	]);

	return { session, seats, buyInTotals, buyInCounts, stackLows, stackTimelines };
};
