import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './db/schema';

/**
 * Supabase client for Server Components / Route Handlers.
 * Reads the session from HTTP-only cookies.
 *
 * Usage in a Server Component:
 *   import { getServerSupabase } from '@/lib/supabase-server'
 *   const supabase = getServerSupabase()
 *   const { data: { user } } = await supabase.auth.getUser()
 */
export function getServerSupabase() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Called from a Server Component — cookies are read-only there.
            // Middleware handles the set. Ignoring is safe.
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Same as above
          }
        },
      },
    }
  );
}
