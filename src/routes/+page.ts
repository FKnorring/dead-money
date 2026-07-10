import { redirect } from '@sveltejs/kit';
import { supabase } from '$lib';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// If any lobby or active session exists, redirect straight to it
	const { data: active } = await supabase
		.from('sessions')
		.select('id')
		.in('state', ['lobby', 'active'])
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (active) {
		redirect(307, `/session/${active.id}`);
	}

	// Otherwise load recent closed sessions for the history list
	const { data: recentSessions } = await supabase
		.from('sessions')
		.select('id, label, created_at, buy_in_amount, bb_size, state')
		.eq('state', 'closed')
		.order('created_at', { ascending: false })
		.limit(10);

	return { recentSessions: recentSessions ?? [] };
};
