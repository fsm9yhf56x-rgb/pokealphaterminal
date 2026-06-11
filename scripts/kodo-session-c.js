require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  console.log('=== 1. CREATION DES TABLES ===')
  await sql`CREATE TABLE k_sets (
    id text PRIMARY KEY,
    name text, name_fr text, name_jp text,
    series text, release_date date,
    langs text[] NOT NULL DEFAULT '{}',
    total_cards integer,
    tcgdex_slug text, poketrace_us_slug text, poketrace_eu_slug text, ppt_set_name text
  )`
  await sql`CREATE TABLE k_prints (
    id text PRIMARY KEY,
    set_id text NOT NULL REFERENCES k_sets(id),
    number text NOT NULL,
    variant text NOT NULL DEFAULT 'base',
    name_en text, rarity text,
    tcgplayer_id text, cardmarket_id text,
    poketrace_us_id text, poketrace_us_holo_id text,
    poketrace_eu_id text, poketrace_eu_holo_id text,
    ppt_card_id text
  )`
  await sql`CREATE INDEX idx_kp_set ON k_prints(set_id)`
  await sql`CREATE TABLE k_cards (
    id text PRIMARY KEY,
    print_id text NOT NULL REFERENCES k_prints(id),
    lang text NOT NULL,
    name_localized text,
    rarity text,
    image_url text,
    has_image boolean DEFAULT false
  )`
  await sql`CREATE INDEX idx_kc_print ON k_cards(print_id)`
  await sql`CREATE INDEX idx_kc_lang ON k_cards(lang)`
  console.log('OK k_sets, k_prints, k_cards')

  console.log('\n=== 2. BACKFILL k_sets ===')
  // core_id = set_id sans prefixe langue ; langs agregees
  const rs = await sql`
    INSERT INTO k_sets (id, name, langs, tcgdex_slug, poketrace_us_slug, poketrace_eu_slug)
    SELECT
      regexp_replace(c.set_id, '^(en|fr|jp)-', '') AS core_id,
      max(ts.name),
      array_agg(DISTINCT lower(c.lang)) FILTER (WHERE c.lang IS NOT NULL),
      max(sa.tcgdex_slug),
      max(km.us_slug), max(km.eu_slug)
    FROM tcg_cards c
    LEFT JOIN tcg_sets ts ON ts.id = c.set_id
    LEFT JOIN set_aliases sa ON sa.internal_set_id = c.set_id
    LEFT JOIN kodo_set_map km ON km.kodo_set_id = c.set_id
    WHERE c.set_id IS NOT NULL AND c.set_id <> 'en-obsidian-flames'
    GROUP BY core_id
    RETURNING id`
  console.log('k_sets:', rs.length)

  console.log('\n=== 3. BACKFILL k_prints (depuis EN prioritaire, puis FR/JP orphelins) ===')
  const rp = await sql`
    INSERT INTO k_prints (id, set_id, number, name_en, rarity)
    SELECT DISTINCT ON (regexp_replace(c.set_id, '^(en|fr|jp)-', '') || '-' || c.local_id)
      regexp_replace(c.set_id, '^(en|fr|jp)-', '') || '-' || c.local_id,
      regexp_replace(c.set_id, '^(en|fr|jp)-', ''),
      c.local_id,
      CASE WHEN c.lang = 'EN' THEN c.name END,
      c.rarity
    FROM tcg_cards c
    WHERE c.set_id IS NOT NULL AND c.local_id IS NOT NULL AND c.set_id <> 'en-obsidian-flames'
    ORDER BY regexp_replace(c.set_id, '^(en|fr|jp)-', '') || '-' || c.local_id,
      CASE c.lang WHEN 'EN' THEN 0 WHEN 'FR' THEN 1 ELSE 2 END
    RETURNING id`
  console.log('k_prints:', rp.length)

  console.log('\n=== 4. ABSORPTION source_refs -> k_prints (via cartes EN) ===')
  const ru = await sql`
    UPDATE k_prints kp SET
      tcgplayer_id = r.tcgplayer_id,
      cardmarket_id = r.cardmarket_id,
      poketrace_us_id = r.poketrace_us_id,
      poketrace_us_holo_id = r.poketrace_us_holo_id,
      poketrace_eu_id = r.poketrace_eu_id,
      poketrace_eu_holo_id = r.poketrace_eu_holo_id
    FROM source_refs r
    WHERE r.kodo_card_id LIKE 'en-%'
      AND kp.id = substring(r.kodo_card_id FROM 4)
    RETURNING kp.id`
  console.log('prints avec refs PokeTrace:', ru.length)
  const rj = await sql`
    UPDATE k_prints kp SET ppt_card_id = substring(c.id FROM 4)
    FROM tcg_cards c
    WHERE c.id LIKE 'jp-%' AND c.source = 'ppt'
      AND kp.id = regexp_replace(c.set_id, '^jp-', '') || '-' || c.local_id
    RETURNING kp.id`
  console.log('prints JP avec ppt_card_id:', rj.length)

  console.log('\n=== 5. BACKFILL k_cards (IDs identiques a tcg_cards) ===')
  const rc = await sql`
    INSERT INTO k_cards (id, print_id, lang, name_localized, rarity, image_url, has_image)
    SELECT c.id,
      regexp_replace(c.set_id, '^(en|fr|jp)-', '') || '-' || c.local_id,
      lower(c.lang), c.name, c.rarity, c.image_url, c.has_image
    FROM tcg_cards c
    JOIN k_prints kp ON kp.id = regexp_replace(c.set_id, '^(en|fr|jp)-', '') || '-' || c.local_id
    WHERE c.set_id IS NOT NULL AND c.local_id IS NOT NULL AND c.set_id <> 'en-obsidian-flames'
    ON CONFLICT (id) DO NOTHING
    RETURNING id`
  console.log('k_cards:', rc.length)

  console.log('\n=== 6. JOINTURE portfolio_cards ===')
  await sql`ALTER TABLE portfolio_cards ADD COLUMN IF NOT EXISTS k_card_id text`
  const rpf = await sql`
    UPDATE portfolio_cards p SET k_card_id = kc.id
    FROM k_cards kc
    WHERE p.set_id IS NOT NULL AND p.card_number IS NOT NULL
      AND kc.id = lower(p.lang) || '-' || p.set_id || '-' || p.card_number
    RETURNING p.id`
  console.log('portfolio_cards lies:', rpf.length)

  console.log('\n=== 7. VALIDATION ===')
  const v1 = await sql`SELECT
    (SELECT count(*) FROM k_sets) AS sets,
    (SELECT count(*) FROM k_prints) AS prints,
    (SELECT count(*) FROM k_cards) AS cards,
    (SELECT count(*) FROM tcg_cards WHERE set_id IS NOT NULL AND local_id IS NOT NULL AND set_id <> 'en-obsidian-flames') AS tcg_cards_eligibles`
  console.log(JSON.stringify(v1[0]))
  const v2 = await sql`SELECT lang, count(*) AS n FROM k_cards GROUP BY lang ORDER BY n DESC`
  console.log('Par langue:', JSON.stringify(v2))
  const v3 = await sql`SELECT count(*) AS multi FROM (
    SELECT print_id FROM k_cards GROUP BY print_id HAVING count(DISTINCT lang) >= 2) x`
  console.log('Prints multi-langues:', JSON.stringify(v3[0]))
  const v4 = await sql`SELECT count(*) AS orphelins FROM portfolio_cards
    WHERE k_card_id IS NULL AND set_id IS NOT NULL`
  console.log('Portfolio orphelins:', JSON.stringify(v4[0]))
  const v5 = await sql`SELECT id, print_id, lang, name_localized FROM k_cards
    WHERE id IN ('en-ex1-8','fr-ex1-8')`
  console.log('Temoin Hariyama EN+FR:', JSON.stringify(v5))
  const v6 = await sql`SELECT id, tcgplayer_id, poketrace_eu_id, ppt_card_id IS NOT NULL AS has_ppt
    FROM k_prints WHERE id = 'ex1-8'`
  console.log('Print ex1-8 refs:', JSON.stringify(v6))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
