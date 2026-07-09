import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import type { Database } from './database.types';

/**
 * The single Supabase client for dead-money.
 * Typed against the Database schema — regenerate types with `npm run db:types`
 * after any schema change.
 *
 * No auth is used. The anon key is the only credential — see ADR-0001 and ADR-0002.
 */
export const supabase = createClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

// Convenience type aliases derived from the generated schema
export type { Database };
