/**
 * Source de verite UNIQUE du pricing portfolio (Kodo Engine).
 *
 * Valorise chaque ligne de portfolio_cards selon SON exemplaire :
 *  - Gradee ("PSA 10", "BGS 8.5"...) -> tier exact {COMPANY}_{GRADE} de price_matrix
 *  - Raw -> tier d'etat (NEAR_MINT par defaut)
 *  - Carte FR raw NEAR_MINT -> hierarchie : cote FR -> Cardmarket EU (AGGREGATED) -> fair value
 *  - Gradee FR sans sold -> ASK decote x0.88 : eBay FR (annonces réelles) puis Cardmarket FR (nettoyé)
 *  - Fallback ultime -> fair value (price_basis le trace)
 *  - Garde-fous: NM aberrant (insufficient_data) et gradee sans son tier (graded_no_data) -> NULL
 *
 * PRINCIPE OBJET/MARCHE (critique) :
 *  Une carte FR et une carte EN sont DEUX OBJETS distincts (fr-bw6-19 vs en-bw6-19),
 *  donc DEUX marches. On joint price_matrix par kodo_card_id (= kc.id), JAMAIS par
 *  print_id : print_id est partage entre langues -> une carte FR attraperait le prix
 *  US de la carte EN. price_signals est filtre par langue (clé print_id + lang).
 *
 * ETAGE CARDMARKET EU (raw FR) :
 *  Cardmarket agrege son prix raw sous tier='AGGREGATED'. Pour une carte raw FR en
 *  NEAR_MINT, on l'accepte comme prix EU reel, APRES la cote FR et AVANT le fair value.
 *  Basis dedie 'cardmarket_eu'.
 *
 * GRADÉ FR (asks, aucun sold FR n'existe) :
 *  best_ask lit les ASKS gradés x0.88, source prioritaire eBay FR (annonces réelles,
 *  médiane n>=2) puis Cardmarket FR (source 'cardmarket_fr' = asks NETTOYÉS par
 *  clean-cardmarket-graded-fr.mjs : plafond valeur-dépendant + monotonie). Les asks
 *  Cardmarket bruts (cardmarket_unsold) ne sont JAMAIS lus ici (pollués par prix de blocage).
 *
 * Appele par:
 *  - cron/portfolio-prices (scope vide = tout le portfolio, nuit)
 *  - db/query apres insert (scope { ids } = cartes ajoutees, immediat)
 *
 * Le CTE est IDENTIQUE dans les deux cas (meme regle partout). Seul le filtre de scope change.
 */

import { buildFrByCondition, rawTierFromCondition } from '@/lib/prices/fr-by-condition'

type SqlTag = (strings: TemplateStringsArray, ...values: any[]) => Promise<any[]>

export interface PricedRow {
  id: string
  current_price: number | null
  price_basis: string | null
}

/**
 * Price les lignes de portfolio_cards et met a jour current_price + price_basis.
 * @param sql  client neon (tagged template)
 * @param scope  { ids } pour cibler des lignes precises ; {} pour tout le portfolio
 * @returns les lignes mises a jour (id, current_price, price_basis)
 */
