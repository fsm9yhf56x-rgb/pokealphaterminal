/**
 * Compat shim — `supabase` is now backed by Neon (migration 11/05/26).
 *
 * Historical client components import this as:
 *   `import { supabase } from '@/lib/supabase'`
 * and call `.from(...).select(...)` etc.
 *
 * That API is preserved by the `db` object from supabase-compat.
 *
 * Auth methods (supabase.auth.*) are NOT supported here — those must use
 * Better Auth client (`authClient`) or the server helpers in `@/lib/auth/*`.
 */
import { db } from './db/supabase-compat'

// Re-export under the historical name so existing imports work unchanged
export const supabase = db
