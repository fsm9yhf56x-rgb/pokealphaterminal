// Kodo Engine — merge quotidien PPT -> price_matrix (idempotent, 0 requete API)
//
// ETAPE 2 (grades) REECRITE 17/07 : les tiers grades passaient smartPrice
// brut en spot, sans garde -> prix absurdes en prod (PSA 9 a 74 EUR pour
// une carte a 250-500, ACE 5 > ACE 10 affiches dans le Spotlight).
// Desormais la REGLE (scripts/lib/graded-rule.js, miroir de
// src/lib/pricing/graded.ts) decide : median, count>=3, monotonie, sinon
// le tier N'EST PAS PUBLIE. Chaque lot purge ses anciennes lignes ppt_ebay
// avant reinsertion — sans purge, les vieux smartPrice survivraient a
// l'upsert puisque les tiers rejetes ne sont plus reecrits.
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const { usableGradeTiers } = require('./lib/graded-rule.js')
const sql = neon(process.env.DATABASE_URL)

async function withRetry(label, fn, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fn() }
    catch (e) {
      if (i === tries) throw e
      console.log('[merge-ppt] ' + label + ' tentative ' + i + ' echouee (' + e.message.slice(0, 80) + '), retry dans ' + (i * 5) + 's...')
      await new Promise(r => setTimeout(r, i * 5000))
    }
  }
}

