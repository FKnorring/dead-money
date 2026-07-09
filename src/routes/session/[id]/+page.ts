import { error } from '@sveltejs/kit';
import { supabase } from '$lib';
import { loadSeats } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
	const { data: session } = await supabase
		.from('sessions')
		.select('*')
		.eq('id', params.id)
		.single();

	if (!session) error(404, 'Session not found');

	const seats = await loadSeats(params.id);

	return { session, seats };
};
