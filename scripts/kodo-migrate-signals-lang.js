// Migration: price_signals indexe par (print_id, lang) pour le prix par langue.
// Idempotent. A lancer si la table price_signals doit etre (re)mise au bon schema.
// Contexte: chaque carte existe en plusieurs langues (en/fr/jp), chacune avec son prix.
// Usage: node scripts/kodo-migrate-signals-lang.js
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  // 1. Colonne lang (minuscule: en/fr/jp, aligne sur k_cards.lang et split_part(kodo_card_id))
  await sql`ALTER TABLE price_signals ADD COLUMN IF NOT EXISTS lang text`

  // 2. Nettoyer d'eventuelles lignes en MAJUSCULE (heritage d'une migration anterieure)
  await sql`DELETE FROM price_signals WHERE lang IS NOT NULL AND lang = upper(lang) AND lang ~ '^[A-Z]+$'`

  // 3. Si la PK est encore (print_id) seul, la migrer vers (print_id, lang)
  const pk = await sql`
    SELECT array_agg(a.attname ORDER BY a.attnum) AS cols FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = 'price_signals'::regclass AND i.indisprimary`
  const cols = (pk[0] && pk[0].cols) || []
  if (!(cols.includes('print_id') && cols.includes('lang'))) {
    // lignes sans lang -> impossible de mettre NOT NULL; on les purge (dérivé, recalculable)
    await sql`DELETE FROM price_signals WHERE lang IS NULL`
    await sql`ALTER TABLE price_signals DROP CONSTRAINT IF EXISTS price_signals_pkey`
    await sql`ALTER TABLE price_signals ALTER COLUMN lang SET NOT NULL`
    await sql`ALTER TABLE price_signals ADD PRIMARY KEY (print_id, lang)`
    console.log('PK migree vers (print_id, lang)')
  } else {
    console.log('PK deja (print_id, lang) - rien a faire')
  }

  const check = await sql`SELECT lang, count(*) AS n FROM price_signals GROUP BY lang ORDER BY n DESC`
  console.log('Signaux par langue:', JSON.stringify(check))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
