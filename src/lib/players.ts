import { supabase } from './supabaseClient';
import type { Tables } from './database.types';

export type Player = Tables<'players'>;

/**
 * Search the global player registry by name (case-insensitive prefix match).
 * Returns up to 10 results.
 */
export async function searchPlayers(query: string): Promise<Player[]> {
	if (!query.trim()) return [];

	const { data, error } = await supabase
		.from('players')
		.select()
		.ilike('name', `%${query}%`)
		.order('name')
		.limit(10);

	if (error) throw error;
	return data ?? [];
}

/**
 * Find an existing player by exact name (case-insensitive), or create a new one.
 */
export async function findOrCreatePlayer(name: string): Promise<Player> {
	const trimmed = name.trim();

	// Try exact match first
	const { data: existing } = await supabase
		.from('players')
		.select()
		.ilike('name', trimmed)
		.limit(1)
		.single();

	if (existing) return existing;

	// Create new player
	const { data: created, error } = await supabase
		.from('players')
		.insert({ name: trimmed })
		.select()
		.single();

	if (error) throw error;
	return created;
}

/**
 * Update a player's Swish number (for receiving payments on the settlement screen).
 */
export async function updatePlayerSwish(playerId: string, swishNumber: string): Promise<void> {
	const { error } = await supabase
		.from('players')
		.update({ swish_number: swishNumber })
		.eq('id', playerId);

	if (error) throw error;
}
