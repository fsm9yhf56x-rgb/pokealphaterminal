'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/**
 * Returns whether the currently logged-in user is an admin.
 * - null   → still loading (first mount)
 * - true   → logged in AND is_admin=true
 * - false  → not logged in OR not admin
 */
export function useIsAdmin(): boolean | null {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      if (mounted) setIsAdmin(data?.is_admin === true);
    }

    check();

    // Also re-check on auth state change (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
