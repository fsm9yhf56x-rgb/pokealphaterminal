-- Market Indices V2 (rolling 7d window, top N cards by value)
-- Date: 2026-05-07
-- Used by: src/lib/useMarketData.ts → fetchIndices()

-- Step 1: Resolver view (joins prices_snapshots ↔ card_aliases via tcgdex_card_ref OR poketrace_id)
CREATE OR REPLACE VIEW prices_canonical AS
SELECT
  ps.id,
  ps.card_ref,
  ps.source,
  ps.variant,
  ps.lang AS lang_snap,
  ps.condition,
  ps.price_avg,
  ps.price_low,
  ps.price_high,
  ps.price_median,
  ps.nb_sales,
  ps.fetched_at,
  COALESCE(ca_tcg.canonical_id, ca_pt.canonical_id) AS canonical_id,
  COALESCE(ca_tcg.set_slug,     ca_pt.set_slug)     AS set_slug,
  COALESCE(ca_tcg.lang,         ca_pt.lang)         AS lang_canon,
  COALESCE(ca_tcg.rarity_normalized, ca_pt.rarity_normalized) AS rarity_normalized
FROM prices_snapshots ps
LEFT JOIN card_aliases ca_tcg ON ca_tcg.tcgdex_card_ref  = ps.card_ref
LEFT JOIN card_aliases ca_pt  ON ca_pt.poketrace_id::text = ps.card_ref;

-- Step 2: Indices view (4 indices: Vintage US, Modern FR, Modern EN, Japan)
DROP VIEW IF EXISTS market_indices_v1 CASCADE;

CREATE OR REPLACE VIEW market_indices_v1 AS
WITH
index_sets AS (
  SELECT 'vintage_us' as index_id, unnest(ARRAY[
    'gym-heroes', 'gym-challenge',
    'neo-genesis', 'neo-discovery', 'neo-revelation', 'neo-destiny',
    'legendary-collection', 'base-set-shadowless'
  ]) as set_slug, 'EN' as lang
  UNION ALL
  SELECT 'modern_fr', unnest(ARRAY[
    '151', 'voltage-eclatant', 'destinees-radieuses',
    'mega-evolution', 'styles-de-combat', 'primo-choc',
    'impulsion-turbo', 'rupture-turbo', 'vigueur-spectrale',
    'aventures-ensemble', 'impact-des-destins',
    'offensive-vapeur', 'generations'
  ]), 'FR'
  UNION ALL
  SELECT 'modern_en', unnest(ARRAY[
    '151', 'celestial-storm', 'sun-moon',
    'phantasmal-flames', 'evolutions',
    'mega-evolution', 'arceus', 'power-keepers',
    'triumphant', 'sandstorm', 'generations'
  ]), 'EN'
  UNION ALL
  SELECT 'japan', unnest(ARRAY[
    'vstar', 'ex'
  ]), 'JA'
),
prices_indexed AS (
  SELECT
    s.index_id,
    pc.canonical_id,
    pc.price_avg,
    pc.fetched_at,
    DATE(pc.fetched_at) as snap_day
  FROM prices_canonical pc
  JOIN index_sets s ON s.set_slug = pc.set_slug AND s.lang = pc.lang_canon
  WHERE pc.price_avg > 0
    AND pc.fetched_at > NOW() - INTERVAL '60 days'
),
anchor_days AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date as anchor_day
),
last_price_per_card_per_anchor AS (
  SELECT DISTINCT ON (a.anchor_day, p.index_id, p.canonical_id)
    a.anchor_day,
    p.index_id,
    p.canonical_id,
    p.price_avg as last_price
  FROM anchor_days a
  CROSS JOIN prices_indexed p
  WHERE p.fetched_at <= a.anchor_day + INTERVAL '1 day'
    AND p.fetched_at >= a.anchor_day - INTERVAL '7 days'
  ORDER BY a.anchor_day, p.index_id, p.canonical_id, p.fetched_at DESC
),
ranked_per_anchor AS (
  SELECT
    anchor_day, index_id, canonical_id, last_price,
    ROW_NUMBER() OVER (
      PARTITION BY anchor_day, index_id
      ORDER BY last_price DESC
    ) as rn
  FROM last_price_per_card_per_anchor
),
daily_index AS (
  SELECT
    anchor_day,
    index_id,
    AVG(last_price) as index_value,
    COUNT(*) as cards_count
  FROM ranked_per_anchor
  WHERE (index_id != 'japan' AND rn <= 100)
     OR (index_id  = 'japan' AND rn <= 50)
  GROUP BY anchor_day, index_id
)
SELECT
  index_id,
  (SELECT index_value FROM daily_index di2
    WHERE di2.index_id = di.index_id
    ORDER BY anchor_day DESC LIMIT 1) as current_value,
  CASE
    WHEN (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id AND di2.anchor_day = CURRENT_DATE - 1) > 0
    THEN ((
      (SELECT index_value FROM daily_index di2
        WHERE di2.index_id = di.index_id ORDER BY anchor_day DESC LIMIT 1)
      - (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id AND di2.anchor_day = CURRENT_DATE - 1)
      ) / (SELECT index_value FROM daily_index di2
            WHERE di2.index_id = di.index_id AND di2.anchor_day = CURRENT_DATE - 1)
      * 100)
    ELSE 0
  END as change_24h_pct,
  CASE
    WHEN (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id AND di2.anchor_day <= CURRENT_DATE - 7
          ORDER BY anchor_day DESC LIMIT 1) > 0
    THEN ((
      (SELECT index_value FROM daily_index di2
        WHERE di2.index_id = di.index_id ORDER BY anchor_day DESC LIMIT 1)
      - (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id AND di2.anchor_day <= CURRENT_DATE - 7
          ORDER BY anchor_day DESC LIMIT 1)
      ) / (SELECT index_value FROM daily_index di2
            WHERE di2.index_id = di.index_id AND di2.anchor_day <= CURRENT_DATE - 7
            ORDER BY anchor_day DESC LIMIT 1)
      * 100)
    ELSE 0
  END as change_7d_pct,
  CASE
    WHEN (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id ORDER BY anchor_day ASC LIMIT 1) > 0
    THEN ((
      (SELECT index_value FROM daily_index di2
        WHERE di2.index_id = di.index_id ORDER BY anchor_day DESC LIMIT 1)
      - (SELECT index_value FROM daily_index di2
          WHERE di2.index_id = di.index_id ORDER BY anchor_day ASC LIMIT 1)
      ) / (SELECT index_value FROM daily_index di2
            WHERE di2.index_id = di.index_id ORDER BY anchor_day ASC LIMIT 1)
      * 100)
    ELSE 0
  END as change_30d_pct,
  (SELECT array_agg(index_value ORDER BY anchor_day ASC)
    FROM daily_index di2
    WHERE di2.index_id = di.index_id) as sparkline,
  (SELECT cards_count FROM daily_index di2
    WHERE di2.index_id = di.index_id
    ORDER BY anchor_day DESC LIMIT 1) as cards_in_index
FROM daily_index di
GROUP BY index_id;
