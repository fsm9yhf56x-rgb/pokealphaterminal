import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const url = readFileSync('.env.local','utf8').match(/DATABASE_URL="?([^"\n]+)/)[1]
const sql = neon(url)

console.log('━━ 1. CREATE sets + set_variants (additif, idempotent)')
await sql`CREATE TABLE IF NOT EXISTS sets (
  id text PRIMARY KEY,
  name_en text, name_fr text, name_jp text,
  tcgdex_slug text,
  lang_available text[] NOT NULL DEFAULT '{}',
  release_date date,
  era text, series text,
  total_cards integer,
  logo_url text, symbol_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`
await sql`CREATE TABLE IF NOT EXISTS set_variants (
  id text PRIMARY KEY,             -- 'base1-1st', 'base1-shadowless'
  set_id text NOT NULL REFERENCES sets(id),
  variant text NOT NULL,           -- '1st', 'shadowless', 'shadowless-ns'
  name text
)`

console.log('━━ 2. Peuplement depuis tcg_sets (fusion en/fr/jp par slug nu)')
// Slug nu = id sans prefixe langue ; variantes (-1st, -shadowless...) detectees ensuite
await sql`
  INSERT INTO sets (id, name_en, name_fr, name_jp, lang_available, release_date, era, series, total_cards, logo_url, symbol_url, tcgdex_slug)
  SELECT
    base_slug,
    max(name) FILTER (WHERE lang_pref = 'en'),
    max(name) FILTER (WHERE lang_pref = 'fr'),
    max(name) FILTER (WHERE lang_pref = 'jp'),
    array_agg(DISTINCT upper(lang_pref)),
    min(release_date),
    max(era), max(series), max(total_cards),
    max(logo_url), max(symbol_url),
    max(sa.tcgdex_slug)
  FROM (
    SELECT *,
      CASE WHEN id ~ '^(en|fr|jp)-' THEN split_part(id,'-',1) ELSE 'en' END AS lang_pref,
      CASE WHEN id ~ '^(en|fr|jp)-' THEN substring(id from 4) ELSE id END AS base_slug
    FROM tcg_sets
    WHERE id !~ '-(1st|shadowless|shadowless-ns|promo)$'
  ) t
  LEFT JOIN set_aliases sa ON sa.internal_set_id = t.id
  GROUP BY base_slug
  ON CONFLICT (id) DO NOTHING`

console.log('━━ 3. Variantes d edition')
await sql`
  INSERT INTO set_variants (id, set_id, variant, name)
  SELECT DISTINCT
    CASE WHEN id ~ '^(en|fr|jp)-' THEN substring(id from 4) ELSE id END,
    regexp_replace(CASE WHEN id ~ '^(en|fr|jp)-' THEN substring(id from 4) ELSE id END, '-(1st|shadowless|shadowless-ns|promo)$', ''),
    (regexp_match(id, '-(1st|shadowless|shadowless-ns|promo)$'))[1],
    name
  FROM tcg_sets
  WHERE id ~ '-(1st|shadowless|shadowless-ns|promo)$'
    AND regexp_replace(CASE WHEN id ~ '^(en|fr|jp)-' THEN substring(id from 4) ELSE id END, '-(1st|shadowless|shadowless-ns|promo)$', '') IN (SELECT id FROM sets)
  ON CONFLICT (id) DO NOTHING`

console.log('━━ 4. RAPPORT')
const n = await sql`SELECT count(*) FROM sets`
const v = await sql`SELECT count(*) FROM set_variants`
const langs = await sql`SELECT lang_available, count(*) FROM sets GROUP BY 1 ORDER BY 2 DESC LIMIT 6`
console.log('sets canoniques:', n[0].count, '| variantes:', v[0].count)
console.table(langs)
console.log('━━ Couverture portfolio : set_id du portfolio resolus dans sets/variants ?')
const cov = await sql`
  SELECT
    count(*) FILTER (WHERE s.id IS NOT NULL OR sv.id IS NOT NULL) AS resolus,
    count(*) FILTER (WHERE s.id IS NULL AND sv.id IS NULL AND pc.set_id IS NOT NULL) AS orphelins,
    count(*) FILTER (WHERE pc.set_id IS NULL) AS sans_set
  FROM portfolio_cards pc
  LEFT JOIN sets s ON s.id = pc.set_id
  LEFT JOIN set_variants sv ON sv.id = pc.set_id`
console.table(cov)
const orph = await sql`SELECT DISTINCT pc.set_id FROM portfolio_cards pc LEFT JOIN sets s ON s.id=pc.set_id LEFT JOIN set_variants sv ON sv.id=pc.set_id WHERE s.id IS NULL AND sv.id IS NULL AND pc.set_id IS NOT NULL LIMIT 15`
console.table(orph)
