/**
 * Test-only Supabase admin client.
 * Used exclusively for seeding and cleanup in e2e tests — never in app code.
 *
 * Uses the service_role key (server-side only) so RLS is bypassed for setup/teardown.
 * This file must never be imported from src/.
 */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/database.types';

const url = process.env.PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error('PUBLIC_SUPABASE_URL not set — check .env.test');
if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set — check .env.test');

export const adminDb = createClient<Database>(url, serviceKey, {
	auth: { persistSession: false },
});

/** Delete all rows created during a test run, in safe cascade order. */
export async function cleanupTestData(sessionIds: string[], playerIds: string[]) {
	if (sessionIds.length > 0) {
		// stack_events, buy_ins, and seats cascade from sessions — delete sessions first
		await adminDb.from('sessions').delete().in('id', sessionIds);
	}
	if (playerIds.length > 0) {
		await adminDb.from('players').delete().in('id', playerIds);
	}
}
