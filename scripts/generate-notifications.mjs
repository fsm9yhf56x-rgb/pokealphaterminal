// Générateur de notifications in-app. Lancé par le cron (kodo-consolidate.yml)
// APRÈS le refresh prix nocturne. Script autonome (neon direct, pas d'import TS app).
//
// Architecture SCALABLE : registre de générateurs. Ajouter un type = ajouter une
// fonction dans `generators`. Chacun isolé (try/catch).
//
// Dédoublonnage : INSERT ... ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS
// NOT NULL DO NOTHING (le predicat DOIT etre repete pour matcher l'index partiel).
// Ré-armement : dedup_key -> NULL quand la condition retombe (la notif reste en
// historique, mais un nouveau franchissement re-declenche).

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

function eur(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

const METRIC_LABEL = {
  portfolio_value: 'valeur de collection',
  cards_count: 'nombre de cartes',
  roi_pct: 'performance',
  graded_count: 'cartes gradées',
}

// ─────────────────────────────────────────────────────────────
// Générateur : alerte prix wishlist (cote <= prix cible)
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
    -- Resolution 2 chemins (fix JP 17/07, MIROIR de goals/service.ts listGoals) :
    -- id construit (EN/FR) OU (lang, print_id) (JP, id = jp-{tcgPlayerId}),
    -- collisions departagees par trigram sur le nom. Sans ce fix, une carte
    -- JP en wishlist n'avait jamais de cote ici -> son alerte ne partait JAMAIS.
    LEFT JOIN LATERAL (
      SELECT kc.print_id, kc.lang
      FROM k_cards kc
      WHERE gw.set_id IS NOT NULL AND gw.card_number IS NOT NULL
        AND kc.lang = lower(gw.lang)
        AND (kc.id = lower(gw.lang) || '-' || gw.set_id || '-' || gw.card_number
             OR kc.print_id = gw.set_id || '-' || gw.card_number)
      ORDER BY (kc.id = lower(gw.lang) || '-' || gw.set_id || '-' || gw.card_number) DESC,
               similarity(lower(kc.name_localized), lower(gw.card_name)) DESC
      LIMIT 1
    ) kc ON true
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
        VALUES (${r.user_id}, 'wishlist_price', ${'Prix atteint : ' + r.card_name},
                ${r.card_name + ' est à ' + eur(cur) + ' — ta cible était ' + eur(target) + '.'},
                ${JSON.stringify({ wid: r.wid, card_name: r.card_name, current_price: cur, target_price: target, url: '/portfolio/objectifs' })}::jsonb,
                ${dedup})
        ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        RETURNING id`
      if (ins.length) created++
    } else {
      const upd = await sql`UPDATE notifications SET dedup_key = NULL WHERE user_id = ${r.user_id} AND dedup_key = ${dedup} RETURNING id`
      if (upd.length) rearmed++
    }
  }
  return { created, rearmed, scanned: rows.length }
}

// ─────────────────────────────────────────────────────────────
// Générateur : progression des objectifs (atteint >=100% OU presque >=90%)
// Un seul passage : l'agregat portfolio n'est calcule qu'une fois.
// ─────────────────────────────────────────────────────────────
async function goalProgress() {
  const aggs = await sql`
    SELECT user_id,
           COALESCE(SUM(current_price * qty), 0)       AS portfolio_value,
           COALESCE(SUM(qty), 0)                       AS cards_count,
           COALESCE(SUM(buy_price * qty), 0)           AS total_buy,
           COALESCE(SUM(qty) FILTER (WHERE graded), 0) AS graded_count
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
  let reached = 0, almost = 0, rearmed = 0
  for (const t of targets) {
    const a = byUser.get(t.user_id)
    const cur = a ? a[t.metric] : undefined
    if (cur == null) continue
    const target = Number(t.target_value)
    if (!(target > 0)) continue
    const pct = (cur / target) * 100
    const label = t.label || METRIC_LABEL[t.metric] || 'ton objectif'
    const dReached = `goal_reached:${t.id}`
    const dAlmost = `goal_almost:${t.id}`

    if (pct >= 100) {
      const ins = await sql`
        INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
        VALUES (${t.user_id}, 'goal_reached', 'Objectif atteint',
                ${'Bravo, tu as atteint ton objectif : ' + label + '.'},
                ${JSON.stringify({ targetId: t.id, metric: t.metric, target, current: cur, url: '/portfolio/objectifs' })}::jsonb,
                ${dReached})
        ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        RETURNING id`
      if (ins.length) reached++
      await sql`UPDATE notifications SET dedup_key = NULL WHERE user_id = ${t.user_id} AND dedup_key = ${dAlmost}`
    } else if (pct >= 90) {
      const ins = await sql`
        INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
        VALUES (${t.user_id}, 'goal_almost', 'Objectif presque atteint',
                ${'Tu y es presque : ' + Math.round(pct) + '% de ton objectif « ' + label + ' ».'},
                ${JSON.stringify({ targetId: t.id, metric: t.metric, target, current: cur, pct: Math.round(pct), url: '/portfolio/objectifs' })}::jsonb,
                ${dAlmost})
        ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        RETURNING id`
      if (ins.length) almost++
      await sql`UPDATE notifications SET dedup_key = NULL WHERE user_id = ${t.user_id} AND dedup_key = ${dReached}`
    } else {
      const upd = await sql`UPDATE notifications SET dedup_key = NULL WHERE user_id = ${t.user_id} AND dedup_key IN (${dReached}, ${dAlmost}) RETURNING id`
      if (upd.length) rearmed++
    }
  }
  return { reached, almost, rearmed, targets: targets.length }
}

