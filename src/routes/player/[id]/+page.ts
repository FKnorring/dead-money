import { error } from '@sveltejs/kit';
import { loadPlayerHistory } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const { player, sessions } = await loadPlayerHistory(params.id);

	if (!player) {
		error(404, 'Player not found');
	}

	return { player, sessions };
};
