'use client'

import { useAuth } from './useAuth'

export type Plan = 'free' | 'pro' | 'premium'

/**
 * Source de vérité côté client pour le forfait de l'utilisateur.
 *   - free    : portfolio + prix (max 500 cartes)
 *   - pro     : cartes illimitées + stats/P&L/export
 *   - premium : le total (Market, Alpha, Spreads, Whale, Dexy, PSA Pop)
 */
export function usePlan() {
  const auth = useAuth() as {
    plan?: Plan; isPro: boolean; isPremium?: boolean; loading: boolean
  }
  const resolved: Plan = auth.plan ?? (auth.isPro ? 'pro' : 'free')
  return {
    plan: resolved,
    isFree: resolved === 'free',
    isPro: resolved === 'pro' || resolved === 'premium',
    isPremium: resolved === 'premium',
    loading: auth.loading,
    upgradeTarget: resolved === 'free' ? 'pro' : resolved === 'pro' ? 'premium' : null,
  } as const
}
