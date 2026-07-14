// Générateur de notifications in-app. Lancé par le cron (kodo-consolidate.yml)
// APRÈS le refresh prix nocturne. Script autonome (neon direct, pas d'import TS app).
//
// Architecture SCALABLE : un registre de générateurs. Ajouter un type de notif
// = ajouter une fonction dans `generators`. Chacun est isolé (try/catch), un
// générateur qui échoue ne casse pas les autres.
//
// Dédoublonnage : INSERT ... ON CONFLICT (user_id, dedup_key) DO NOTHING
// (index unique partiel). Ré-armement : quand la condition redevient fausse,
// on passe dedup_key -> NULL (la notif reste en historique, mais un nouveau
// franchissement de seuil re-déclenchera une notif fraîche).

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

// ─────────────────────────────────────────────────────────────
// Générateur : alerte prix wishlist (cote <= prix cible)
// Réutilise EXACTEMENT la règle de cote de src/lib/goals/service.ts (listGoals).
// ─────────────────────────────────────────────────────────────
async function wishlistPriceAlerts() {
  const rows = await sql`
    SELECT gw.user_id, gw.id AS wid, gw.card_name, gw.target_price,
           CASE
             WHEN ps.fair_value_method = 'insufficient_data' THEN NULL
             WHEN lower(gw.lang) = 'fr' THEN COALESCE(ps.cote_fr_eur, ps.fair_value_eur)
             ELSE ps.fair_value_eur
           END AS current_price
    FROM goal_wishlist gw
    LEFT JOIN k_cards kc
      ON gw.set_id IS NOT NULL AND gw.card_number IS NOT NULL
     AND kc.id = lower(gw.lang) || '-' || gw.set_id || '-' || gw.card_number
    LEFT JOIN price_signals ps
      ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE gw.acquired = false AND gw.target_price IS NOT NULL
  `

  let created = 0, rearmed = 0
  for (const r of rows) {
    const dedup = `wishlist_price:${r.wid}`
    const cur = r.current_price == null ? null : Number(r.current_price)
    const target = Number(r.target_price)
    const hit = cur != null && cur <= target

    if (hit) {
      const ins = await sql`
        INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
        VALUES (
          ${r.user_id},
          'wishlist_price',
          ${'Prix atteint : ' + r.card_name},
          ${r.card_name + ' est à ' + eur(cur) + ' — ta cible était ' + eur(target) + '.'},
          ${JSON.stringify({ wid: r.wid, card_name: r.card_name, current_price: cur, target_price: target, url: '/portfolio' })}::jsonb,
          ${dedup}
        )
        ON CONFLICT (user_id, dedup_key) DO NOTHING
        RETURNING id
      `
      if (ins.length) created++
    } else {
      // Ré-armement : on "consomme" la clé active (reste en historique, dedup_key -> NULL)
      const upd = await sql`
        UPDATE notifications SET dedup_key = NULL
        WHERE user_id = ${r.user_id} AND dedup_key = ${dedup}
        RETURNING id
      `
      if (upd.length) rearmed++
    }
  }
  return { created, rearmed, scanned: rows.length }
}

// ─────────────────────────────────────────────────────────────
// Générateur : objectif atteint (valeur courante >= cible)
// Agrégats calculés depuis portfolio_cards (meme source que l'affichage).
// ─────────────────────────────────────────────────────────────
const METRIC_LABEL = {
  portfolio_value: 'valeur de collection',
  cards_count: 'nombre de cartes',
  roi_pct: 'performance',
  graded_count: 'cartes gradées',
}

async function goalReached() {
  const aggs = await sql`
    SELECT user_id,
           COALESCE(SUM(current_price * qty), 0)              AS portfolio_value,
           COALESCE(SUM(qty), 0)                              AS cards_count,
           COALESCE(SUM(buy_price * qty), 0)                  AS total_buy,
           COALESCE(SUM(qty) FILTER (WHERE graded), 0)        AS graded_count
    FROM portfolio_cards
    GROUP BY user_id
  `
  const byUser = new Map()
  for (const a of aggs) {
    const value = Number(a.portfolio_value)
    const buy = Number(a.total_buy)
    byUser.set(a.user_id, {
      portfolio_value: value,
      cards_count: Number(a.cards_count),
      roi_pct: buy > 0 ? ((value - buy) / buy) * 100 : 0,
      graded_count: Number(a.graded_count),
    })
  }

  const targets = await sql`SELECT id, user_id, metric, target_value, label FROM goal_targets`
  let created = 0, rearmed = 0
  for (const t of targets) {
    const a = byUser.get(t.user_id)
    const cur = a ? a[t.metric] : undefined
    if (cur == null) continue
    const target = Number(t.target_value)
    const dedup = `goal_reached:${t.id}`
    const hit = cur >= target

    if (hit) {
      const label = t.label || METRIC_LABEL[t.metric] || 'ton objectif'
      const ins = await sql`
        INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
        VALUES (
          ${t.user_id},
          'goal_reached',
          'Objectif atteint',
          ${'Bravo, tu as atteint ton objectif : ' + label + '.'},
          ${JSON.stringify({ targetId: t.id, metric: t.metric, target, current: cur, url: '/portfolio' })}::jsonb,
          ${dedup}
        )
        ON CONFLICT (user_id, dedup_key) DO NOTHING
        RETURNING id
      `
      if (ins.length) created++
    } else {
      const upd = await sql`
        UPDATE notifications SET dedup_key = NULL
        WHERE user_id = ${t.user_id} AND dedup_key = ${dedup}
        RETURNING id
      `
      if (upd.length) rearmed++
    }
  }
  return { created, rearmed, targets: targets.length }
}

// Registre extensible. Prochains : goalReached, newSetRelease, referralRewarded...
const generators = [
  { name: 'wishlist_price', run: wishlistPriceAlerts },
  { name: 'goal_reached', run: goalReached },
]

async function main() {
  const results = {}
  for (const g of generators) {
    try {
      results[g.name] = await g.run()
    } catch (e) {
      results[g.name] = { error: String((e && e.message) || e) }
    }
  }
  console.log('Notifications:', JSON.stringify(results))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
