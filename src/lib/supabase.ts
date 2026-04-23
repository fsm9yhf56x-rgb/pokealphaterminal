/**
 * @deprecated Use `getAnonClient()` from './db' instead for typed access.
 * Kept for backward compatibility with existing imports.
 */
import { getAnonClient } from './db';

export const supabase = getAnonClient();
