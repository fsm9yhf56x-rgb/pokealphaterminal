/**
 * Suppression de compte (RGPD art. 17 — droit à l'effacement).
 *
 * Ordre : Stripe (couper la facturation) -> données métier -> identité.
 * Chaque étape est isolée : une table qui échoue ne bloque pas les autres.
 *
 * analytics_events est ANONYMISÉ (user_id/anon_id/session_id -> NULL) et non
 * supprimé : une fois non rattachables, ces données sortent du champ du RGPD
 * et la mesure d'audience agrégée reste juste (pratique recommandée CNIL).
 *
 * Hors périmètre volontaire :
 *  - Factures Stripe : conservation légale comptable (obligation, base légale
 *    distincte du compte).
 *  - waitlist_jp : traitement séparé fondé sur le consentement (désinscription
 *    par sa propre voie), un compte supprimé n'annule pas ce consentement.
 */
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { sql } from '@/lib/db/sql'
import { headers } from 'next/headers'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'SUPPRIMER') {
    return NextResponse.json({ error: 'Confirmation manquante' }, { status: 400 })
  }

  const failures: string[] = []

  // ── 1) Stripe : couper la facturation AVANT de perdre le lien (profiles).
  try {
    const rows = await sql.query('SELECT stripe_customer_id FROM profiles WHERE id = $1', [userId])
    const customerId = rows?.[0]?.stripe_customer_id
    if (customerId) {
      const stripe = getStripe()
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 20 })
      for (const s of subs.data) {
        try {
          await stripe.subscriptions.cancel(s.id)
        } catch (e: any) {
          console.error('[account/delete] annulation sub échouée', s.id, e?.message)
          failures.push('stripe:' + s.id)
        }
      }
    }
  } catch (e: any) {
    console.error('[account/delete] stripe:', e?.message)
    failures.push('stripe')
  }

  // ── 2) Données métier + identité. Ordre : enfants -> parents.
  const attempts: Array<[string, () => Promise<unknown>]> = [
    // Anonymisation (pas de suppression) : voir en-tête.
    ['analytics_events', () => sql.query(
      'UPDATE analytics_events SET user_id = NULL, anon_id = NULL, session_id = NULL WHERE user_id = $1',
      [userId],
    )],
    ['portfolio_cards',            () => sql.query('DELETE FROM portfolio_cards WHERE user_id = $1', [userId])],
    ['portfolio_value_snapshots',  () => sql.query('DELETE FROM portfolio_value_snapshots WHERE user_id = $1', [userId])],
    ['goal_targets',               () => sql.query('DELETE FROM goal_targets WHERE user_id = $1', [userId])],
    ['goal_wishlist',              () => sql.query('DELETE FROM goal_wishlist WHERE user_id = $1', [userId])],
    ['wishlist',                   () => sql.query('DELETE FROM wishlist WHERE user_id = $1', [userId])],
    ['saved_searches',             () => sql.query('DELETE FROM saved_searches WHERE user_id = $1', [userId])],
    ['badges',                     () => sql.query('DELETE FROM badges WHERE user_id = $1', [userId])],
    ['user_streaks',               () => sql.query('DELETE FROM user_streaks WHERE user_id = $1', [userId])],
    ['notifications',              () => sql.query('DELETE FROM notifications WHERE user_id = $1', [userId])],
    ['referral_codes',             () => sql.query('DELETE FROM referral_codes WHERE user_id = $1', [userId])],
    // Parrainage : les deux côtés du lien.
    ['referrals',                  () => sql.query('DELETE FROM referrals WHERE referrer_id = $1 OR referred_id = $1', [userId])],
    // Identité (Better Auth) en dernier.
    ['session',                    () => sql.query('DELETE FROM "session" WHERE "userId" = $1', [userId])],
    ['account',                    () => sql.query('DELETE FROM "account" WHERE "userId" = $1', [userId])],
    ['profiles',                   () => sql.query('DELETE FROM "profiles" WHERE id = $1', [userId])],
    ['user',                       () => sql.query('DELETE FROM "user" WHERE id = $1', [userId])],
  ]

  for (const [name, fn] of attempts) {
    try {
      await fn()
    } catch (e: any) {
      console.error(`[account/delete] ${name} failed:`, e?.message)
      failures.push(name)
    }
  }

  // Si la ligne user elle-même n'est pas partie, c'est un échec.
  if (failures.includes('user')) {
    return NextResponse.json(
      { error: 'Suppression incomplète', failures },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, warnings: failures })
}
