'use client'
/**
 * useAuth — lecteur du AuthContext (le fetch profil vit dans AuthProvider).
 * API publique inchangee 1:1 : user, profile, session, loading, profileReady,
 * signUp, signIn, signInWithGoogle, signOut, updateProfile, isPro, isPremium, plan, logout.
 */
import { authClient } from './auth/client'
import { useAuthContext } from './auth/AuthProvider'
import type { Profile } from './database.types'

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

  const _rawPlan: 'free' | 'pro' | 'premium' =
    (profile?.plan as 'free' | 'pro' | 'premium') ?? (profile?.is_pro ? 'pro' : 'free')
  const _pu = (profile as any)?.premium_until ? new Date((profile as any).premium_until as string) : null
  const plan: 'free' | 'pro' | 'premium' = (_pu && _pu.getTime() > Date.now()) ? 'premium' : _rawPlan
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
    logout: signOut,
  }
}
