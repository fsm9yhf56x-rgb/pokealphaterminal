/**
 * Better Auth — React client.
 * Use this in 'use client' components: hooks, sign-in/out, etc.
 *
 * baseURL is omitted: Better Auth will use the current browser origin
 * (window.location.origin), which works for localhost, Vercel previews,
 * and production without any env var changes.
 */
'use client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()

// Re-export common hooks/methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
