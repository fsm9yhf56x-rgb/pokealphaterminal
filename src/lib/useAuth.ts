'use client'
/**
 * useAuth — lecteur du AuthContext (le fetch profil vit dans AuthProvider).
 * API publique inchangee 1:1 : user, profile, session, loading, profileReady,
 * signUp, signIn, signInWithGoogle, signOut, updateProfile, isPro, isPremium, plan, logout.
 * + planSource, betaUntil, paidPlan (nouveaux, additifs).
 *
 * PLAN : la derivation locale (rawPlan + premium_until) a ete RETIREE.
 * /api/profile renvoie desormais plan / planSource / betaUntil / paidPlan deja
 * resolus par le serveur (resolvePlan). Une seule regle, un seul endroit.
 * Le client ne fait plus que lire — il ne peut plus se desaligner du serveur,
 * et il n'a pas besoin de savoir que la beta existe.
 */
import { authClient } from './auth/client'
import { useAuthContext } from './auth/AuthProvider'
import type { Profile } from './database.types'

type Plan = 'free' | 'pro' | 'premium'
type PlanSource = 'free' | 'stripe' | 'referral' | 'beta'

export function useAuth() {
  const { user, session, profile, loading, profileReady, refetchProfile, setProfileLocal } =
    useAuthContext()

  async function signUp(email: string, password: string, displayName?: string) {
    const name = displayName || email.split('@')[0]
    const { data, error } = await authClient.signUp.email({ email, password, name })
    return { data, error: error ? { message: error.message ?? 'Sign up failed' } : null }
  }

  async function signIn(email: string, password: string) {
    const { data, error } = await authClient.signIn.email({ email, password })
    return { data, error: error ? { message: error.message ?? 'Sign in failed' } : null }
  }

  async function signInWithGoogle() {
    try {
      const { data, error } = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/home',
      })
      return { data, error: error ? { message: error.message ?? 'Google sign in failed' } : null }
    } catch (e: any) {
      return { data: null, error: { message: e.message ?? 'Google sign in failed' } }
    }
  }

  async function signOut() {
    await authClient.signOut()
    setProfileLocal(() => null)
  }

  /**
   * Patch profile : update optimiste local (instantane via le context partage),
   * PATCH avec timeout 8s, reconciliation en arriere-plan (jamais await par l appelant).
   */
  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: 'Not logged in' }

    setProfileLocal((prev) => (prev ? ({ ...prev, ...updates } as Profile) : prev))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        return { error: `Failed (${res.status}): ${detail || res.statusText}` }
      }
      void refetchProfile()
      return { error: null }
    } catch (e: any) {
      clearTimeout(timeout)
      if (e?.name === 'AbortError') return { error: 'Timeout: le serveur na pas repondu' }
      return { error: e?.message ?? 'Update failed' }
    }
  }

  // Lecture seule de ce que le serveur a resolu. Le fallback legacy is_pro vit
  // desormais serveur (planFromRow). Profil absent = 'free' : si /api/profile
  // tombe, on n'invente pas un plan — meme regle que les objectifs.
  const p = profile as unknown as
    | { plan?: Plan; planSource?: PlanSource; betaUntil?: string | null; paidPlan?: Plan }
    | null
    | undefined

  const plan: Plan = p?.plan ?? 'free'
  const planSource: PlanSource = p?.planSource ?? 'free'
  /** Non-null uniquement si planSource === 'beta'. Pour le badge honnete. */
  const betaUntil: string | null = p?.betaUntil ?? null
  /** Ce qu'il A PAYE. Peut etre < plan pendant la beta (Pro paye + Premium
   *  prete). Afficher paidPlan comme « ton abonnement », plan comme « ton
   *  acces » — sinon il decouvre son vrai plan le jour du BETA_MODE=off. */
  const paidPlan: Plan = p?.paidPlan ?? 'free'
  const isPro = plan === 'pro' || plan === 'premium'
  const isPremium = plan === 'premium'

  return {
    user,
    profile,
    session,
    loading,
    profileReady,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile,
    isPro,
    isPremium,
    plan,
    planSource,
    betaUntil,
    paidPlan,
    logout: signOut,
  }
}
