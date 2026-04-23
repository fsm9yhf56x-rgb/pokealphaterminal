/**
 * Browser-side Supabase client (cookie-based session, SSR-compatible).
 *
 * Historical API: exports `supabase` as a singleton so existing client
 * components can `import { supabase } from '@/lib/supabase'` unchanged.
 */
import { getBrowserSupabase } from './supabase-browser';

export const supabase = getBrowserSupabase();
