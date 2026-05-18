/**
 * Server-side auth helpers — Better Auth + Neon.
 *
 * Replaces the old Supabase patterns:
 *   - `supabase.auth.getUser()`   →  `getCurrentUser()`
 *   - `requireAdmin()` (legacy)   →  `requireAdmin()` (same name, new impl)
 *   - `checkAdmin()`              →  `checkAdmin()`
 *
 * Profile-derived data (is_pro, is_admin, theme, etc.) is fetched from the
 * `profiles` table joined on user.id.
 */
import 'server-only'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from './server'
import { sql } from '../db/sql'

export type BetterAuthUser = {
  id: string
  email: string
  name: string
  image: string | null
  emailVerified: boolean
}

export type UserWithProfile = BetterAuthUser & {
  isPro: boolean
  isAdmin: boolean
}

/**
 * Get the currently logged-in user from the session cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser(): Promise<BetterAuthUser | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return (session?.user as BetterAuthUser) ?? null
}

/**
 * Get the current user + their profile flags (is_pro, is_admin).
 * Returns null if not authenticated.
 */
export async function getCurrentUserWithProfile(): Promise<UserWithProfile | null> {
  const user = await getCurrentUser()
  if (!user) return null

  try {
    const rows = (await sql`
      SELECT is_pro, is_admin FROM "profiles" WHERE id = ${user.id} LIMIT 1
    `) as Array<{ is_pro: boolean | null; is_admin: boolean | null }>

    const profile = rows[0]
    return {
      ...user,
      isPro: profile?.is_pro === true,
      isAdmin: profile?.is_admin === true,
    }
  } catch {
    return { ...user, isPro: false, isAdmin: false }
  }
}

/**
 * Require admin to access this server component.
 * Redirects to / if not admin.
 * Returns the user object if admin.
 */
export async function requireAdmin(): Promise<UserWithProfile> {
  const userWithProfile = await getCurrentUserWithProfile()
  if (!userWithProfile) redirect('/')
  if (!userWithProfile.isAdmin) redirect('/')
  return userWithProfile
}

/**
 * Non-blocking admin check (no redirect).
 * Returns { user, isAdmin } — useful for conditional rendering.
 */
export async function checkAdmin(): Promise<{
  user: BetterAuthUser | null
  isAdmin: boolean
}> {
  const userWithProfile = await getCurrentUserWithProfile()
  if (!userWithProfile) return { user: null, isAdmin: false }
  return {
    user: {
      id: userWithProfile.id,
      email: userWithProfile.email,
      name: userWithProfile.name,
      image: userWithProfile.image,
      emailVerified: userWithProfile.emailVerified,
    },
    isAdmin: userWithProfile.isAdmin,
  }
}

/**
 * Helper for API routes: returns userId or throws 401.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser()
  if (!user) throw new Error('UNAUTHORIZED')
  return user.id
}
