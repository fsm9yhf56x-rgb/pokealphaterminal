import { sql } from '@/lib/db/sql'

/**
 * Récompense de parrainage.
 * Déclenchée quand le FILLEUL prend un abonnement ANNUEL : +1 mois Premium
 * offert au parrain ET au filleul (extension de profiles.premium_until de 30 jours).
 *
 * Sécurité / idempotence :
 *  - "claim" atomique : l'UPDATE de la ligne referrals (status <> 'rewarded')
 *    ne réussit que pour UN seul appel concurrent -> impossible de verser deux fois.
 *  - Si aucune attribution ou déjà récompensée -> no-op.
 *  - premium_until empilé proprement via GREATEST(premium_until, now()) + 30j.
 */
export async function rewardReferralOnAnnual(referredUserId: string): Promise<boolean> {
  if (!referredUserId) return false

  // Claim atomique : un seul appel gagne la récompense.
  const claimed = (await sql`
    UPDATE referrals
       SET status = 'rewarded',
           qualified_at = COALESCE(qualified_at, now()),
           rewarded_at = now()
     WHERE referred_id = ${referredUserId}
       AND status <> 'rewarded'
     RETURNING referrer_id, referred_id
  `) as Array<{ referrer_id: string; referred_id: string }>

  if (!claimed[0]) return false
  const { referrer_id, referred_id } = claimed[0]

  // +30 jours de Premium aux deux comptes.
  await sql`
    UPDATE profiles
       SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + interval '30 days',
           updated_at = now()
     WHERE id = ${referrer_id}
  `
  await sql`
    UPDATE profiles
       SET premium_until = GREATEST(COALESCE(premium_until, now()), now()) + interval '30 days',
           updated_at = now()
     WHERE id = ${referred_id}
  `
  return true
}
