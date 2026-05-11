/**
 * Better Auth — React client.
 * Use this in 'use client' components: hooks, sign-in/out, etc.
 */
'use client'
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
})

// Re-export common hooks/methods for convenience
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient
