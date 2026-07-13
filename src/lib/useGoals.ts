'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { GoalTarget, WishlistItem } from './goals/types'

// Ré-export pour compat : d'autres modules importent ces types depuis '@/lib/useGoals'.
export type { GoalMetric, GoalTarget, WishlistItem } from './goals/types'

const LS_TARGETS  = 'pka_goal_targets'
const LS_WISHLIST = 'pka_goal_wishlist'

function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function writeLS<T>(key: string, items: T[]) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch {}
}

/** Fetch JSON avec cookies de session (same-origin) + erreurs typées (status + payload). */
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    ...init,
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) {
    const err: any = new Error((json && json.error) || 'request_failed')
    err.status = res.status
    err.payload = json
    throw err
  }
  return json as T
}

export function useGoals() {
  const { user, loading: authLoading } = useAuth()

  const [targets, setTargets]   = useState<GoalTarget[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [usingBDD, setUsingBDD] = useState(false)

  /* ── Load ──────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return
    loadGoals()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  async function loadGoals() {
    setLoading(true)

    // Invité : localStorage uniquement
    if (!user) {
      setTargets(readLS<GoalTarget>(LS_TARGETS))
      setWishlist(readLS<WishlistItem>(LS_WISHLIST))
      setUsingBDD(false)
      setLoading(false)
      return
    }

    // Connecté : source de vérité = API v1 (Neon côté serveur)
    try {
      const data = await api<{ targets: GoalTarget[]; wishlist: WishlistItem[] }>('/api/v1/goals')
      setTargets(data.targets || [])
      setWishlist(data.wishlist || [])
      setUsingBDD(true)
    } catch (e) {
      // API indisponible (réseau / 5xx) → repli localStorage, comme avant
      console.warn('Goals API unavailable, fallback to localStorage', e)
      setTargets(readLS<GoalTarget>(LS_TARGETS))
      setWishlist(readLS<WishlistItem>(LS_WISHLIST))
      setUsingBDD(false)
    }
    setLoading(false)
  }

  /* ── Targets CRUD ──────────────────────────── */
  const addTarget = useCallback(async (target: Omit<GoalTarget, 'id'>) => {
    if (user && usingBDD) {
      try {
        const created = await api<GoalTarget>('/api/v1/goals/targets', {
          method: 'POST',
          body: JSON.stringify(target),
        })
        setTargets(prev => [created, ...prev])
        return created
      } catch (e) {
        console.warn('addTarget failed, fallback localStorage', e)
      }
    }
    const newTarget: GoalTarget = {
      id: crypto.randomUUID(),
      ...target,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [newTarget, ...targets]
    setTargets(updated)
    writeLS(LS_TARGETS, updated)
    return newTarget
  }, [user?.id, usingBDD, targets])

  const deleteTarget = useCallback(async (id: string) => {
    if (user && usingBDD) {
      try { await api(`/api/v1/goals/targets?id=${encodeURIComponent(id)}`, { method: 'DELETE' }) }
      catch (e) { console.warn('deleteTarget failed', e) }
    }
    const updated = targets.filter(t => t.id !== id)
    setTargets(updated)
    writeLS(LS_TARGETS, updated)
  }, [user?.id, usingBDD, targets])

  const updateTarget = useCallback(async (
    id: string,
    patch: { target_value?: number; label?: string | null; deadline?: string | null },
  ) => {
    if (user && usingBDD) {
      setTargets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
      try {
        const updated = await api<GoalTarget>('/api/v1/goals/targets', {
          method: 'PATCH',
          body: JSON.stringify({ id, ...patch }),
        })
        setTargets(prev => prev.map(t => t.id === id ? updated : t))
      } catch (e) {
        console.warn('updateTarget failed', e)
      }
      return
    }
    setTargets(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t)
      writeLS(LS_TARGETS, next)
      return next
    })
  }, [user?.id, usingBDD])

  /* ── Wishlist CRUD ─────────────────────────── */
  const addWishItem = useCallback(async (item: Omit<WishlistItem, 'id'>) => {
    if (user && usingBDD) {
      try {
        const created = await api<WishlistItem>('/api/v1/goals/wishlist', {
          method: 'POST',
          body: JSON.stringify(item),
        })
        setWishlist(prev => [created, ...prev])
        return created
      } catch (e: any) {
        // Verrou serveur (plan Gratuit, 3 max) : renvoyer la sentinelle, NE PAS écrire en local
        // (sinon l'item apparaît puis disparaît au refresh).
        if (e?.status === 403 && e?.payload?.error === 'wishlist_limit') {
          return { error: 'wishlist_limit' as const }
        }
        console.warn('addWishItem failed, fallback localStorage', e)
      }
    }
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [newItem, ...wishlist]
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
    return newItem
  }, [user?.id, usingBDD, wishlist])

  const deleteWishItem = useCallback(async (id: string) => {
    if (user && usingBDD) {
      try { await api(`/api/v1/goals/wishlist?id=${encodeURIComponent(id)}`, { method: 'DELETE' }) }
      catch (e) { console.warn('deleteWishItem failed', e) }
    }
    const updated = wishlist.filter(w => w.id !== id)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, usingBDD, wishlist])

  const markAcquired = useCallback(async (id: string) => {
    if (user && usingBDD) {
      try { await api('/api/v1/goals/wishlist', { method: 'PATCH', body: JSON.stringify({ id, acquired: true }) }) }
      catch (e) { console.warn('markAcquired failed', e) }
    }
    const updated = wishlist.map(w => w.id === id ? { ...w, acquired: true } : w)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, usingBDD, wishlist])

  const updateWishItem = useCallback(async (
    id: string,
    patch: { target_price?: number | null; priority?: 1 | 2 | 3; acquired?: boolean },
  ) => {
    if (user && usingBDD) {
      // Optimistic : refléter immédiatement
      setWishlist(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w))
      try {
        const updated = await api<WishlistItem>('/api/v1/goals/wishlist', {
          method: 'PATCH',
          body: JSON.stringify({ id, ...patch }),
        })
        setWishlist(prev => prev.map(w => w.id === id ? updated : w))
      } catch (e) {
        console.warn('updateWishItem failed', e)
      }
      return
    }
    // Invité / localStorage
    setWishlist(prev => {
      const next = prev.map(w => w.id === id ? { ...w, ...patch, updated_at: new Date().toISOString() } : w)
      writeLS(LS_WISHLIST, next)
      return next
    })
  }, [user?.id, usingBDD])

  return {
    targets, wishlist, loading,
    isCloud: usingBDD,
    addTarget, deleteTarget, updateTarget,
    addWishItem, deleteWishItem, markAcquired, updateWishItem,
  }
}
