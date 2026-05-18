'use client'
/**
 * useIsAdmin hook — fetches /api/profile to determine admin status.
 * Returns:
 *   - null   → loading
 *   - true   → logged in AND is_admin = true
 *   - false  → not logged in OR not admin
 */
import { useEffect, useState } from 'react'
import { authClient } from './auth/client'

export function useIsAdmin(): boolean | null {
  const { data: rawSession, isPending } = authClient.useSession()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (isPending) {
      setIsAdmin(null)
      return
    }
    if (!rawSession?.user?.id) {
      setIsAdmin(false)
      return
    }

    let mounted = true
    fetch('/api/profile', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!mounted) return
        setIsAdmin(data?.profile?.is_admin === true)
      })
      .catch(() => {
        if (mounted) setIsAdmin(false)
      })

    return () => {
      mounted = false
    }
  }, [rawSession?.user?.id, isPending])

  return isAdmin
}
