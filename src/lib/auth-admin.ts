/**
 * Compat shim — admin helpers now live in @/lib/auth/helpers.
 * Re-exported here so existing imports keep working.
 */
export { requireAdmin, checkAdmin } from './auth/helpers'
