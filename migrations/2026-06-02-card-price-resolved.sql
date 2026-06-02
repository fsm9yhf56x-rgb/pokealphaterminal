-- Vue de résolution prix par carte, par langue, depuis la BONNE source.
--   EN : graded_prices_ppt.raw_market_usd (×0.92 → EUR)
--   JP : (à brancher quand PPT japanese sera importé — même logique)
--   FR : (à brancher sur PokeTrace via card_aliases.poketrace_id)
--
-- Entrée logique : (set_id tcgdex, card_number nu, lang) — format portfolio_cards.
-- Pont : set_aliases (internal_set_id = '{lang}-{set_id}') → name → graded_prices_ppt.set_name
-- Normalisation : ltrim(split_part(ppt.card_number,'/',1),'0') = card_number nu
-- Dédup : DISTINCT ON (préfère le nom sans parenthèse, sinon prix max)

CREATE OR REPLACE VIEW card_price_resolved AS
SELECT DISTINCT ON (sa.internal_set_id, num.n)
  regexp_replace(sa.internal_set_id, '^[a-z]+-', '') AS set_id,
  num.n                                              AS card_number,
  'EN'::text                                         AS lang,
  g.card_name                                        AS resolved_name,
  'ppt'::text                                        AS source,
  g.raw_market_usd                                   AS price_usd,
  ROUND((g.raw_market_usd * 0.92)::numeric, 2)       AS price_eur,
  g.graded_updated_at                                AS as_of
FROM set_aliases sa
JOIN graded_prices_ppt g
  ON g.set_name = sa.name
 AND g.language = 'english'
 AND g.raw_market_usd IS NOT NULL
CROSS JOIN LATERAL (
  SELECT ltrim(split_part(g.card_number, '/', 1), '0') AS n
) num
WHERE sa.lang = 'EN'
ORDER BY sa.internal_set_id, num.n,
         (g.card_name ILIKE '%(%') ASC,
         g.raw_market_usd DESC;