export async function priceCards(sql: SqlTag, scope: { ids?: string[] } = {}): Promise<PricedRow[]> {
  // Filtre de scope SANS concatenation SQL: si ids fourni, on borne par ANY($ids).
  // scopeAll=true court-circuite le filtre (tout le portfolio).
  const ids = scope.ids ?? null
  const scopeAll = ids === null

  await sql`ALTER TABLE portfolio_cards ADD COLUMN IF NOT EXISTS price_basis text`

  const rows = await sql`
    WITH fx AS (
      SELECT rate FROM fx_rates
      WHERE from_currency = 'USD' AND to_currency = 'EUR'
      ORDER BY rate_date DESC LIMIT 1
    ),
    resolved AS (
      SELECT pc.id AS pc_id,
             t.tier AS wanted_tier,
             COALESCE(best.spot, best_ask.spot * 0.88) AS spot,
             COALESCE(best.currency, best_ask.currency) AS currency,
             -- Trace la provenance du spot retenu (pour un basis honnete).
             CASE
               WHEN best.spot IS NOT NULL AND best.best_tier = 'EXCELLENT' AND t.tier = 'GOOD' THEN 'GOOD~EX'
               WHEN best.spot IS NOT NULL THEN best.best_tier
               ELSE 'EBAY_FR_ASK'
             END AS spot_tier,
             kc.lang,
             ps.cote_fr_eur, ps.fair_value_eur, ps.fair_value_method
      FROM portfolio_cards pc
      JOIN k_cards kc ON kc.id = pc.k_card_id
      -- price_signals est clé par (print_id, lang) : on filtre la langue de l'objet
      -- pour ne jamais mélanger le fair_value FR avec celui d'une autre langue.
      LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
      LEFT JOIN LATERAL (SELECT rarity AS r FROM k_prints WHERE id = kc.print_id) kc_rarity ON true
      CROSS JOIN LATERAL (
        SELECT CASE
          -- Gradee avec societe + note explicites -> tier exact {COMPANY}_{GRADE} (ex CCC_9_5)
          WHEN pc.graded = true AND pc.grade_company IS NOT NULL AND pc.grade_value IS NOT NULL
            THEN upper(pc.grade_company) || '_' || replace(replace(trim(pc.grade_value::text), ' ', '_'), '.', '_')
          -- Gradee dont la note est dans condition (ancien format "PSA 8", "CCC 9.5")
          WHEN pc.graded = true AND pc.condition ~* '^(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA|AOG|GSG|PGS)[ _]?[0-9]'
            THEN upper(replace(replace(trim(pc.condition), ' ', '_'), '.', '_'))
          -- Gradee avec societe connue mais note absente partout -> tier fantome (graded_no_data)
          WHEN pc.graded = true THEN 'GRADED_UNKNOWN'
          -- Condition prefixee societe (carte non marquee graded mais condition "PSA 10")
          WHEN pc.condition ~* '^(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA)[ _]'
            THEN upper(replace(replace(trim(pc.condition), ' ', '_'), '.', '_'))
          WHEN upper(coalesce(pc.condition,'')) IN ('NM','NEAR MINT','NEAR_MINT') THEN 'NEAR_MINT'
          WHEN upper(coalesce(pc.condition,'')) IN ('EX','EXCELLENT') THEN 'EXCELLENT'
          WHEN upper(coalesce(pc.condition,'')) IN ('GD','GOOD') THEN 'EXCELLENT'
          WHEN upper(coalesce(pc.condition,'')) IN ('LP','LIGHTLY PLAYED','LIGHTLY_PLAYED') THEN 'LIGHTLY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('MP','MODERATELY PLAYED','MODERATELY_PLAYED') THEN 'MODERATELY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('HP','HEAVILY PLAYED','HEAVILY_PLAYED') THEN 'HEAVILY_PLAYED'
          WHEN upper(coalesce(pc.condition,'')) IN ('DMG','DAMAGED') THEN 'DAMAGED'
          ELSE 'NEAR_MINT'
        END AS tier,
        CASE
          WHEN pc.variant ILIKE '%holo%' THEN 'Holofoil'
          WHEN pc.variant ILIKE '%reverse%' THEN 'Reverse_Holofoil'
          WHEN pc.variant IS NOT NULL AND pc.variant <> '' THEN 'Normal'
          WHEN kc_rarity.r ILIKE '%holo%' THEN 'Holofoil'
          ELSE 'Normal'
        END AS vmatch
      ) t
      LEFT JOIN LATERAL (
        -- SOLD prioritaire. Jointure par kodo_card_id (= l'objet FR/EN/JP), JAMAIS
        -- par print_id (partagé entre langues -> fuite d'un prix US sur une carte FR).
        -- Etage Cardmarket EU : pour une carte raw FR en NEAR_MINT, on accepte aussi
        -- le tier AGGREGATED (prix agrégé Cardmarket, is_asking=false) comme prix EU.
        SELECT pm.spot * (CASE WHEN t.tier = 'GOOD' AND pm.tier = 'EXCELLENT' THEN 0.90 ELSE 1 END) AS spot,
               pm.currency, pm.tier AS best_tier, pm.source AS best_source
        FROM price_matrix pm
        WHERE (
            pm.kodo_card_id = kc.id
            -- Échelle par état (kodo_state) : écrite par print, sans langue.
            -- Référence EU partagée FR/EN — priorité inférieure aux ventes exactes.
            OR (pm.source = 'kodo_state' AND pm.market = 'EU' AND pm.print_id = kc.print_id)
          )
          AND (
            pm.tier = t.tier
            OR (kc.lang = 'fr' AND t.tier = 'NEAR_MINT' AND pm.tier = 'AGGREGATED')
            OR (t.tier = 'GOOD' AND pm.tier = 'EXCELLENT' AND pm.source = 'kodo_state')
          )
          AND pm.is_asking = false
          AND pm.spot IS NOT NULL
        ORDER BY
          CASE WHEN pm.kodo_card_id = kc.id THEN 0 ELSE 1 END,
          CASE WHEN pm.tier = t.tier THEN 0 ELSE 1 END,
          CASE WHEN pm.variant = t.vmatch THEN 0 ELSE 1 END,
          CASE
            WHEN kc.lang = 'jp' THEN
              CASE pm.source WHEN 'ppt_tcgplayer' THEN 0 WHEN 'ppt_ebay' THEN 1 ELSE 2 END
            ELSE
              CASE pm.source WHEN 'tcgplayer' THEN 0 WHEN 'ppt_tcgplayer' THEN 1
                             WHEN 'ebay' THEN 2 WHEN 'ppt_ebay' THEN 3
                             WHEN 'cardmarket' THEN 4 ELSE 5 END
          END,
          pm.sale_count DESC NULLS LAST,
          pm.as_of DESC
        LIMIT 1
      ) best ON true
      LEFT JOIN LATERAL (
        -- FALLBACK ASK (gradé FR) : aucun sold gradé FR n'existe. Asks x0.88.
        -- Priorité 1 : eBay FR (annonces réelles individuelles, médiane n>=2).
        -- Priorité 2 : Cardmarket FR (source 'cardmarket_fr' = asks NETTOYÉS :
        --   plafond valeur-dépendant + monotonie via clean-cardmarket-graded-fr.mjs).
        -- Les asks bruts 'cardmarket_unsold' ne sont JAMAIS lus ici (prix de blocage).
        SELECT pm.spot, pm.currency
        FROM price_matrix pm
        WHERE pm.kodo_card_id = kc.id
          AND pm.tier = t.tier
          AND pm.is_asking = true
          AND pm.source IN ('ebay_fr','cardmarket_fr')
          AND pm.spot IS NOT NULL
          AND pm.spot > 0
        ORDER BY
          CASE pm.source WHEN 'ebay_fr' THEN 0 ELSE 1 END,  -- eBay FR (réel) avant Cardmarket
          CASE WHEN pm.variant = t.vmatch THEN 0 ELSE 1 END,
          pm.sale_count DESC NULLS LAST,
          pm.as_of DESC
        LIMIT 1
      ) best_ask ON true
      WHERE (${scopeAll} OR pc.id = ANY(${ids as any}))
    )
    UPDATE portfolio_cards pc
    SET current_price = v.price_eur,
        price_basis = v.basis,
        updated_at = now()
    FROM (
      SELECT r.pc_id,
        CASE
          WHEN r.wanted_tier IN ('NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.fair_value_method = 'insufficient_data'
            AND r.spot IS NULL THEN NULL
          WHEN r.wanted_tier NOT IN ('NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.spot IS NULL THEN NULL
          WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL
            THEN ROUND(r.cote_fr_eur::numeric, 2)
          WHEN r.spot IS NOT NULL THEN
            ROUND((CASE WHEN r.currency = 'EUR' THEN r.spot
                        ELSE r.spot * (SELECT rate FROM fx) END)::numeric, 2)
          ELSE ROUND(r.fair_value_eur::numeric, 2)
        END AS price_eur,
        CASE
          WHEN r.wanted_tier IN ('NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.fair_value_method = 'insufficient_data' THEN 'insufficient_data'
          WHEN r.wanted_tier NOT IN ('NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
            AND r.spot IS NULL THEN 'graded_no_data'
          WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL THEN 'cote_fr'
          -- Prix issu de l'agrégat Cardmarket EU (carte raw FR) : basis dédié, honnête.
          WHEN r.spot IS NOT NULL AND r.spot_tier = 'AGGREGATED' THEN 'cardmarket_eu'
          WHEN r.spot IS NOT NULL THEN 'tier:' || r.wanted_tier
          WHEN r.fair_value_eur IS NOT NULL THEN 'fair_value_fallback'
          ELSE NULL
        END AS basis
      FROM resolved r
    ) v
    WHERE v.pc_id = pc.id
      AND (v.price_eur IS NOT NULL OR v.basis IN ('insufficient_data','graded_no_data'))
      AND (pc.current_price IS DISTINCT FROM v.price_eur OR pc.price_basis IS DISTINCT FROM v.basis)
    RETURNING pc.id, pc.current_price, pc.price_basis
  `
  // SCELLE. Un display n'a pas de k_card_id : le JOIN k_cards ci-dessus (INNER)
  // l'ecartait, son current_price restait fige a la valeur d'ajout pendant que
  // les cartes se rafraichissaient chaque nuit.
  //
  // Jointure sur la CLE PRIMAIRE reconstruite (lang-set-sku), pas sur le triplet
  // de colonnes : 195 produits EN partagent (en, tin, 2374), le fourre-tout des
  // produits PPT non rattaches au pont kodo_set_id. Un JOIN sur trois colonnes
  // dupliquerait ces lignes et gonflerait la valeur du portefeuille.
  //
  // market_eur est deja en euros pour les deux marches (US converti a l'ingest),
  // donc aucun FX a appliquer ici.
  const sealedRows = await sql`
    UPDATE portfolio_cards pc
    SET current_price = ROUND(sp.market_eur::numeric, 2),
        price_basis = 'sealed:' || sp.method,
        updated_at = now()
    FROM sealed_prices sp
    WHERE pc.card_number = 'SEALED'
      AND sp.sealed_id = lower(pc.lang) || '-' || pc.set_id || '-' || pc.card_type
      AND sp.market_eur IS NOT NULL
      AND (${scopeAll} OR pc.id = ANY(${ids as any}))
      AND (pc.current_price IS DISTINCT FROM ROUND(sp.market_eur::numeric, 2)
           OR pc.price_basis IS DISTINCT FROM 'sealed:' || sp.method)
    RETURNING pc.id, pc.current_price, pc.price_basis
  `

  // ── PASSE FR PAR ÉTAT : parité stricte avec la fiche (MÊME lib) ──
  const frTargets = await sql`
    SELECT pc.id, pc.k_card_id, pc.condition, ps.cote_fr_eur, ps.fair_value_eur
    FROM portfolio_cards pc
    JOIN k_cards kc ON kc.id = pc.k_card_id
    LEFT JOIN price_signals ps ON ps.print_id = kc.print_id AND lower(ps.lang) = lower(kc.lang)
    WHERE lower(kc.lang) = 'fr' AND coalesce(pc.graded, false) = false
      AND (${scopeAll} OR pc.id = ANY(${ids as any}))
  ` as any[]
  if (frTargets.length) {
    const cardIds = [...new Set(frTargets.map((t) => t.k_card_id).filter(Boolean))]
    const mrows = await sql`
      SELECT kodo_card_id, tier, source, spot, sale_count, country_breakdown
      FROM price_matrix
      WHERE kodo_card_id = ANY(${cardIds as any}) AND spot IS NOT NULL AND spot > 0
    ` as any[]
    const byCard = new Map<string, any[]>()
    for (const m of mrows) {
      const k = String(m.kodo_card_id)
      if (!byCard.has(k)) byCard.set(k, [])
      byCard.get(k)!.push(m)
    }
    for (const t of frTargets) {
      const rowsForCard = byCard.get(String(t.k_card_id)) ?? []
      if (!rowsForCard.length) continue
      const coteRef = t.cote_fr_eur != null ? Number(t.cote_fr_eur)
        : (t.fair_value_eur != null ? Number(t.fair_value_eur) : null)
      const tier = rawTierFromCondition(t.condition)
      const hit = buildFrByCondition(rowsForCard, coteRef)[tier]
      if (!hit) continue
      const basis = 'fr_cond:' + tier + (hit.derived ? '~' : '')
      await sql`UPDATE portfolio_cards SET current_price = ${hit.price}, price_basis = ${basis}, updated_at = now() WHERE id = ${t.id}`
    }
  }

  // ── PLANCHER GRADÉ : aucune vente à CETTE note, mais une note INFÉRIEURE de
  // la MÊME société existe. Un PSA 10 vaut au moins un PSA 8 → plancher honnête
  // (ask ×0.88 comme partout), basis 'graded_floor:{tier}' → l'UI affiche "≥".
  // Jamais de cross-société (un CCC 9 n'est pas un PSA 9).
  await sql`
    WITH cible AS (
      SELECT pc.id, pc.k_card_id,
             upper(coalesce(pc.grade_company, split_part(pc.condition, ' ', 1))) AS soc
      FROM portfolio_cards pc
      WHERE pc.graded = true
        AND pc.current_price IS NULL
        AND (${scopeAll} OR pc.id = ANY(${ids as any}))
    ),
    plancher AS (
      SELECT DISTINCT ON (c.id) c.id, pm.tier, pm.spot
      FROM cible c
      JOIN price_matrix pm ON pm.kodo_card_id = c.k_card_id
      WHERE pm.spot > 0
        AND pm.tier ~ '^(PSA|BGS|CGC|SGC|CCC|PCA)_[0-9]+(_[0-9])?$'
        AND split_part(pm.tier, '_', 1) = c.soc
        AND pm.source IN ('ebay_fr', 'cardmarket_fr')
      ORDER BY c.id,
               replace(substring(pm.tier from position('_' in pm.tier) + 1), '_', '.')::numeric DESC,
               pm.as_of DESC
    )
    UPDATE portfolio_cards pc
    SET current_price = ROUND((p.spot * 0.88)::numeric, 2),
        price_basis = 'graded_floor:' || p.tier,
        updated_at = now()
    FROM plancher p
    WHERE pc.id = p.id
  `


  // Les lignes renvoyées doivent refléter la passe FR (sinon un appelant qui fait
  // confiance au retour verrait le prix d'avant).
  if (frTargets.length) {
    const touched = frTargets.map((t) => t.id)
    const fresh = await sql`
      SELECT id, current_price, price_basis FROM portfolio_cards WHERE id = ANY(${touched as any})
    ` as any[]
    const fmap = new Map(fresh.map((f) => [String(f.id), f]))
    for (const r of rows as any[]) {
      const f = fmap.get(String(r.id))
      if (!f) continue
      r.current_price = f.current_price == null ? null : Number(f.current_price)
      r.price_basis = f.price_basis
    }
  }

  return ([...(rows as any[]), ...(sealedRows as any[])]).map((r) => ({
    id: r.id,
    current_price: r.current_price != null ? Number(r.current_price) : null,
    price_basis: r.price_basis ?? null,
  }))
}
