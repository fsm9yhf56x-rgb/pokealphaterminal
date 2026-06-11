require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  console.log('=== DIAGNOSTIC EN complement=0 ===')
  const d = await sql`SELECT
    count(*) AS en_rows,
    count(tcg_card_id) AS with_tcg_id,
    count(CASE WHEN tcg_card_id LIKE 'en-%' THEN 1 END) AS en_prefixed
    FROM graded_prices_ppt WHERE language='english'`
  console.log(JSON.stringify(d[0]))
  const sample = await sql`SELECT tcg_card_id, ppt_tcgplayer_id, card_name, set_name
    FROM graded_prices_ppt WHERE language='english' LIMIT 3`
  console.log('Sample:', JSON.stringify(sample))

  console.log('\n=== GRADES PPT -> price_matrix (JP + EN) ===')
  // clés: psa8, psa10, bgs9_5... -> PSA_8, PSA_10, BGS_9_5 ; valeur fiable: smartPrice, volume: count
  const rg = await sql`
    INSERT INTO price_matrix (kodo_card_id, print_id, market, tier, source, spot, low, high, sale_count, is_asking, currency, as_of)
    SELECT
      CASE WHEN g.language='japanese' THEN 'jp-' || g.ppt_tcgplayer_id ELSE g.tcg_card_id END,
      kp.id, 'US',
      upper(regexp_replace(gr.key, '^([a-z]+)([0-9].*)$', '\\1_\\2')),
      'ppt_ebay',
      (gr.value->>'smartPrice')::numeric,
      (gr.value->>'min')::numeric,
      (gr.value->>'max')::numeric,
      (gr.value->>'count')::int,
      false, 'USD',
      COALESCE(g.graded_updated_at, g.fetched_at, now())
    FROM graded_prices_ppt g
    JOIN k_prints kp ON (g.language='japanese' AND kp.ppt_card_id = g.ppt_tcgplayer_id::text)
                     OR (g.language='english' AND 'en-' || kp.id = g.tcg_card_id)
    CROSS JOIN LATERAL jsonb_each(g.grades) AS gr(key, value)
    WHERE g.grades IS NOT NULL AND (gr.value->>'smartPrice') IS NOT NULL
    ON CONFLICT (kodo_card_id, market, tier, source) DO UPDATE SET
      spot=EXCLUDED.spot, low=EXCLUDED.low, high=EXCLUDED.high,
      sale_count=EXCLUDED.sale_count, as_of=EXCLUDED.as_of, print_id=EXCLUDED.print_id
    RETURNING print_id`
  console.log('rows grades:', rg.length)

  console.log('\n=== VALIDATION ===')
  const v = await sql`SELECT count(DISTINCT print_id) AS prints, count(*) AS rows,
    count(DISTINCT CASE WHEN source='ppt_ebay' THEN print_id END) AS prints_graded_ppt
    FROM price_matrix WHERE print_id IS NOT NULL`
  console.log(JSON.stringify(v[0]))
  const t = await sql`SELECT tier, spot, sale_count FROM price_matrix
    WHERE source='ppt_ebay' AND kodo_card_id LIKE 'jp-%' ORDER BY random() LIMIT 5`
  console.log('Temoin grades JP:', JSON.stringify(t))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
