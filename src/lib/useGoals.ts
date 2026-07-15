'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import type { GoalTarget, WishlistItem } from './goals/types'
import { track } from '@/components/layout/Analytics'

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

/** Purge le stock invité : une fois connecté, la base est la seule source de vérité. */
function clearLS() {
  try {
    localStorage.removeItem(LS_TARGETS)
    localStorage.removeItem(LS_WISHLIST)
  } catch {}
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

/**
 * Migration invité -> compte.
 * Pousse en base les items du localStorage ABSENTS du cloud (dédup par id : les
 * doublons legacy, créés quand le client générait l'uuid, portent le même id
 * qu'en base -> ignorés), puis purge le localStorage dans tous les cas.
 * Les items refusés par le verrou Gratuit (3 max) sont perdus : c'est la règle
 * du plan, pas un bug. Retourne true si au moins un item a été créé.
 */
async function migrateLocalGoals(cloudTargets: GoalTarget[], cloudWishlist: WishlistItem[]): Promise<boolean> {
  const lsT = readLS<GoalTarget>(LS_TARGETS)
  const lsW = readLS<WishlistItem>(LS_WISHLIST)
  if (!lsT.length && !lsW.length) return false

  const cloudTIds = new Set(cloudTargets.map(t => t.id))
  const cloudWIds = new Set(cloudWishlist.map(w => w.id))
  let pushed = 0

  // Chronologique : le verrou Gratuit garde alors les plus anciens.
  const byDate = (a: { created_at?: string }, b: { created_at?: string }) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))

  for (const t of [...lsT].sort(byDate)) {
    if (cloudTIds.has(t.id)) continue
    try {
      await api<GoalTarget>('/api/v1/goals/targets', {
        method: 'POST',
        body: JSON.stringify({
          metric: t.metric,
          target_value: t.target_value,
          unit: t.unit ?? null,
          label: t.label ?? null,
          deadline: t.deadline ?? null,
        }),
      })
      pushed++
    } catch (e) {
      console.warn('[goals migrate] objectif ignoré', e)
    }
  }

  for (const w of [...lsW].sort(byDate)) {
    if (cloudWIds.has(w.id)) continue
    try {
      const created = await api<WishlistItem>('/api/v1/goals/wishlist', {
        method: 'POST',
        body: JSON.stringify({
          card_name: w.card_name,
          set_id: w.set_id ?? null,
          set_name: w.set_name ?? null,
          card_number: w.card_number ?? null,
          lang: w.lang,
          rarity: w.rarity ?? null,
          priority: w.priority,
          target_price: w.target_price ?? null,
          notes: w.notes ?? null,
        }),
      })
      pushed++
      // Le POST crée toujours acquired=false : on reporte l'état si besoin.
      if (w.acquired && created?.id) {
        try {
          await api('/api/v1/goals/wishlist', {
            method: 'PATCH',
            body: JSON.stringify({ id: created.id, acquired: true }),
          })
        } catch { /* non bloquant */ }
      }
    } catch (e) {
      console.warn('[goals migrate] carte ignorée (verrou Gratuit 3 max ?)', e)
    }
  }

  clearLS()
  return pushed > 0
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

    // Connecté : la base est la SEULE source de vérité.
    setUsingBDD(true)
    try {
      let data = await api<{ targets: GoalTarget[]; wishlist: WishlistItem[] }>('/api/v1/goals')
      const pushed = await migrateLocalGoals(data.targets || [], data.wishlist || [])
      if (pushed) data = await api<{ targets: GoalTarget[]; wishlist: WishlistItem[] }>('/api/v1/goals')
      setTargets(data.targets || [])
      setWishlist(data.wishlist || [])
    } catch (e) {
      // AUCUN repli localStorage ici : afficher des items supprimés en base
      // (fantômes) serait un mensonge. Mieux vaut vide et honnête.
      console.error('[goals] API indisponible', e)
      setTargets([])
      setWishlist([])
    }
    setLoading(false)
  }

  /* ── Targets CRUD ──────────────────────────── */
  const addTarget = useCallback(async (target: Omit<GoalTarget, 'id'>) => {
    track('goal_created', { metric: target.metric })

    if (user) {
      try {
        const created = await api<GoalTarget>('/api/v1/goals/targets', {
          method: 'POST',
          body: JSON.stringify(target),
        })
        setTargets(prev => [created, ...prev])
        return created
      } catch (e) {
        // Connecté : jamais de repli localStorage (l'item ne serait nulle part
        // en base et reviendrait en fantôme à chaque chargement).
        console.error('addTarget failed', e)
        return null
      }
    }

    // Invité
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
  }, [user?.id, targets])

  const deleteTarget = useCallback(async (id: string) => {
    if (user) {
      setTargets(prev => prev.filter(t => t.id !== id))
      try { await api(`/api/v1/goals/targets?id=${encodeURIComponent(id)}`, { method: 'DELETE' }) }
      catch (e) { console.error('deleteTarget failed', e) }
      return
    }
    const updated = targets.filter(t => t.id !== id)
    setTargets(updated)
    writeLS(LS_TARGETS, updated)
  }, [user?.id, targets])

  const updateTarget = useCallback(async (
    id: string,
    patch: { target_value?: number; label?: string | null; deadline?: string | null },
  ) => {
    if (user) {
      setTargets(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
      try {
        const updated = await api<GoalTarget>('/api/v1/goals/targets', {
          method: 'PATCH',
          body: JSON.stringify({ id, ...patch }),
        })
        setTargets(prev => prev.map(t => t.id === id ? updated : t))
      } catch (e) {
        console.error('updateTarget failed', e)
      }
      return
    }
    setTargets(prev => {
      const next = prev.map(t => t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t)
      writeLS(LS_TARGETS, next)
      return next
    })
  }, [user?.id])

  /* ── Wishlist CRUD ─────────────────────────── */
  const addWishItem = useCallback(async (item: Omit<WishlistItem, 'id'>) => {
    if (user) {
      try {
        const created = await api<WishlistItem>('/api/v1/goals/wishlist', {
          method: 'POST',
          body: JSON.stringify(item),
        })
        setWishlist(prev => [created, ...prev])
        track('wishlist_add', { lang: item.lang, set_id: item.set_id })
        return created
      } catch (e: any) {
        // Verrou serveur (plan Gratuit, 3 max) : sentinelle, NE PAS écrire en local.
        if (e?.status === 403 && e?.payload?.error === 'wishlist_limit') {
          return { error: 'wishlist_limit' as const }
        }
        console.error('addWishItem failed', e)
        return null
      }
    }

    // Invité
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const updated = [newItem, ...wishlist]
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
    track('wishlist_add', { lang: item.lang, set_id: item.set_id })
    return newItem
  }, [user?.id, wishlist])

  const deleteWishItem = useCallback(async (id: string) => {
    if (user) {
      setWishlist(prev => prev.filter(w => w.id !== id))
      try { await api(`/api/v1/goals/wishlist?id=${encodeURIComponent(id)}`, { method: 'DELETE' }) }
      catch (e) { console.error('deleteWishItem failed', e) }
      return
    }
    const updated = wishlist.filter(w => w.id !== id)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, wishlist])

  const markAcquired = useCallback(async (id: string) => {
    if (user) {
      setWishlist(prev => prev.map(w => w.id === id ? { ...w, acquired: true } : w))
      try { await api('/api/v1/goals/wishlist', { method: 'PATCH', body: JSON.stringify({ id, acquired: true }) }) }
      catch (e) { console.error('markAcquired failed', e) }
      return
    }
    const updated = wishlist.map(w => w.id === id ? { ...w, acquired: true } : w)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, wishlist])

  const updateWishItem = useCallback(async (
    id: string,
    patch: { target_price?: number | null; priority?: 1 | 2 | 3; acquired?: boolean },
  ) => {
    if (user) {
      // Optimistic : refléter immédiatement
      setWishlist(prev => prev.map(w => w.id === id ? { ...w, ...patch } : w))
      try {
        const updated = await api<WishlistItem>('/api/v1/goals/wishlist', {
          method: 'PATCH',
          body: JSON.stringify({ id, ...patch }),
        })
        setWishlist(prev => prev.map(w => w.id === id ? updated : w))
      } catch (e) {
        console.error('updateWishItem failed', e)
      }
      return
    }
    // Invité / localStorage
    setWishlist(prev => {
      const next = prev.map(w => w.id === id ? { ...w, ...patch, updated_at: new Date().toISOString() } : w)
      writeLS(LS_WISHLIST, next)
      return next
    })
  }, [user?.id])

  return {
    targets, wishlist, loading,
    isCloud: usingBDD,
    addTarget, deleteTarget, updateTarget,
    addWishItem, deleteWishItem, markAcquired, updateWishItem,
  }
}
