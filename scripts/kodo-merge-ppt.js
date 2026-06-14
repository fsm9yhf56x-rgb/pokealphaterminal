// Kodo Engine — merge quotidien PPT -> price_matrix (idempotent, 0 requete API)
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
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
      INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, spot, is_asking, currency, as_of)
      SELECT DISTINCT ON (kc.id, cond.key)
        kc.id, kp.id, 'US',
        CASE cond.key WHEN 'NM' THEN 'NEAR_MINT' WHEN 'LP' THEN 'LIGHTLY_PLAYED'
          WHEN 'MP' THEN 'MODERATELY_PLAYED' WHEN 'HP' THEN 'HEAVILY_PLAYED'
          WHEN 'DMG' THEN 'DAMAGED' ELSE cond.key END,
        'ppt_tcgplayer', (cond.value)::numeric, false, 'USD',
        COALESCE(g.graded_updated_at, g.fetched_at, now())
      FROM graded_prices_ppt g
      JOIN k_prints kp ON
        (g.language='japanese' AND kp.ppt_card_id = g.ppt_tcgplayer_id::text)
        OR (g.language='english' AND kp.tcgplayer_id = g.ppt_tcgplayer_id::text)
      JOIN k_cards kc ON kc.print_id = kp.id
        AND kc.lang = CASE g.language WHEN 'japanese' THEN 'jp' ELSE 'en' END
      CROSS JOIN LATERAL jsonb_each_text(g.prices_by_condition) AS cond(key, value)
      WHERE g.prices_by_condition IS NOT NULL
        AND g.set_name = ${b.set_name} AND g.language = ${b.language}
      ORDER BY kc.id, cond.key, g.fetched_at DESC
      ON CONFLICT (kodo_card_id, market, tier, source) DO UPDATE SET
        spot=EXCLUDED.spot, as_of=EXCLUDED.as_of, print_id=EXCLUDED.print_id
      RETURNING 1`)
    rawTotal += r.length
  }
  console.log('[merge-ppt] raw rows:', rawTotal)

  // 2. GRADES (psa8/bgs9_5... -> PSA_8/BGS_9_5) — par lots de sets pour rester sous le timeout Neon
  let gradeTotal = 0
  const setBatches = await sql`SELECT DISTINCT set_name, language FROM graded_prices_ppt WHERE grades IS NOT NULL ORDER BY language, set_name`
  console.log('[merge-ppt] grades: ' + setBatches.length + ' lots set+langue')
  for (const b of setBatches) {
    const r = await withRetry('grades:' + b.set_name, () => sql`
      INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, spot, low, high, sale_count, is_asking, currency, as_of)
      SELECT DISTINCT ON (kc.id, gr.key)
        kc.id, kp.id, 'US',
        upper(regexp_replace(gr.key, '^([a-z]+)([0-9].*)$', '\\1_\\2')),
        'ppt_ebay',
        (gr.value->>'smartPrice')::numeric, (gr.value->>'min')::numeric, (gr.value->>'max')::numeric,
        (gr.value->>'count')::int, false, 'USD',
        COALESCE(g.graded_updated_at, g.fetched_at, now())
      FROM graded_prices_ppt g
      JOIN k_prints kp ON
        (g.language='japanese' AND kp.ppt_card_id = g.ppt_tcgplayer_id::text)
        OR (g.language='english' AND kp.tcgplayer_id = g.ppt_tcgplayer_id::text)
      JOIN k_cards kc ON kc.print_id = kp.id
        AND kc.lang = CASE g.language WHEN 'japanese' THEN 'jp' ELSE 'en' END
      CROSS JOIN LATERAL jsonb_each(g.grades) AS gr(key, value)
      WHERE g.grades IS NOT NULL AND (gr.value->>'smartPrice') IS NOT NULL
        AND g.set_name = ${b.set_name} AND g.language = ${b.language}
      ORDER BY kc.id, gr.key, g.fetched_at DESC
      ON CONFLICT (kodo_card_id, market, tier, source) DO UPDATE SET
        spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
        sale_count=EXCLUDED.sale_count, as_of=EXCLUDED.as_of, print_id=EXCLUDED.print_id
      RETURNING 1`)
    gradeTotal += r.length
  }
  console.log('[merge-ppt] grade rows:', gradeTotal)

  const v = await sql`SELECT count(DISTINCT print_id) AS prints, count(*) AS rows FROM price_matrix WHERE print_id IS NOT NULL`
  console.log('[merge-ppt] matrice:', JSON.stringify(v[0]))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
