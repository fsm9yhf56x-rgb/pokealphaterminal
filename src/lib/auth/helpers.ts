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
 *
 * PLAN : la derivation locale a ete retiree au profit de planFromRow ->
 * resolvePlan (src/lib/plan/). Une seule regle, un seul endroit, serveur ET
 * client. requirePlan() lit toujours `user.plan` : il n'a pas bouge et n'a
 * pas besoin de savoir que la beta existe.
 */
import 'server-only'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { auth } from './server'
import { sql } from '../db/sql'
import { planFromRow } from '../plan/from-profile'
import type { PlanSource } from '../plan/resolve'

export type BetterAuthUser = {
  id: string
  email: string
  name: string
  image: string | null
  emailVerified: boolean
}

export type UserWithProfile = BetterAuthUser & {
  isPro: boolean
  isPremium: boolean
  isEarlySupporter: boolean
  earlyRank: number | null
  plan: 'free' | 'pro' | 'premium'
  /** D'ou vient le plan effectif : 'stripe' | 'referral' | 'beta' | 'free'. */
  planSource: PlanSource
  /** Non-null uniquement si planSource === 'beta'. */
  betaUntil: string | null
  /** Le plan reellement PAYE. Peut etre < plan pendant la beta. */
  paidPlan: 'free' | 'pro' | 'premium'
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
    // BETA : le LEFT JOIN n'ajoute AUCUN aller-retour vers Neon, et l'email
    // vient de la session (aucun JOIN sur "user"). Retirer ces 2 lignes suffit
    // a demanteler la beta cote lecture (cf. beta.ts, etape 4).
    const rows = (await sql`
      SELECT p.is_pro, p.is_admin, p.plan, p.is_early_supporter, p.early_rank, p.premium_until,
             bi.tier AS beta_tier
      FROM "profiles" p
      LEFT JOIN beta_invites bi ON bi.email = lower(${user.email})
      WHERE p.id = ${user.id}
      LIMIT 1
    `) as Array<{
      is_pro: boolean | null
      is_admin: boolean | null
      plan: string | null
      is_early_supporter: boolean | null
      early_rank: number | null
      premium_until: string | null
      beta_tier: string | null
    }>

    const profile = rows[0]
    const resolved = planFromRow(profile)

    return {
      ...user,
      plan: resolved.plan,
      planSource: resolved.source,
      betaUntil: resolved.betaUntil,
      paidPlan: resolved.paidPlan,
      isPro: resolved.plan === 'pro' || resolved.plan === 'premium',
      isPremium: resolved.plan === 'premium',
      isEarlySupporter: !!profile?.is_early_supporter,
      earlyRank: profile?.early_rank ?? null,
      isAdmin: profile?.is_admin === true,
    }
  } catch (e) {
    // Ce catch degrade en 'free' — y compris un abonne payant si Neon hoquette
    // ou si beta_invites a ete droppee avant le retrait du JOIN. Il etait muet :
    // il loggue desormais, sinon la panne est invisible dans les logs Vercel.
    console.error('[getCurrentUserWithProfile] fallback free —', e)
    return {
      ...user,
      plan: 'free' as const,
      planSource: 'free' as const,
      betaUntil: null,
      paidPlan: 'free' as const,
      isPro: false,
      isPremium: false,
      isEarlySupporter: false,
      earlyRank: null,
      isAdmin: false,
    }
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
