'use client'
/**
 * useAuth hook — Better Auth backend (migration 11/05/26).
 *
 * Public API preserved 1:1 with the previous Supabase-based hook:
 *   user, profile, session, loading
 *   signUp, signIn, signInWithGoogle, signOut, updateProfile
 *   isPro, logout (alias for signOut)
 *
 * Implementation:
 *  - authClient.useSession() from Better Auth → user + session
 *  - fetch /api/profile to load business profile (is_pro, full_name, etc.)
 *  - signIn/signUp/signOut call Better Auth client methods
 *
 * The `User` and `Session` types are shimmed to match Supabase's shape
 * so consuming code doesn't need to change.
 */
import { useEffect, useState, useCallback } from 'react'
import { authClient } from './auth/client'
import type { Profile } from './database.types'

// Shim types that mimic Supabase's User/Session shape (used in consumer types)
type User = {
  id: string
  email: string
  user_metadata?: { full_name?: string; avatar_url?: string }
  app_metadata?: Record<string, unknown>
}
type Session = {
  user: User
  access_token: string
  expires_at?: number
}

export function useAuth() {
  // Better Auth's session hook (auto-refreshes on auth change)
  const { data: rawSession, isPending } = authClient.useSession()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)

  // Map Better Auth → Supabase-shaped user
  const user: User | null = rawSession?.user
    ? {
        id: rawSession.user.id,
        email: rawSession.user.email,
        user_metadata: {
          full_name: rawSession.user.name,
          avatar_url: rawSession.user.image ?? undefined,
        },
      }
    : null

  const session: Session | null = rawSession?.session && user
    ? {
        user,
        access_token: rawSession.session.token,
        expires_at: rawSession.session.expiresAt
          ? Math.floor(new Date(rawSession.session.expiresAt).getTime() / 1000)
          : undefined,
      }
    : null

  // Fetch profile from /api/profile when user changes
  const fetchProfile = useCallback(async (userId: string) => {
    setProfileLoading(true)
    try {
      const res = await fetch('/api/profile', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile ?? null)
      } else {
        setProfile(null)
      }
    } catch {
      setProfile(null)
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id) fetchProfile(user.id)
    else setProfile(null)
  }, [user?.id, fetchProfile])

  // ── Auth methods ──
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
    setProfile(null)
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user) return { error: 'Not logged in' }
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      })
      if (!res.ok) return { error: `Failed: ${res.statusText}` }
      if (user.id) await fetchProfile(user.id)
      return { error: null }
    } catch (e: any) {
      return { error: e.message ?? 'Update failed' }
    }
  }

  const loading = isPending || profileLoading
  const plan: 'free' | 'pro' | 'premium' =
    (profile?.plan as 'free' | 'pro' | 'premium') ?? (profile?.is_pro ? 'pro' : 'free')
  const isPro = plan === 'pro' || plan === 'premium'
  const isPremium = plan === 'premium'

  return {
    user,
    profile,
    session,
    loading,
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
