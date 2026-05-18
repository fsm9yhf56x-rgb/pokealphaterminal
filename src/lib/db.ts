/**
 * Data clients for the app — backed by Neon (migration 11/05/26).
 *
 * - `getAnonClient()`  — for client-side. Auth is now Better Auth, not Supabase.
 * - `getAdminClient()` — for server-side. Same Neon client (RLS is app-level).
 *
 * The returned object exposes a Supabase-compatible API (`.from().select()...`)
 * so existing code doesn't need refactor. Under the hood it queries Neon.
 *
 * See: src/lib/db/supabase-compat.ts for the compatibility layer.
 */
import { db } from './db/supabase-compat';
import type { Database } from './db/schema';
import type { SupabaseClient } from '@supabase/supabase-js';

// We keep the TypedClient type for backwards compat with existing imports.
// Cast is safe because `db` exposes the same subset of Supabase API that
// the app actually uses (verified: .from().select/insert/update/delete/upsert,
// .eq/.in/.gt/etc, .single/.maybeSingle, .order/.limit/.range, .rpc).
export type TypedClient = SupabaseClient<Database>;

/**
 * Anonymous-equivalent client. Same Neon backend as admin.
 * Authorization is now enforced at the application layer (middleware + queries),
 * not via Postgres RLS bound to Supabase Auth.
 */
export function getAnonClient(): TypedClient {
  return db as unknown as TypedClient;
}

/**
 * Admin-equivalent client. Same Neon backend as anon.
 * The distinction is preserved only to avoid breaking existing imports.
 * Server-only code should still be guarded by auth checks in middleware.
 */
export function getAdminClient(): TypedClient {
  return db as unknown as TypedClient;
}
