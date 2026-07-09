import { error } from '@sveltejs/kit';
import { loadSession, loadSeats, loadBuyInTotals } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const session = await loadSession(params.id);

	if (!session) error(404, 'Session not found');

	const [seats, buyInTotals] = await Promise.all([
		loadSeats(params.id),
		loadBuyInTotals(params.id),
	]);

	return { session, seats, buyInTotals };
};