;(async () => {
  // 1. RAW par condition — JP (join ppt_card_id) + EN (join tcgplayer_id)
  //    Chunke par set+langue pour rester sous le timeout HTTP Neon (meme pattern que les grades)
  let rawTotal = 0
  const rawBatches = await sql`SELECT DISTINCT set_name, language FROM graded_prices_ppt WHERE prices_by_condition IS NOT NULL ORDER BY language, set_name`
  console.log('[merge-ppt] raw: ' + rawBatches.length + ' lots set+langue')
  for (const b of rawBatches) {
    const r = await withRetry('raw:' + b.set_name, () => sql`
      INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, variant, source, spot, is_asking, currency, as_of)
      SELECT DISTINCT ON (kc.id, cond.key)
        kc.id, kp.id, 'US',
        CASE cond.key WHEN 'NM' THEN 'NEAR_MINT' WHEN 'LP' THEN 'LIGHTLY_PLAYED'
          WHEN 'MP' THEN 'MODERATELY_PLAYED' WHEN 'HP' THEN 'HEAVILY_PLAYED'
          WHEN 'DMG' THEN 'DAMAGED' ELSE cond.key END,
        CASE WHEN kp.rarity ILIKE '%holo%' THEN 'Holofoil' ELSE 'Normal' END,
        'ppt_tcgplayer', (cond.value)::numeric, false, 'USD',
        COALESCE(g.graded_updated_at, g.fetched_at, now())
      FROM graded_prices_ppt g
      JOIN k_prints kp ON
        (g.language='japanese' AND kp.ppt_card_id = g.ppt_tcgplayer_id::text)
        OR (g.language='english' AND kp.tcgplayer_id = g.ppt_tcgplayer_id::text
            -- Variants (Shadowless/1st Ed) partagent le meme tcgplayer_id: PPT ne les distingue pas.
            -- On exclut ces prints du merge PPT; leurs prix viennent de PokeTrace (qui distingue les variants).
            -- (rapide grace a l'index idx_kprints_tcgid)
            AND NOT EXISTS (SELECT 1 FROM k_prints o WHERE o.tcgplayer_id = kp.tcgplayer_id AND o.id <> kp.id))
      JOIN k_cards kc ON kc.print_id = kp.id
        AND kc.lang = CASE g.language WHEN 'japanese' THEN 'jp' ELSE 'en' END
      CROSS JOIN LATERAL jsonb_each_text(g.prices_by_condition) AS cond(key, value)
      WHERE g.prices_by_condition IS NOT NULL
        AND g.set_name = ${b.set_name} AND g.language = ${b.language}
      ORDER BY kc.id, cond.key, g.fetched_at DESC
      ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
        spot=EXCLUDED.spot, as_of=EXCLUDED.as_of, print_id=EXCLUDED.print_id
      RETURNING 1`)
    rawTotal += r.length
  }
  console.log('[merge-ppt] raw rows:', rawTotal)

  // 2. GRADES — median + gardes via graded-rule.js (JAMAIS smartPrice).
  //    Le SQL ramene les jsonb apparies (meme JOIN qu'avant), le JS applique
  //    la regle, l'insert repart en un unnest par lot (lecon Neon: grouper).
  let gradeTotal = 0
  let blockedTotal = 0
  const setBatches = await sql`SELECT DISTINCT set_name, language FROM graded_prices_ppt WHERE grades IS NOT NULL ORDER BY language, set_name`
  console.log('[merge-ppt] grades: ' + setBatches.length + ' lots set+langue')
  for (const b of setBatches) {
    const cards = await withRetry('grades-read:' + b.set_name, () => sql`
      SELECT DISTINCT ON (kc.id)
        kc.id AS kodo_card_id, kp.id AS print_id, kp.rarity, g.grades, g.raw_market_usd,
        COALESCE(g.graded_updated_at, g.fetched_at, now()) AS as_of
      FROM graded_prices_ppt g
      JOIN k_prints kp ON
        (g.language='japanese' AND kp.ppt_card_id = g.ppt_tcgplayer_id::text)
        OR (g.language='english' AND kp.tcgplayer_id = g.ppt_tcgplayer_id::text
            AND NOT EXISTS (SELECT 1 FROM k_prints o WHERE o.tcgplayer_id = kp.tcgplayer_id AND o.id <> kp.id))
      JOIN k_cards kc ON kc.print_id = kp.id
        AND kc.lang = CASE g.language WHEN 'japanese' THEN 'jp' ELSE 'en' END
      WHERE g.grades IS NOT NULL
        AND g.set_name = ${b.set_name} AND g.language = ${b.language}
      ORDER BY kc.id, g.fetched_at DESC`)
    if (!cards.length) continue

    // La regle decide, tier par tier. Un tier rejete n'existe pas.
    const ids = [], prints = [], tiers = [], variants = [], spots = [], lows = [], highs = [], counts = [], asofs = []
    const markets = [], sources = [], askings = [], currencies = []
    for (const c of cards) {
      const variant = c.rarity && /holo/i.test(c.rarity) ? 'Holofoil' : 'Normal'
      const all = Object.keys(c.grades || {}).length
      const ok = usableGradeTiers(c.grades, Number(c.raw_market_usd) || null)
      blockedTotal += all - ok.length
      for (const t of ok) {
        const raw = c.grades[t.tier.toLowerCase().replace('_', '')] || c.grades[t.tier.toLowerCase().replace('_', '_')] || {}
        ids.push(c.kodo_card_id); prints.push(c.print_id); tiers.push(t.tier); variants.push(variant)
        spots.push(t.spot); lows.push(raw.min ?? null); highs.push(raw.max ?? null)
        counts.push(t.saleCount); asofs.push(c.as_of)
        markets.push('US'); sources.push('ppt_ebay'); askings.push(false); currencies.push('USD')
      }
    }

    // Purge des anciennes lignes grades PPT de CES cartes (petits lots, jamais
    // de DELETE massif sur Neon) : les tiers desormais rejetes disparaissent
    // -> graded_no_data en aval -> "—" affiche, plus jamais un faux prix.
    // Les tiers d'etat raw (NEAR_MINT...) de l'etape 1 sont ppt_tcgplayer : intacts.
    await withRetry('grades-purge:' + b.set_name, () => sql`
      DELETE FROM price_matrix
      WHERE source = 'ppt_ebay' AND kodo_card_id = ANY(${cards.map(c => c.kodo_card_id)})`)

    if (ids.length) {
      const r = await withRetry('grades-insert:' + b.set_name, () => sql`
        INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, variant, source, spot, low, high, sale_count, is_asking, currency, as_of)
        SELECT * FROM unnest(
          ${ids}::text[], ${prints}::text[], ${markets}::text[],
          ${tiers}::text[], ${variants}::text[], ${sources}::text[],
          ${spots}::numeric[], ${lows}::numeric[], ${highs}::numeric[], ${counts}::int[],
          ${askings}::boolean[], ${currencies}::text[],
          ${asofs}::timestamptz[])
        ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
          spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
          sale_count=EXCLUDED.sale_count, as_of=EXCLUDED.as_of, print_id=EXCLUDED.print_id
        RETURNING 1`)
      gradeTotal += r.length
    }
  }
  console.log('[merge-ppt] grade rows publies:', gradeTotal, '| tiers bloques par la regle:', blockedTotal)

  const v = await sql`SELECT count(DISTINCT print_id) AS prints, count(*) AS rows FROM price_matrix WHERE print_id IS NOT NULL`
  console.log('[merge-ppt] matrice:', JSON.stringify(v[0]))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
