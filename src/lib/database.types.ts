/**
 * Supabase database types for dead-money.
 *
 * This file is auto-generated — do not edit by hand.
 * Regenerate after schema changes with:
 *   npm run db:types
 *
 * Until you run that command against a live project, this stub
 * provides the shape so the app compiles.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			players: {
				Row: {
					id: string;
					name: string;
					swish_number: string | null;
					created_at: string;
				};
				Insert: {
					id?: string;
					name: string;
					swish_number?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					name?: string;
					swish_number?: string | null;
					created_at?: string;
				};
			};
			sessions: {
				Row: {
					id: string;
					state: 'lobby' | 'active' | 'closed';
					buy_in_amount: number;
					bb_size: number;
					label: string | null;
					location: string | null;
					host_player_id: string;
					created_at: string;
					started_at: string | null;
					closed_at: string | null;
				};
				Insert: {
					id?: string;
					state?: 'lobby' | 'active' | 'closed';
					buy_in_amount: number;
					bb_size: number;
					label?: string | null;
					location?: string | null;
					host_player_id: string;
					created_at?: string;
					started_at?: string | null;
					closed_at?: string | null;
				};
				Update: {
					id?: string;
					state?: 'lobby' | 'active' | 'closed';
					buy_in_amount?: number;
					bb_size?: number;
					label?: string | null;
					location?: string | null;
					host_player_id?: string;
					created_at?: string;
					started_at?: string | null;
					closed_at?: string | null;
				};
			};
			seats: {
				Row: {
					id: string;
					session_id: string;
					player_id: string;
					claimed: boolean;
					stack: number | null;
					cashed_out: boolean;
					final_stack: number | null;
					joined_at: string;
					cashed_out_at: string | null;
				};
				Insert: {
					id?: string;
					session_id: string;
					player_id: string;
					claimed?: boolean;
					stack?: number | null;
					cashed_out?: boolean;
					final_stack?: number | null;
					joined_at?: string;
					cashed_out_at?: string | null;
				};
				Update: {
					id?: string;
					session_id?: string;
					player_id?: string;
					claimed?: boolean;
					stack?: number | null;
					cashed_out?: boolean;
					final_stack?: number | null;
					joined_at?: string;
					cashed_out_at?: string | null;
				};
			};
			buy_ins: {
				Row: {
					id: string;
					seat_id: string;
					session_id: string;
					player_id: string;
					amount: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					seat_id: string;
					session_id: string;
					player_id: string;
					amount: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					seat_id?: string;
					session_id?: string;
					player_id?: string;
					amount?: number;
					created_at?: string;
				};
			};
			stack_events: {
				Row: {
					id: string;
					seat_id: string;
					session_id: string;
					player_id: string;
					type: 'snapshot' | 'cash_out';
					amount: number;
					created_at: string;
				};
				Insert: {
					id?: string;
					seat_id: string;
					session_id: string;
					player_id: string;
					type: 'snapshot' | 'cash_out';
					amount: number;
					created_at?: string;
				};
				Update: {
					id?: string;
					seat_id?: string;
					session_id?: string;
					player_id?: string;
					type?: 'snapshot' | 'cash_out';
					amount?: number;
					created_at?: string;
				};
			};
		};
		Views: Record<string, never>;
		Functions: Record<string, never>;
		Enums: {
			session_state: 'lobby' | 'active' | 'closed';
			stack_event_type: 'snapshot' | 'cash_out';
		};
	};
};

// Convenience type helpers
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];

export type Enums<T extends keyof Database['public']['Enums']> =
	Database['public']['Enums'][T];
