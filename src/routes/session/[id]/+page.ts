import { error, redirect } from '@sveltejs/kit';
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

	if (session.state === 'closed') redirect(302, `/session/${params.id}/end`);
	// Active sessions: do NOT redirect here — identity lives in localStorage (client-only).
	// The lobby component redirects to /play once it knows the player has joined.

	const seats = await loadSeats(params.id);

	return { session, seats };
};
