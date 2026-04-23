'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './db/schema';

/**
 * Browser-side Supabase client. Stores session in HTTP cookies
 * (not localStorage) so that SSR can read it.
 *
 * Only use this in client components ('use client').
 */
export function getBrowserSupabase() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
