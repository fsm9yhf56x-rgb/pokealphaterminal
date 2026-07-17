'use client'

import { useAuth } from './useAuth'

export type Plan = 'free' | 'pro' | 'premium'
export type PlanSource = 'free' | 'stripe' | 'referral' | 'beta'

/**
 * Source de vérité côté client pour le forfait de l'utilisateur.
 *   - free    : portfolio + prix (max 500 cartes)
 *   - pro     : cartes illimitées + stats/P&L/export
 *   - premium : le total (Market, Alpha, Spreads, Whale, Nori, PSA Pop)
 *
 * `plan` = l'ACCES effectif (c'est lui que lisent les gates).
 * `paidPlan` = ce que l'utilisateur PAIE — peut etre inferieur a `plan`
 * pendant la beta (Premium prete). L'UI d'abonnement doit afficher paidPlan,
 * les gates doivent lire plan. Les confondre = soit un badge mensonger, soit
 * un testeur gate a tort.
 */
export function usePlan() {
  const auth = useAuth() as {
    plan?: Plan; isPro: boolean; isPremium?: boolean; loading: boolean
    planSource?: PlanSource; betaUntil?: string | null; paidPlan?: Plan
  }
  const resolved: Plan = auth.plan ?? (auth.isPro ? 'pro' : 'free')
  return {
    plan: resolved,
    isFree: resolved === 'free',
    isPro: resolved === 'pro' || resolved === 'premium',
    isPremium: resolved === 'premium',
    loading: auth.loading,
    upgradeTarget: resolved === 'free' ? 'pro' : resolved === 'pro' ? 'premium' : null,
    /** 'beta' => acces prete, badge « jusqu'au X » requis (Lot 3). */
    planSource: (auth.planSource ?? 'free') as PlanSource,
    /** Non-null uniquement si planSource === 'beta'. */
    betaUntil: auth.betaUntil ?? null,
    /** Le plan PAYE. Pour la page /abonnement et le badge, jamais pour les gates. */
    paidPlan: (auth.paidPlan ?? 'free') as Plan,
  } as const
}
