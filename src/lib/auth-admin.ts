import { redirect } from 'next/navigation';
import { getServerSupabase } from './supabase-server';

/**
 * Server-side admin guard. Call this at the top of any Server Component
 * that should only be accessible to admins.
 *
 * - If not logged in → redirect to /login
 * - If logged in but not admin → redirect to /
 * - If admin → returns the user object
 *
 * Usage:
 *   export default async function AdminPage() {
 *     const user = await requireAdmin()
 *     // ... render admin UI
 *   }
 */
export async function requireAdmin() {
  const supabase = getServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (error || !profile?.is_admin) {
    redirect('/');
  }

  return user;
}

/**
 * Non-blocking check: returns { user, isAdmin } without redirecting.
 * Useful for conditional rendering (e.g. showing an "Admin" link in nav).
 */
export async function checkAdmin(): Promise<{
  user: Awaited<ReturnType<ReturnType<typeof getServerSupabase>['auth']['getUser']>>['data']['user'];
  isAdmin: boolean;
}> {
  const supabase = getServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return { user, isAdmin: profile?.is_admin === true };
}
