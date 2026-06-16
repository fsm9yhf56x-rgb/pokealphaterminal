require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
;(async () => {
console.log('\n=== CALCUL DES SIGNAUX PAR LANGUE ===')
  const fx = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`
  const usdEur = Number(fx[0] && fx[0].rate || 0.92)
  console.log('FX USD->EUR:', usdEur)

  const r4 = await sql`
    INSERT INTO price_signals (print_id, lang, fair_value_eur, fair_value_method, cote_fr_eur, cote_lang,
      liquidity_score, spread_us_eu_pct, grade_ev_psa10_eur, anomaly, computed_at)
    SELECT
      base.print_id,
      base.lang,
      ROUND(COALESCE(
        eu.trend,
        us_nm.p * ${usdEur},
        eu_nm_ask.p * 0.88
      )::numeric, 2) AS fair_value_eur,
      CASE WHEN eu.trend IS NOT NULL THEN 'cardmarket_trend'
           WHEN us_nm.p IS NOT NULL THEN 'us_nm_fx'
           ELSE 'eu_asking_decote' END,
      fr_sale.p AS cote_fr_eur,
      eu_langs.j AS cote_lang,
      LEAST(100, ROUND(COALESCE(LOG(tot.sales + 1) * 28, 0)))::real AS liquidity_score,
      CASE WHEN eu.trend IS NOT NULL AND us_nm.p IS NOT NULL AND eu.trend > 0
        THEN ROUND(((us_nm.p * ${usdEur} - eu.trend) / eu.trend * 100)::numeric, 1)::real END,
      CASE WHEN psa10.p IS NOT NULL AND us_nm.p IS NOT NULL
        THEN ROUND(((psa10.p - us_nm.p) * ${usdEur})::numeric, 2) END,
      false, now()
    FROM (
      -- 1 ligne par (print, langue) presente dans la matrice
      SELECT DISTINCT pm0.print_id,
        split_part(pm0.kodo_card_id, '-', 1) AS lang,
        CASE WHEN kp.rarity ILIKE '%holo%' THEN 'Holofoil' ELSE 'Normal' END AS mainvar
      FROM price_matrix pm0
      LEFT JOIN k_prints kp ON kp.id = pm0.print_id
      WHERE pm0.print_id IS NOT NULL
    ) base
    -- Cardmarket trend DE CETTE LANGUE (cle: filtre kodo_card_id prefixe lang)
    LEFT JOIN LATERAL (SELECT spot AS trend FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket' AND tier='AGGREGATED'
        AND split_part(kodo_card_id,'-',1) = base.lang LIMIT 1) eu ON true
    -- US Near Mint (sold) de cette langue
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND market='US' AND tier='NEAR_MINT' AND NOT is_asking
        AND split_part(kodo_card_id,'-',1) = base.lang
      ORDER BY CASE WHEN variant = base.mainvar THEN 0 ELSE 1 END,
               CASE source WHEN 'tcgplayer' THEN 0 ELSE 1 END LIMIT 1) us_nm ON true
    -- Annonces EU (fallback prix uniquement, decote)
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT'
        AND split_part(kodo_card_id,'-',1) = base.lang LIMIT 1) eu_nm_ask ON true
    -- Cote FR = VENTES (cardmarket trend) du marche FR, PAS les annonces
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket' AND tier='AGGREGATED'
        AND kodo_card_id LIKE 'fr-%' LIMIT 1) fr_sale ON true
    -- Repartition par pays (depuis country_breakdown, cette langue)
    LEFT JOIN LATERAL (SELECT jsonb_object_agg(k, v->'language') AS j FROM (
      SELECT key AS k, value AS v FROM price_matrix,
        jsonb_each(country_breakdown)
      WHERE print_id = base.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT'
        AND split_part(kodo_card_id,'-',1) = base.lang
        AND country_breakdown IS NOT NULL LIMIT 6) x WHERE v ? 'language') eu_langs ON true
    -- Liquidite = ventes de cette langue
    LEFT JOIN LATERAL (SELECT sum(sale_count) AS sales FROM price_matrix
      WHERE print_id = base.print_id AND NOT is_asking
        AND split_part(kodo_card_id,'-',1) = base.lang) tot ON true
    -- Grade EV PSA10 (US, partage entre langues car gradage surtout EN)
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND tier='PSA_10' AND market='US'
      ORDER BY spot DESC NULLS LAST LIMIT 1) psa10 ON true
    ON CONFLICT (print_id, lang) DO UPDATE SET
      fair_value_eur=EXCLUDED.fair_value_eur, fair_value_method=EXCLUDED.fair_value_method,
      cote_fr_eur=EXCLUDED.cote_fr_eur, cote_lang=EXCLUDED.cote_lang,
      liquidity_score=EXCLUDED.liquidity_score, spread_us_eu_pct=EXCLUDED.spread_us_eu_pct,
      grade_ev_psa10_eur=EXCLUDED.grade_ev_psa10_eur, computed_at=now()
    RETURNING print_id`
  console.log('signaux calcules (par langue):', r4.length)

  console.log('\n=== SNAPSHOT price_history ===')
  const r5 = await sql`
    INSERT INTO price_history (print_id, day, tier, source, market, price, sale_count, currency)
    SELECT print_id, CURRENT_DATE, tier, source, market, spot, sale_count, currency
    FROM price_matrix WHERE print_id IS NOT NULL AND spot IS NOT NULL
    ON CONFLICT DO NOTHING RETURNING print_id`
  console.log('rows history:', r5.length)
  console.log('Signaux + history a jour.')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
