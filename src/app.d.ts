import type { SupabaseClient, User } from '@supabase/supabase-js';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ user: User | null }>;
		}
		interface PageData {
			user: User | null;
		}
	}
}

export {};