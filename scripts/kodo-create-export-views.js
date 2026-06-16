// Kodo Engine — vues d'export pour rebuild-static-data.mjs (et future API).
// Reconstruisent la forme tcg_* attendue depuis le catalogue canonique k_*.
// Idempotent (DROP + CREATE). Lance apres tout changement de schema k_*.
// Usage: node scripts/kodo-create-export-views.js
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  // VUE CARTES : k_cards + k_prints -> forme tcg_cards.
  // set_id reconstruit avec prefixe langue (minuscule), local_id = number, lang en MAJ.
  await sql`DROP VIEW IF EXISTS k_cards_export`
  await sql`
    CREATE VIEW k_cards_export AS
    SELECT
      kc.id,
      kc.lang || '-' || kp.set_id AS set_id,
      kp.number AS local_id,
      kc.name_localized AS name,
      kc.rarity,
      kc.rarity_normalized,
      kc.image_url,
      kc.has_image,
      kc.source,
      upper(kc.lang) AS lang
    FROM k_cards kc
    JOIN k_prints kp ON kp.id = kc.print_id`
  console.log('Vue k_cards_export creee')

  // VUE SETS : k_sets (canonique) -> une ligne PAR langue via unnest(langs).
  // id reconstruit avec prefixe langue (minuscule), lang en MAJ pour le filtre.
  await sql`DROP VIEW IF EXISTS k_sets_export`
  await sql`
    CREATE VIEW k_sets_export AS
    SELECT
      l.lang || '-' || ks.id AS id,
      CASE l.lang
        WHEN 'fr' THEN COALESCE(ks.name_fr, ks.name)
        WHEN 'jp' THEN COALESCE(ks.name_jp, ks.name)
        ELSE ks.name
      END AS name,
      ks.logo_url,
      ks.series,
      ks.release_date,
      ks.total_cards,
      ks.source,
      upper(l.lang) AS lang
    FROM k_sets ks
    CROSS JOIN LATERAL unnest(ks.langs) AS l(lang)`
  console.log('Vue k_sets_export creee')

  // Verif
  const c = await sql`SELECT count(*) AS n FROM k_cards_export`
  const s = await sql`SELECT count(*) AS n FROM k_sets_export`
  console.log('k_cards_export:', c[0].n, '| k_sets_export:', s[0].n)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
