'use client'
/**
 * AuthProvider — charge la session + le profil UNE SEULE FOIS et les partage
 * a tous les consommateurs via Context. Remplace le fetch isole que chaque
 * useAuth faisait auparavant (=> re-fetch /api/profile a chaque navigation,
 * flash persona, compute Neon gaspille).
 *
 * useAuth() lit desormais ce context (voir useAuth.ts).
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authClient } from './client'
import type { Profile } from '../database.types'

export type AuthUser = {
  id: string
  email: string
  user_metadata?: { full_name?: string; avatar_url?: string }
  app_metadata?: Record<string, unknown>
}
export type AuthSession = {
  user: AuthUser
  access_token: string
  expires_at?: number
}

export type AuthContextValue = {
  user: AuthUser | null
  session: AuthSession | null
  profile: Profile | null
  loading: boolean
  profileReady: boolean
  refetchProfile: () => Promise<void>
  setProfileLocal: (updater: (prev: Profile | null) => Profile | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: rawSession, isPending } = authClient.useSession()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileReady, setProfileReady] = useState(false)

  const user: AuthUser | null = rawSession?.user
    ? {
        id: rawSession.user.id,
        email: rawSession.user.email,
        user_metadata: {
          full_name: rawSession.user.name,
          avatar_url: rawSession.user.image ?? undefined,
        },
      }
    : null

  const session: AuthSession | null = rawSession?.session && user
    ? {
        user,
        access_token: rawSession.session.token,
        expires_at: rawSession.session.expiresAt
          ? Math.floor(new Date(rawSession.session.expiresAt).getTime() / 1000)
          : undefined,
      }
    : null

  const fetchProfile = useCallback(async () => {
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
      setProfileReady(true)
    }
  }, [])

  // Charge le profil UNE fois par identite utilisateur (pas par navigation).
  const userId = user?.id ?? null
  useEffect(() => {
    if (userId) {
      fetchProfile()
    } else {
      setProfile(null)
      setProfileReady(true)
    }
  }, [userId, fetchProfile])

  const setProfileLocal = useCallback(
    (updater: (prev: Profile | null) => Profile | null) => setProfile(updater),
    [],
  )

  const value: AuthContextValue = {
    user,
    session,
    profile,
    loading: isPending || profileLoading,
    profileReady,
    refetchProfile: fetchProfile,
    setProfileLocal,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    // Fallback defensif : si un composant utilise useAuth hors provider,
    // on renvoie un etat vide "pret" plutot que de crasher.
    return {
      user: null,
      session: null,
      profile: null,
      loading: false,
      profileReady: true,
      refetchProfile: async () => {},
      setProfileLocal: () => {},
    }
  }
  return ctx
}
