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
           WHEN eu_nm_ask.p IS NOT NULL THEN 'eu_asking_decote'
           ELSE 'insufficient_data' END,
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
    -- Garde-fou coherence v2: on ecarte le NM si l'echelle raw est multi-incoherente.
    -- L'etat est declare par le vendeur, donc le raw NM est parfois pollue sur les cartes rares.
    -- Regle: NM ecarte si >= 2 etats degrades (LP/MP/HP/DMG) AVEC VENTES depassent 2x le NM.
    -- Un seul etat aberrant (ex un DAMAGED outlier) ne suffit pas -> on garde le NM.
    LEFT JOIN LATERAL (
      SELECT spot AS p FROM price_matrix nm
      WHERE nm.print_id = base.print_id AND nm.market='US' AND nm.tier='NEAR_MINT' AND NOT nm.is_asking
        AND split_part(nm.kodo_card_id,'-',1) = base.lang
        AND (
          SELECT count(*) FROM (
            SELECT tier, max(spot) AS s FROM price_matrix d
            WHERE d.print_id = base.print_id AND NOT d.is_asking AND d.sale_count > 0
              AND split_part(d.kodo_card_id,'-',1) = base.lang
              AND d.tier IN ('LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            GROUP BY tier
          ) lo WHERE lo.s > nm.spot * 2
        ) < 2
      ORDER BY CASE WHEN nm.variant = base.mainvar THEN 0 ELSE 1 END,
               CASE nm.source WHEN 'tcgplayer' THEN 0 ELSE 1 END LIMIT 1) us_nm ON true
    -- Annonces EU (fallback prix uniquement, decote)
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket_unsold' AND tier='NEAR_MINT'
        AND split_part(kodo_card_id,'-',1) = base.lang
        AND spot * (CASE WHEN currency='USD' THEN ${usdEur}::numeric ELSE 1::numeric END) <= 20000 LIMIT 1) eu_nm_ask ON true
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
      WHERE print_id = base.print_id AND tier='PSA_10' AND market='US' AND NOT is_asking
        AND spot * (CASE WHEN currency='USD' THEN ${usdEur}::numeric ELSE 1::numeric END) <= 20000
      ORDER BY spot DESC NULLS LAST LIMIT 1) psa10 ON true
    ON CONFLICT (print_id, lang) DO UPDATE SET
      fair_value_eur=EXCLUDED.fair_value_eur, fair_value_method=EXCLUDED.fair_value_method,
      cote_fr_eur=EXCLUDED.cote_fr_eur, cote_lang=EXCLUDED.cote_lang,
      liquidity_score=EXCLUDED.liquidity_score, spread_us_eu_pct=EXCLUDED.spread_us_eu_pct,
      grade_ev_psa10_eur=EXCLUDED.grade_ev_psa10_eur, computed_at=now()
    RETURNING print_id`
  console.log('signaux calcules (par langue):', r4.length)
  const rz = await sql`UPDATE price_signals SET fair_value_eur = NULL WHERE fair_value_eur < 0.02 AND fair_value_eur IS NOT NULL RETURNING print_id`
  console.log('quasi-zeros nulles (< 0.02 EUR):', rz.length)

  console.log('\n=== SNAPSHOT price_history ===')
  const r5 = await sql`
    INSERT INTO price_history (print_id, day, tier, source, market, price, sale_count, currency)
    SELECT print_id, CURRENT_DATE, tier, source, market, spot, sale_count, currency
    FROM price_matrix WHERE print_id IS NOT NULL AND spot IS NOT NULL
    ON CONFLICT DO NOTHING RETURNING print_id`
  console.log('rows history:', r5.length)
  console.log('Signaux + history a jour.')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
