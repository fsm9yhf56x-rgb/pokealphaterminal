/**
 * Typed Supabase clients for the app.
 *
 * - `getAnonClient()`  — for client-side/front (respects RLS). Safe to expose.
 * - `getAdminClient()` — for server-side routes & scripts. Bypasses RLS.
 *
 * Both are lazy-initialized to avoid build-time crashes when env vars are
 * missing (e.g. during Vercel's page-data collection). See also
 * `export const dynamic = 'force-dynamic'` on API routes that use admin client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './db/schema';

export type TypedClient = SupabaseClient<Database>;

// ── Lazy singletons (per-module, not per-request) ──
let _anon: TypedClient | null = null;
let _admin: TypedClient | null = null;

/**
 * Anonymous client, safe for browsers. Uses NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Respects Row Level Security policies.
 */
export function getAnonClient(): TypedClient {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  _anon = createClient<Database>(url, key);
  return _anon;
}

/**
 * Admin client with service_role key — FOR SERVER-SIDE ONLY.
 * Never expose this to browsers (it bypasses RLS).
 * Safe to call at import-time; real client is built on first use.
 */
export function getAdminClient(): TypedClient {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }
  _admin = createClient<Database>(url, key);
  return _admin;
}
