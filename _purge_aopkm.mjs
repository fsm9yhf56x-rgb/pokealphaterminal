import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
const url = readFileSync('.env.local','utf8').match(/DATABASE_URL="?([^"\n]+)/)[1]
const sql = neon(url)

const count = async (t, c) => Number((await sql.query(`SELECT count(*) n FROM "${t}" WHERE "${c}" LIKE 'aopkm%'`))[0].n)

// Suppression par lots de 25k (regle Neon), boucle jusqu'a zero
const purge = async (t, c) => {
  let total = 0
  while (true) {
    const r = await sql.query(
      `DELETE FROM "${t}" WHERE ctid IN (SELECT ctid FROM "${t}" WHERE "${c}" LIKE 'aopkm%' LIMIT 25000)`)
    const n = r.length ?? 0
    // neon retourne le nb de lignes via rowCount selon le mode; on re-compte pour etre sur
    const left = await count(t, c)
    total = left
    console.log(`${t}: reste ${left}`)
    if (left === 0) break
  }
  return total
}

console.log('━━ AVANT')
for (const [t,c] of [['psa_card_mappings','tcg_card_id'],['prices_canonical','tcg_card_id'],['tcg_cards','set_id'],['tcg_sets','id']])
  console.log(`${t}: ${await count(t,c)}`)

console.log('━━ 1. Carte portfolio orpheline → set_id NULL (carte conservee)')
await sql`UPDATE portfolio_cards SET set_id = NULL WHERE set_id LIKE 'aopkm%'`

console.log('━━ 2. psa_card_mappings (re-scrape PPT deja planifie)')
await purge('psa_card_mappings','tcg_card_id')

console.log('━━ 3. prices_canonical (snapshots de cartes supprimees uniquement)')
await purge('prices_canonical','tcg_card_id')

console.log('━━ 4. tcg_cards')
await purge('tcg_cards','set_id')

console.log('━━ 5. tcg_sets')
await purge('tcg_sets','id')

console.log('━━ APRES (tout doit etre 0)')
for (const [t,c] of [['psa_card_mappings','tcg_card_id'],['prices_canonical','tcg_card_id'],['tcg_cards','set_id'],['tcg_sets','id'],['portfolio_cards','set_id']])
  console.log(`${t}: ${await count(t,c)}`)

console.log('━━ VACUUM simple (jamais FULL sur Neon)')
for (const t of ['psa_card_mappings','prices_canonical','tcg_cards','tcg_sets'])
  await sql.query(`VACUUM "${t}"`)
console.log('Purge aopkm terminee.')
