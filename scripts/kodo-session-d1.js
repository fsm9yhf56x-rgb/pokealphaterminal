require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  console.log('=== 1. RE-CLE price_matrix sur print_id ===')
  await sql`ALTER TABLE price_matrix ADD COLUMN IF NOT EXISTS print_id text`
  const r1 = await sql`UPDATE price_matrix pm SET print_id = kc.print_id
    FROM k_cards kc WHERE kc.id = pm.kodo_card_id AND pm.print_id IS NULL
    RETURNING pm.kodo_card_id`
  console.log('rows re-clees:', r1.length)
  await sql`CREATE INDEX IF NOT EXISTS idx_pm_print ON price_matrix(print_id)`
  const orph = await sql`SELECT count(*) AS n FROM price_matrix WHERE print_id IS NULL`
  console.log('rows orphelines:', JSON.stringify(orph[0]))

  console.log('\n=== 2. price_signals v2 (par print, cotes par langue) ===')
  await sql`DROP TABLE price_signals`
  await sql`CREATE TABLE price_signals (
    print_id text PRIMARY KEY REFERENCES k_prints(id),
    fair_value_eur numeric,
    fair_value_method text,
    cote_fr_eur numeric,
    cote_lang jsonb,
    liquidity_score real,
    spread_us_eu_pct real,
    grade_ev_psa10_eur numeric,
    anomaly boolean NOT NULL DEFAULT false,
    computed_at timestamptz NOT NULL
  )`
  console.log('OK price_signals v2 (ancienne vide, drop sans risque)')

  console.log('\n=== 3. price_history (append-only quotidien) ===')
  await sql`CREATE TABLE IF NOT EXISTS price_history (
    print_id text NOT NULL,
    day date NOT NULL,
    tier text NOT NULL,
    source text NOT NULL,
    market text NOT NULL,
    price numeric,
    sale_count integer,
    PRIMARY KEY (print_id, day, tier, source)
  )`
  console.log('OK price_history')

  console.log('\n=== 4. CALCUL DES SIGNAUX (1er passage) ===')
  const fx = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`
  const usdEur = Number(fx[0] && fx[0].rate || 0.92)
  console.log('FX USD->EUR:', usdEur)
  const r4 = await sql`
    INSERT INTO price_signals (print_id, fair_value_eur, fair_value_method, cote_fr_eur, cote_lang,
      liquidity_score, spread_us_eu_pct, grade_ev_psa10_eur, anomaly, computed_at)
    SELECT
      pm.print_id,
      ROUND(COALESCE(
        eu.trend,
        us_nm.p * ${usdEur},
        eu_nm_ask.p * 0.88
      )::numeric, 2) AS fair_value_eur,
      CASE WHEN eu.trend IS NOT NULL THEN 'cardmarket_trend'
           WHEN us_nm.p IS NOT NULL THEN 'us_nm_fx'
           ELSE 'eu_asking_decote' END,
      eu_fr.p AS cote_fr_eur,
      eu_langs.j AS cote_lang,
      LEAST(100, ROUND(
        COALESCE(LOG(GREATEST(tot.sales, 1)) * 25, 0)
      ))::real AS liquidity_score,
      CASE WHEN eu.trend IS NOT NULL AND us_nm.p IS NOT NULL AND eu.trend > 0
        THEN ROUND(((us_nm.p * ${usdEur} - eu.trend) / eu.trend * 100)::numeric, 1)::real END,
      CASE WHEN psa10.p IS NOT NULL AND us_nm.p IS NOT NULL
        THEN ROUND(((psa10.p - us_nm.p) * ${usdEur})::numeric, 2) END,
      false, now()
    FROM (SELECT DISTINCT print_id FROM price_matrix WHERE print_id IS NOT NULL) pm
    LEFT JOIN LATERAL (SELECT spot AS trend FROM price_matrix
      WHERE print_id = pm.print_id AND source='cardmarket' AND tier='AGGREGATED' LIMIT 1) eu ON true
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = pm.print_id AND market='US' AND tier='NEAR_MINT' AND NOT is_asking
      ORDER BY CASE source WHEN 'tcgplayer' THEN 0 ELSE 1 END LIMIT 1) us_nm ON true
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = pm.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT' LIMIT 1) eu_nm_ask ON true
    LEFT JOIN LATERAL (SELECT (country_breakdown->'FR'->>'avg')::numeric AS p FROM price_matrix
      WHERE print_id = pm.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT'
        AND country_breakdown ? 'FR' LIMIT 1) eu_fr ON true
    LEFT JOIN LATERAL (SELECT jsonb_object_agg(k, v->'language') AS j FROM (
      SELECT key AS k, value AS v FROM price_matrix,
        jsonb_each(country_breakdown)
      WHERE print_id = pm.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT'
        AND country_breakdown IS NOT NULL LIMIT 6) x WHERE v ? 'language') eu_langs ON true
    LEFT JOIN LATERAL (SELECT sum(sale_count) AS sales FROM price_matrix
      WHERE print_id = pm.print_id AND NOT is_asking) tot ON true
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = pm.print_id AND tier='PSA_10' AND market='US' LIMIT 1) psa10 ON true
    ON CONFLICT (print_id) DO UPDATE SET
      fair_value_eur=EXCLUDED.fair_value_eur, fair_value_method=EXCLUDED.fair_value_method,
      cote_fr_eur=EXCLUDED.cote_fr_eur, cote_lang=EXCLUDED.cote_lang,
      liquidity_score=EXCLUDED.liquidity_score, spread_us_eu_pct=EXCLUDED.spread_us_eu_pct,
      grade_ev_psa10_eur=EXCLUDED.grade_ev_psa10_eur, computed_at=now()
    RETURNING print_id`
  console.log('signaux calcules:', r4.length)

  console.log('\n=== 5. SNAPSHOT price_history (jour 1) ===')
  const r5 = await sql`
    INSERT INTO price_history (print_id, day, tier, source, market, price, sale_count)
    SELECT print_id, CURRENT_DATE, tier, source, market, spot, sale_count
    FROM price_matrix WHERE print_id IS NOT NULL AND spot IS NOT NULL
    ON CONFLICT DO NOTHING RETURNING print_id`
  console.log('rows history:', r5.length)

  console.log('\n=== VALIDATION TEMOIN ex1-8 ===')
  const t = await sql`SELECT * FROM price_signals WHERE print_id='ex1-8'`
  console.log(JSON.stringify(t[0] || null, null, 1))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
