require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
;(async () => {
console.log('\n=== CALCUL DES SIGNAUX PAR LANGUE ===')
  const fx = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`
  const usdEur = Number(fx[0] && fx[0].rate || 0.92)
  console.log('FX USD->EUR:', usdEur)

  let totalSignaux = 0
  for (const LANG of ['fr', 'en', 'jp']) {
  const r4 = await sql`
    WITH ins AS (
    INSERT INTO price_signals (print_id, lang, fair_value_eur, fair_value_method, cote_fr_eur, cote_lang,
      liquidity_score, spread_us_eu_pct, grade_ev_psa10_eur, anomaly, computed_at)
    SELECT
      base.print_id,
      base.lang,
      -- fair_value PAR MARCHE de la langue (jamais de melange US/EU) :
      --  EN / JP -> marche US (vente NM US x FX) en priorite ; si aucune vente US,
      --            dernier secours = vente Cardmarket (eu.trend), JAMAIS une annonce.
      --  FR -> sources FRANCAISES UNIQUEMENT (eBay FR, ventes country FR/FR).
      --       Le trend Cardmarket = toutes langues melangees -> BANNI du FR
      --       (decision Alon 20/07 : l'or avec l'or). Pas de source FR = pas de prix.
      ROUND(
        CASE
          WHEN base.lang IN ('en','jp') THEN COALESCE(us_nm.p * ${usdEur}, eu.trend)
          ELSE COALESCE(ebay_state.p, ed_ebay.p, fr_sale.p * 0.88)
        END::numeric, 2) AS fair_value_eur,
      CASE
        WHEN base.lang IN ('en','jp') THEN
          CASE WHEN us_nm.p IS NOT NULL THEN 'us_nm_fx'
               WHEN eu.trend IS NOT NULL THEN 'cardmarket_trend'
               ELSE 'insufficient_data' END
        ELSE
          CASE WHEN ebay_state.p IS NOT NULL THEN 'ebay_fr_state'
               WHEN ed_ebay.p IS NOT NULL THEN 'ebay_fr_edition'
               WHEN fr_sale.p IS NOT NULL THEN 'fr_sale'
               ELSE 'insufficient_data' END
      END,
      COALESCE(ebay_state.p, ed_ebay.p, fr_sale.p * 0.88) AS cote_fr_eur,
      eu_langs.j AS cote_lang,
      CASE WHEN tot.sales > 0 THEN LEAST(100, ROUND(LOG(tot.sales + 1) * 28))::real ELSE NULL END AS liquidity_score,
      CASE WHEN eu.trend IS NOT NULL AND us_nm.p IS NOT NULL AND eu.trend > 0
        THEN ROUND(((us_nm.p * ${usdEur} - eu.trend) / eu.trend * 100)::numeric, 1)::real END,
      CASE WHEN base.lang IN ('en','jp') AND psa10.p IS NOT NULL AND us_nm.p IS NOT NULL
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
        AND EXISTS (SELECT 1 FROM k_prints k2 WHERE k2.id = pm0.print_id)
        AND split_part(pm0.kodo_card_id, '-', 1) = ${LANG}
    ) base
    -- Cardmarket trend DE CETTE LANGUE (cle: filtre kodo_card_id prefixe lang)
    LEFT JOIN LATERAL (SELECT spot AS trend FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket' AND tier='AGGREGATED'
        AND split_part(kodo_card_id,'-',1) = base.lang LIMIT 1) eu ON true
    -- Prix edition-specifique eBay FR (Ed1/Unl, tri chirurgical) : PRIORITAIRE sur
    -- l'AGGREGATED Cardmarket pollue (qui melange les editions). Ed1 sur print -1st-,
    -- Unlimited sur print normal.
    LEFT JOIN LATERAL (SELECT spot AS p FROM price_matrix
      WHERE print_id = base.print_id AND source='ebay_fr'
        AND variant = CASE WHEN base.print_id LIKE '%-1st-%' THEN 'ed1_raw' ELSE 'unl_raw' END
      LIMIT 1) ed_ebay ON true
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
    -- Niveau 2 : carte avec une VRAIE distribution d'annonces FR par etat
    -- (>=8 annonces eBay FR). Sa ligne EXCELLENT fait foi comme cote : elle est
    -- construite sur les etats declares par les vendeurs, la ou ed_ebay n'est
    -- qu'une mediane globale decotee. Sans ca les deux chiffres sortaient des
    -- MEMES annonces par deux calculs differents (Pyroli : titre 57,20 vs
    -- EXCELLENT 65,00) -> incomprehensible sur la fiche.
    LEFT JOIN LATERAL (
      SELECT pm.spot AS p
      FROM price_matrix pm
      WHERE pm.print_id = base.print_id AND pm.source='kodo_state' AND pm.tier='EXCELLENT'
        AND split_part(pm.kodo_card_id,'-',1) = base.lang
        AND (SELECT count(*) FROM ebay_fr_ed1_raw r
             WHERE r.kodo_card_id = pm.kodo_card_id AND r.price > 0) >= 8
      LIMIT 1) ebay_state ON true
    -- Cote FR = ventes FR reelles (country_breakdown.FR.language.FR.avg), PAS l'AGGREGATED global
    LEFT JOIN LATERAL (
      SELECT (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric AS p
      FROM price_matrix
      WHERE print_id = base.print_id AND source='cardmarket_unsold'
        AND split_part(kodo_card_id,'-',1) = base.lang
        AND country_breakdown->'FR'->'language'->'FR'->>'avg' IS NOT NULL
        AND (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric > 0
        -- n>=3 : cardmarket_unsold = des ANNONCES. Une seule annonce n'est pas un
        -- marche (Nosferalto Team Rocket cotait 40 500 EUR sur 1 annonce quand ses
        -- asks NM reels sont a 2 332). Meme seuil que G2 gradee et eBay Ed1.
        --
        -- EXCEPTION n=2 CONCORDANTES : deux annonces qui s'accordent a moins de 25%
        -- d'ecart ne sont pas du bruit, elles se corroborent (Nymphali VMAX 600-650,
        -- Ptera ex 380-400). On ecarte en revanche les n=2 qui se contredisent
        -- (Pikachu et Zekrom GX 240-700 = 98% d'ecart : deux marches differents,
        -- pas deux observations du meme prix). Une seule annonce n'a par definition
        -- aucune dispersion mesurable -> reste exclue.
        AND (
          COALESCE((country_breakdown->'FR'->'language'->'FR'->>'saleCount')::int, 0) >= 3
          OR (
            (country_breakdown->'FR'->'language'->'FR'->>'saleCount')::int = 2
            AND (country_breakdown->'FR'->'language'->'FR'->>'high')::numeric IS NOT NULL
            AND (country_breakdown->'FR'->'language'->'FR'->>'low')::numeric IS NOT NULL
            AND (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric > 0
            AND ((country_breakdown->'FR'->'language'->'FR'->>'high')::numeric
                 - (country_breakdown->'FR'->'language'->'FR'->>'low')::numeric)
                / (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric <= 0.25
          )
        )
      ORDER BY (country_breakdown->'FR'->'language'->'FR'->>'saleCount')::int DESC NULLS LAST
      LIMIT 1) fr_sale ON true
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
    RETURNING 1
    ) SELECT count(*)::int AS n FROM ins`
  console.log('  ' + LANG + ' : ' + r4[0].n + ' signaux')
  totalSignaux += r4[0].n
  }
  console.log('signaux calcules (total):', totalSignaux)
  const rz = await sql`WITH upd AS (
    UPDATE price_signals SET fair_value_eur = NULL
     WHERE fair_value_eur < 0.02 AND fair_value_eur IS NOT NULL RETURNING 1
  ) SELECT count(*)::int AS n FROM upd`
  console.log('quasi-zeros nulles (< 0.02 EUR):', rz[0].n)
  // Nettoyage des ORPHELINS : un print peut avoir disparu de price_matrix (prix purges)
  // tout en gardant une vieille ligne price_signals jamais reecrite (l'INSERT ... SELECT
  // part de price_matrix, donc ON CONFLICT ne se declenche pas pour ces prints).
  // On nulle leur fair_value pour ne pas afficher un prix fantome (ex Blastoise 1st Ed).
  const ro = await sql`
    WITH upd AS (
    UPDATE price_signals ps SET fair_value_eur = NULL, fair_value_method = 'insufficient_data', computed_at = now()
    WHERE ps.fair_value_eur IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM price_matrix pm
        WHERE pm.print_id = ps.print_id AND split_part(pm.kodo_card_id,'-',1) = ps.lang)
    RETURNING 1
    ) SELECT count(*)::int AS n FROM upd`
  console.log('orphelins nulles (print absent de price_matrix):', ro[0].n)
  console.log('\n=== SNAPSHOT price_history ===')
  // RETURNING print_id faisait remonter ~480 000 lignes au driver HTTP Neon pour
  // le seul besoin d'un compteur -> 'fetch failed' apres 23 min (echecs des 29-30/07).
  // La CTE fait le meme travail cote serveur et ne renvoie qu'un entier.
  // ECRITURE INCREMENTALE (30/07) : on n'insere QUE si le prix a change, ou si le
  // dernier point de la serie a plus de 7 jours.
  // Avant : 480 000 lignes reecrites chaque nuit, dont 94% identiques a la veille
  //   -> 16,9 M lignes / 2972 MB, et un simple lag() prenait 167 secondes.
  // Un graphique se reconstruit exactement a partir des seuls changements (l'UI
  // relie les points, donc un prix stable donne une ligne plate). Le point
  // hebdomadaire evite qu'une serie stable depuis deux mois s'arrete net.
  const r5 = await sql`
    WITH ambigu AS (
      SELECT print_id, tier, source, split_part(kodo_card_id,'-',1) AS lang
        FROM price_matrix
       WHERE print_id IS NOT NULL AND spot IS NOT NULL
       GROUP BY print_id, tier, source, split_part(kodo_card_id,'-',1)
      HAVING count(*) > 1
    ), candidat AS (
      SELECT pm.print_id, pm.tier, pm.source,
             split_part(pm.kodo_card_id,'-',1) AS lang,
             pm.market, pm.spot, pm.sale_count, pm.currency
        FROM price_matrix pm
        LEFT JOIN ambigu a
          ON a.print_id = pm.print_id AND a.tier = pm.tier AND a.source = pm.source
         AND a.lang = split_part(pm.kodo_card_id,'-',1)
       WHERE pm.print_id IS NOT NULL AND pm.spot IS NOT NULL
         AND a.print_id IS NULL
    ), dernier AS (
      SELECT DISTINCT ON (ph.print_id, ph.tier, ph.source, ph.lang)
             ph.print_id, ph.tier, ph.source, ph.lang, ph.price, ph.day
        FROM price_history ph
        JOIN candidat c ON c.print_id = ph.print_id AND c.tier = ph.tier
         AND c.source = ph.source AND c.lang = ph.lang
       ORDER BY ph.print_id, ph.tier, ph.source, ph.lang, ph.day DESC
    ), ins AS (
      INSERT INTO price_history (print_id, day, tier, source, lang, market, price, sale_count, currency)
      SELECT c.print_id, CURRENT_DATE, c.tier, c.source, c.lang, c.market, c.spot, c.sale_count, c.currency
        FROM candidat c
        LEFT JOIN dernier d
          ON d.print_id = c.print_id AND d.tier = c.tier AND d.source = c.source AND d.lang = c.lang
       WHERE d.print_id IS NULL
          OR d.price IS DISTINCT FROM c.spot
          OR d.day <= CURRENT_DATE - 7
      ON CONFLICT (print_id, day, tier, source, lang) DO UPDATE
        SET price = EXCLUDED.price, sale_count = EXCLUDED.sale_count,
            market = EXCLUDED.market, currency = EXCLUDED.currency
      RETURNING 1
    ) SELECT count(*)::int AS n FROM ins`
  console.log('rows history (changements + controle hebdo):', r5[0].n)
  const rAmb = await sql`SELECT count(*)::int AS n FROM (SELECT 1 FROM price_matrix WHERE print_id IS NOT NULL AND spot IS NOT NULL GROUP BY print_id, tier, source, split_part(kodo_card_id,'-',1) HAVING count(*) > 1) z`
  console.log('groupes ambigus NON snapshotes (multi-variant meme langue):', rAmb[0].n)
  // SNAPSHOT FR PUR : archive la tranche country.FR.language.FR sous source='cardmarket_fr'
  // (PK price_history = print_id,day,tier,source,lang -> la langue est dans la cle
  //  depuis 11/08 ; market reste descriptif et vaut toujours 'FR' pour cette source).
  // Garde-fous: prix dans ]0, 100000] (rejette les annonces sentinelles type 999999),
  // dedoublonnage par (print,tier) en gardant le prix median pondere par saleCount.
  // ACCUMULE jour par jour -> densite future pour afficher les grades FR honnetement.
  const r6 = await sql`
    WITH ins AS (
    INSERT INTO price_history (print_id, day, tier, source, lang, market, price, sale_count, currency)
    SELECT t.print_id, CURRENT_DATE, t.tier, 'cardmarket_fr', 'fr', 'FR', t.price, t.sale_count, 'EUR'
    FROM (
      SELECT pm.print_id, pm.tier,
             ROUND(AVG((country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric), 2) AS price,
             SUM((country_breakdown->'FR'->'language'->'FR'->>'saleCount')::int) AS sale_count
      FROM price_matrix pm
      WHERE pm.print_id IS NOT NULL
        AND pm.market = 'EU'
        AND pm.country_breakdown->'FR'->'language'->'FR'->>'avg' IS NOT NULL
        AND (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric > 0
        AND (country_breakdown->'FR'->'language'->'FR'->>'avg')::numeric <= 100000
      GROUP BY pm.print_id, pm.tier
    ) t
    LEFT JOIN LATERAL (
      SELECT ph.price AS last_price, ph.day AS last_day FROM price_history ph
       WHERE ph.print_id = t.print_id AND ph.tier = t.tier AND ph.source = 'cardmarket_fr'
         AND ph.lang = 'fr'
       ORDER BY ph.day DESC LIMIT 1
    ) d ON true
    WHERE d.last_price IS NULL
       OR d.last_price IS DISTINCT FROM t.price
       OR d.last_day <= CURRENT_DATE - 7
    ON CONFLICT (print_id, day, tier, source, lang) DO UPDATE
      SET price = EXCLUDED.price, sale_count = EXCLUDED.sale_count
    RETURNING 1
    ) SELECT count(*)::int AS n FROM ins`
  console.log('rows history FR pur (country.FR.language.FR, source=cardmarket_fr):', r6[0].n)
  console.log('Signaux + history a jour.')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
