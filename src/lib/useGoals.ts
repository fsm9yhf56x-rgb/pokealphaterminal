'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import { useAuth } from './useAuth'

const LS_TARGETS  = 'pka_goal_targets'
const LS_WISHLIST = 'pka_goal_wishlist'

export type GoalMetric = 'portfolio_value' | 'cards_count' | 'roi_pct' | 'graded_count'

export interface GoalTarget {
  id: string
  metric: GoalMetric
  target_value: number
  unit?: string | null
  label?: string | null
  deadline?: string | null
  created_at?: string
  updated_at?: string
}

export interface WishlistItem {
  id: string
  card_name: string
  set_id?: string | null
  set_name?: string | null
  card_number?: string | null
  lang?: string | null
  rarity?: string | null
  priority: 1 | 2 | 3
  target_price?: number | null
  notes?: string | null
  acquired?: boolean
  created_at?: string
  updated_at?: string
}

function readLS<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function writeLS<T>(key: string, items: T[]) {
  try { localStorage.setItem(key, JSON.stringify(items)) } catch {}
}

export function useGoals() {
  const { user, loading: authLoading } = useAuth()

  const [targets, setTargets]     = useState<GoalTarget[]>([])
  const [wishlist, setWishlist]   = useState<WishlistItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [usingBDD, setUsingBDD]   = useState(false)

  /* ── Load ──────────────────────────────────── */
  useEffect(() => {
    if (authLoading) return
    loadGoals()
  }, [user?.id, authLoading])

  async function loadGoals() {
    setLoading(true)

    // No user: localStorage only
    if (!user) {
      setTargets(readLS<GoalTarget>(LS_TARGETS))
      setWishlist(readLS<WishlistItem>(LS_WISHLIST))
      setUsingBDD(false)
      setLoading(false)
      return
    }

    // Try BDD first
    const [tRes, wRes] = await Promise.all([
      (supabase as any).from('goal_targets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      (supabase as any).from('goal_wishlist').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ])

    if (tRes.error || wRes.error) {
      // BDD unavailable (table missing or 402) → fallback localStorage
      console.warn('Goals BDD unavailable, fallback to localStorage', tRes.error || wRes.error)
      setTargets(readLS<GoalTarget>(LS_TARGETS))
      setWishlist(readLS<WishlistItem>(LS_WISHLIST))
      setUsingBDD(false)
    } else {
      setTargets((tRes.data || []) as GoalTarget[])
      setWishlist((wRes.data || []) as WishlistItem[])
      setUsingBDD(true)
    }
    setLoading(false)
  }

  /* ── Targets CRUD ──────────────────────────── */
  const addTarget = useCallback(async (target: Omit<GoalTarget, 'id'>) => {
    const newTarget: GoalTarget = {
      id: crypto.randomUUID(),
      ...target,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (user && usingBDD) {
      const { data, error } = await (supabase as any)
        .from('goal_targets')
        .insert({ user_id: user.id, ...target })
        .select()
        .single()
      if (!error && data) {
        setTargets(prev => [data as GoalTarget, ...prev])
        return data as GoalTarget
      }
    }
    // Fallback LS
    const updated = [newTarget, ...targets]
    setTargets(updated)
    writeLS(LS_TARGETS, updated)
    return newTarget
  }, [user?.id, usingBDD, targets])

  const deleteTarget = useCallback(async (id: string) => {
    if (user && usingBDD) {
      await (supabase as any).from('goal_targets').delete().eq('id', id)
    }
    const updated = targets.filter(t => t.id !== id)
    setTargets(updated)
    writeLS(LS_TARGETS, updated)
  }, [user?.id, usingBDD, targets])

  /* ── Wishlist CRUD ─────────────────────────── */
  const addWishItem = useCallback(async (item: Omit<WishlistItem, 'id'>) => {
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      ...item,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    if (user && usingBDD) {
      const { data, error } = await (supabase as any)
        .from('goal_wishlist')
        .insert({ user_id: user.id, ...item })
        .select()
        .single()
      if (!error && data) {
        setWishlist(prev => [data as WishlistItem, ...prev])
        return data as WishlistItem
      }
      // Verrou serveur (plan Gratuit, 3 max) : ne PAS fallback en localStorage,
      // sinon l'item apparait localement puis disparait au refresh.
      if (error && (error.code === 'wishlist_limit' || error.message === 'wishlist_limit')) {
        return { error: 'wishlist_limit' as const }
      }
    }
    const updated = [newItem, ...wishlist]
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
    return newItem
  }, [user?.id, usingBDD, wishlist])

  const deleteWishItem = useCallback(async (id: string) => {
    if (user && usingBDD) {
      await (supabase as any).from('goal_wishlist').delete().eq('id', id)
    }
    const updated = wishlist.filter(w => w.id !== id)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, usingBDD, wishlist])

  const markAcquired = useCallback(async (id: string) => {
    if (user && usingBDD) {
      await (supabase as any).from('goal_wishlist').update({ acquired: true }).eq('id', id)
    }
    const updated = wishlist.map(w => w.id === id ? { ...w, acquired: true } : w)
    setWishlist(updated)
    writeLS(LS_WISHLIST, updated)
  }, [user?.id, usingBDD, wishlist])

  return {
    targets, wishlist, loading,
    isCloud: usingBDD,
    addTarget, deleteTarget,
    addWishItem, deleteWishItem, markAcquired,
  }
}
