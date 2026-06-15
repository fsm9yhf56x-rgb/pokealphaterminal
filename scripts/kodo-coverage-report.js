// Kodo Engine — rapport de couverture (lecture seule)
require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)

;(async () => {
  console.log('=== KODO ENGINE — RAPPORT DE COUVERTURE ===\n')

  // 1. Vue d'ensemble
  const matrix = await sql`SELECT count(*) AS rows, count(DISTINCT kodo_card_id) AS cards, count(DISTINCT print_id) AS prints FROM price_matrix`
  const sig = await sql`SELECT count(*) AS total, count(fair_value_eur) AS with_fv, count(cote_fr_eur) AS with_cote_fr, count(grade_ev_psa10_eur) AS with_grade_ev FROM price_signals`
  console.log('MATRICE:', JSON.stringify(matrix[0]))
  console.log('SIGNAUX:', JSON.stringify(sig[0]))

  // 2. Couverture par langue.
  //    EN/JP: lignes matrice par kodo_card_id.
  //    FR: cote_fr_eur dans price_signals (les cartes FR partagent le print EN via fr-sibling,
  //        leur cote vient du breakdown Cardmarket FR — pas de ligne matrice fr-* dediee).
  const enjp = await sql`
    SELECT substring(c.id from '^[a-z]+') AS lang,
      count(DISTINCT c.id) AS catalogue,
      count(DISTINCT pm.kodo_card_id) AS avec_prix
    FROM tcg_cards c
    LEFT JOIN price_matrix pm ON pm.kodo_card_id = c.id
    WHERE substring(c.id from '^[a-z]+') IN ('en','jp')
    GROUP BY 1 ORDER BY 1`
  console.log('\nCOUVERTURE PAR LANGUE:')
  for (const r of enjp) {
    const pct = r.catalogue > 0 ? (100*r.avec_prix/r.catalogue).toFixed(1) : '0'
    console.log('  ', (r.lang||'?').padEnd(6), r.avec_prix + '/' + r.catalogue, '(' + pct + '%)')
  }
  // FR via cote_fr_eur
  const frCat = await sql`SELECT count(*) AS n FROM tcg_cards WHERE id LIKE 'fr-%'`
  const frCote = await sql`SELECT count(DISTINCT kc.id) AS n FROM k_cards kc
    JOIN price_signals ps ON ps.print_id = kc.print_id
    WHERE kc.id LIKE 'fr-%' AND ps.cote_fr_eur IS NOT NULL`
  const frPriced = await sql`SELECT count(DISTINCT kc.id) AS n FROM k_cards kc
    JOIN price_signals ps ON ps.print_id = kc.print_id
    WHERE kc.id LIKE 'fr-%' AND ps.fair_value_eur IS NOT NULL`
  const frPct = frCat[0].n > 0 ? (100*frPriced[0].n/frCat[0].n).toFixed(1) : '0'
  console.log('   fr     ' + frPriced[0].n + '/' + frCat[0].n + ' (' + frPct + '% via fair value EN partage) | dont ' + frCote[0].n + ' avec cote FR specifique')

  // 3. Couverture variants (combien de prints par type de variant)
  const byVar = await sql`SELECT variant, count(DISTINCT print_id) AS prints, count(*) AS lignes FROM price_matrix GROUP BY 1 ORDER BY lignes DESC`
  console.log('\nVARIANTS DANS LA MATRICE:')
  for (const r of byVar) console.log('  ', (r.variant||'?').padEnd(22), r.prints + ' prints,', r.lignes + ' lignes')

  // 4. Profondeur gradée (cartes avec au moins 1 prix PSA/BGS/CGC)
  const graded = await sql`SELECT count(DISTINCT kodo_card_id) AS n FROM price_matrix WHERE tier ~ '^(PSA|BGS|CGC|SGC|ACE|TAG)_'`
  console.log('\nPROFONDEUR GRADEE: ' + graded[0].n + ' cartes avec >=1 prix gradé')

  // 5. Sources actives
  const src = await sql`SELECT source, count(*) AS n FROM price_matrix GROUP BY 1 ORDER BY n DESC`
  console.log('\nSOURCES:')
  for (const r of src) console.log('  ', r.source.padEnd(18), r.n)

  // 6. Top 15 gros sets EN: couverture
  const sets = await sql`
    SELECT c.set_id, count(DISTINCT c.id) AS catalogue, count(DISTINCT pm.kodo_card_id) AS avec_prix
    FROM tcg_cards c LEFT JOIN price_matrix pm ON pm.kodo_card_id = c.id
    WHERE c.id LIKE 'en-%'
    GROUP BY c.set_id HAVING count(DISTINCT c.id) > 100
    ORDER BY count(DISTINCT c.id) DESC LIMIT 15`
  console.log('\nGROS SETS EN (>100 cartes):')
  for (const r of sets) {
    const pct = (100*r.avec_prix/r.catalogue).toFixed(0)
    console.log('  ', r.set_id.padEnd(16), r.avec_prix + '/' + r.catalogue, '(' + pct + '%)', pct < 90 ? '⚠️' : '✓')
  }
})().catch(e => console.error('ERR:', e.message))
