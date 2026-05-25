/**
 * Better Auth catch-all route + rate limiting (Lot G v0.9).
 *
 * - GET : session lookup, pas de rate limit (lecture only)
 * - POST : tous les endpoints auth (login, signup, reset, etc.)
 *          → check rate limit avant de déléguer à Better Auth
 */

import { auth } from '@/lib/auth/server'
import { toNextJsHandler } from 'better-auth/next-js'
import { checkAuthRateLimit } from '@/lib/rate-limit'

const { GET, POST: betterAuthPost } = toNextJsHandler(auth.handler)

export { GET }

export async function POST(req: Request) {
  // Rate limit check (Lot G v0.9)
  const blocked = await checkAuthRateLimit(req)
  if (blocked) return blocked

  // OK, déléguer à Better Auth
  return betterAuthPost(req)
}