// ─────────────────────────────────────────────────────────────
// Générateur : fin de bêta J-7 (Lot 3 — le contrat visible)
// Fenetre [J-7, J] avant BETA_ENDS_AT : chaque invite INSCRIT recoit une
// notif, une seule fois (dedup par echeance : si la beta est prolongee,
// la nouvelle date re-declenche — c'est voulu, c'est un nouveau contrat).
// No-op propre si la beta est inactive ou sans echeance. Les deux vars
// doivent etre presentes dans kodo-consolidate.yml (env du job).
// ─────────────────────────────────────────────────────────────
async function betaEnding() {
  if (process.env.BETA_MODE !== 'on') return { skipped: 'beta_off' }
  const endsAt = process.env.BETA_ENDS_AT
  const end = endsAt ? Date.parse(endsAt) : NaN
  if (!Number.isFinite(end)) return { skipped: 'no_end_date' }
  const daysLeft = Math.ceil((end - Date.now()) / 86400000)
  if (daysLeft > 7 || daysLeft < 0) return { skipped: 'outside_window', daysLeft }

  const users = await sql`
    SELECT u.id AS user_id, bi.tier
    FROM beta_invites bi
    JOIN "user" u ON lower(u.email) = bi.email`
  const dateFr = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(end))
  let created = 0
  for (const u of users) {
    const dedup = `beta_ending:${endsAt}`
    const ins = await sql`
      INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
      VALUES (${u.user_id}, 'beta_ending', ${'Ta beta Premium se termine le ' + dateFr},
              ${'Ton acces ' + (u.tier === 'pro' ? 'Pro' : 'Premium') + ' offert prend fin le ' + dateFr + '. Tes cartes et tes donnees restent — seul l\'acces aux fonctionnalites ' + (u.tier === 'pro' ? 'Pro' : 'Premium') + ' s\'arrete, sauf abonnement.'},
              ${JSON.stringify({ ends_at: endsAt, tier: u.tier, url: '/abonnement' })}::jsonb,
              ${dedup})
      ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
      RETURNING id`
    if (ins.length) created++
  }
  return { created, invited: users.length, daysLeft }
}


async function setReleaseAlerts() {
  // Sets dont AU MOINS une date de sortie est atteinte (<= aujourd'hui).
  const released = await sql`
    SELECT code,
           COALESCE(name_fr, name_en, name_jp) AS name,
           LEAST(
             COALESCE(release_date_fr, release_date_en, release_date_jp),
             COALESCE(release_date_en, release_date_jp, release_date_fr),
             COALESCE(release_date_jp, release_date_en, release_date_fr)
           ) AS soonest
    FROM upcoming_sets
    WHERE COALESCE(release_date_fr, release_date_en, release_date_jp) <= now()
       OR COALESCE(release_date_en, release_date_jp, release_date_fr) <= now()
       OR COALESCE(release_date_jp, release_date_en, release_date_fr) <= now()`
  if (!released.length) return { created: 0, released: 0 }

  let created = 0
  for (const set of released) {
    const subs = await sql`SELECT user_id FROM set_alerts WHERE set_code = ${set.code}`
    for (const sub of subs) {
      const dedup = `set_release:${set.code}`
      const ins = await sql`
        INSERT INTO notifications (user_id, type, title, body, data, dedup_key)
        VALUES (${sub.user_id}, 'set_release',
                ${(set.name || 'Un set') + ' est disponible'},
                ${'La sortie que tu suivais vient de paraitre. Decouvre ' + (set.name || 'le set') + ' des maintenant.'},
                ${JSON.stringify({ code: set.code, url: '/releases' })}::jsonb,
                ${dedup})
        ON CONFLICT (user_id, dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
        RETURNING id`
      if (ins.length) created++
    }
    // Nettoyage : les abonnements d'un set sorti n'ont plus lieu d'etre.
    await sql`DELETE FROM set_alerts WHERE set_code = ${set.code}`
  }
  return { created, released: released.length }
}

// Registre extensible. Prochains : newSetRelease, wishlistDrop...
const generators = [
  { name: 'wishlist_price', run: wishlistPriceAlerts },
  { name: 'goal_progress', run: goalProgress },
  { name: 'beta_ending', run: betaEnding },
  { name: 'set_release', run: setReleaseAlerts },
]

async function main() {
  const results = {}
  for (const g of generators) {
    try { results[g.name] = await g.run() }
    catch (e) { results[g.name] = { error: String((e && e.message) || e) } }
  }
  console.log('Notifications:', JSON.stringify(results))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
