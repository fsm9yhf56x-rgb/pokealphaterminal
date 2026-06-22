// Kodo Engine — synchronisation catalogue AUTONOME : tcg_* -> k_*.
// Canonicalisation (kodo-session-c.js): core_id sans prefixe langue, print canonique
// DISTINCT ON priorite EN. CLE: k_cards.id = id tcg BRUT (jamais reconstruit). Idempotent.
// Capte tout nouveau set/carte. Pas d'exclusion. Regex en dur (sql.unsafe casse Neon HTTP).
// Usage: node scripts/kodo-sync-catalog.js
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  const START = Date.now()

  // ===== 1. SETS canoniques manquants (core_id = set sans prefixe langue) =====
  const rs = await sql`
    INSERT INTO k_sets (id, name, name_fr, name_jp, langs, tcgdex_slug, total_cards, source, logo_url, release_date, series)
    SELECT
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', ''),
      (array_agg(ts.name ORDER BY CASE WHEN c.lang='EN' THEN 0 ELSE 1 END))[1],
      (array_agg(ts.name) FILTER (WHERE c.lang='FR'))[1],
      (array_agg(ts.name) FILTER (WHERE c.lang='JP'))[1],
      array_agg(DISTINCT lower(c.lang)),
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', ''),
      max(ts.total_cards),
      min(ts.source),
      (array_remove(array_agg(ts.logo_url), NULL))[1],
      (array_remove(array_agg(ts.release_date ORDER BY ts.release_date), NULL))[1],
      (array_remove(array_agg(ts.series), NULL))[1]
    FROM tcg_cards c
    LEFT JOIN tcg_sets ts ON ts.id = c.set_id
    WHERE c.set_id IS NOT NULL
      AND regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') NOT IN (SELECT id FROM k_sets)
    GROUP BY regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '')
    ON CONFLICT (id) DO NOTHING
    RETURNING id`
  console.log('Sets canoniques ajoutes:', rs.length)

  // ===== 2. PRINTS canoniques manquants (core_set-number, DISTINCT ON priorite EN) =====
  const rp = await sql`
    INSERT INTO k_prints (id, set_id, number, name_en, rarity)
    SELECT DISTINCT ON (regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id)
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id,
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', ''),
      c.local_id,
      c.name,
      c.rarity
    FROM tcg_cards c
    WHERE c.set_id IS NOT NULL AND c.local_id IS NOT NULL
      AND (regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id) NOT IN (SELECT id FROM k_prints)
    ORDER BY
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id,
      CASE WHEN c.lang='EN' THEN 0 WHEN c.lang='FR' THEN 1 ELSE 2 END
    ON CONFLICT (id) DO NOTHING
    RETURNING id`
  console.log('Prints canoniques ajoutes:', rp.length)

  // ===== 3. CARTES manquantes — k_cards.id = c.id (ID TCG BRUT, jamais reconstruit) =====
  const rc = await sql`
    INSERT INTO k_cards (id, print_id, lang, name_localized, rarity, rarity_normalized, image_url, has_image, source)
    SELECT
      c.id,
      regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id,
      lower(c.lang), c.name, c.rarity, c.rarity_normalized, c.image_url, c.has_image, c.source
    FROM tcg_cards c
    JOIN k_prints kp ON kp.id = regexp_replace(c.set_id, '^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-', '') || '-' || c.local_id
    WHERE c.set_id IS NOT NULL AND c.local_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM k_cards kc WHERE kc.id = c.id)
    ON CONFLICT (id) DO NOTHING
    RETURNING id`
  console.log('Cartes ajoutees:', rc.length)

  // MAJ images des cartes existantes (id = c.id brut)
  const imgUpd = await sql`
    UPDATE k_cards kc SET has_image = c.has_image, image_url = c.image_url
    FROM tcg_cards c
    WHERE kc.id = c.id
      AND (kc.has_image IS DISTINCT FROM c.has_image OR kc.image_url IS DISTINCT FROM c.image_url)`
  console.log('Images mises a jour:', imgUpd.count ?? 0)

  const f = await sql`SELECT
    (SELECT count(*) FROM k_sets) AS sets,
    (SELECT count(*) FROM k_prints) AS prints,
    (SELECT count(*) FROM k_cards) AS cards,
    (SELECT count(*) FROM tcg_cards WHERE set_id IS NOT NULL AND local_id IS NOT NULL) AS tcg`
  console.log('\n=== ETAT FINAL ===', JSON.stringify(f[0]))
  console.log('Duree:', ((Date.now()-START)/1000).toFixed(1) + 's')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
