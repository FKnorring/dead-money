import { loadLeaderboardData } from '$lib';
import { buildLeaderboard } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	const rows = await loadLeaderboardData();
	const entries = buildLeaderboard(rows);
	return { entries };
};
