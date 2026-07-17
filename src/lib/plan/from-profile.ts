import 'server-only'
import { resolvePlan, type PlanResult } from './resolve'
import { betaActive, BETA_ENDS_AT } from '../beta'

/**
 * Le SEUL mapping ligne-profil -> PlanInput.
 *
 * Deux lecteurs passent par ici : getCurrentUserWithProfile (verrous serveur)
 * et /api/profile (ce que voit le client). La regle du plan n'existe qu'une
 * fois, dans resolve.ts, et sa lecture qu'une fois, ici.
 *
 * Chaque SELECT appelant doit ramener ces colonnes + greffer :
 *   LEFT JOIN beta_invites bi ON bi.email = lower(${user.email})
 * (l'email est dans la session Better Auth, aucun JOIN sur "user" requis)
 */
export interface PlanRow {
  plan?: string | null
  is_pro?: boolean | null
  premium_until?: string | Date | null
  beta_tier?: string | null
}

export function planFromRow(row: PlanRow | null | undefined, now?: number): PlanResult {
  return resolvePlan({
    // `||` et NON `??` : reproduit a l'identique le fallback legacy is_pro,
    // qui doit s'appliquer aussi quand plan vaut '' (chaine vide), pas
    // seulement null. Passer a `??` reclasserait silencieusement des comptes.
    stripePlan: row?.plan || (row?.is_pro ? 'pro' : 'free'),
    premiumUntil: row?.premium_until ?? null,
    betaTier: row?.beta_tier ?? null,
    betaActive: betaActive(now),
    betaEndsAt: BETA_ENDS_AT,
    now,
  })
}
