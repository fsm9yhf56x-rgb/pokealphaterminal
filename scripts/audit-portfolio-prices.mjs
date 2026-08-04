import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local','utf8') : ''
const url = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
const rows = await sql`
  SELECT pc.name, kc.lang, pc.condition, pc.graded, pc.current_price, pc.price_basis
  FROM portfolio_cards pc LEFT JOIN k_cards kc ON kc.id = pc.k_card_id
  WHERE pc.card_number <> 'SEALED' ORDER BY kc.lang, pc.graded, pc.name`
const cat = { exact: [], fr_cond: [], cote: [], derive: [], estime: [], gradee: [], sans_marche: [], inconnu: [] }
for (const r of rows) {
  const b = String(r.price_basis ?? '')
  const k = b.startsWith('tier:') ? 'exact'
    : b.startsWith('fr_cond:') ? (b.endsWith('~') ? 'derive' : 'fr_cond')
    : b === 'cote_fr' || b === 'cardmarket_eu' ? 'cote'
    : b.startsWith('fair_value') ? 'estime'
    : b.includes('graded') ? 'gradee'
    : b.includes('insufficient') ? 'sans_marche' : 'inconnu'
  cat[k].push(`${(r.lang||'??').toUpperCase()} ${r.name} (${r.condition ?? '—'})${r.current_price != null ? ' = ' + r.current_price + ' EUR' : ''}`)
}
const LABEL = {
  exact: 'Tier exact (l\'état/la note a son marché)',
  fr_cond: 'Annonces Cardmarket FR par état',
  cote: 'Cote FR / Cardmarket EU',
  derive: 'Échelle dérivée (indicatif ~)',
  estime: 'Valeur estimée — marché global, pas l\'état exact',
  gradee: 'GRADÉE SANS MARCHÉ — aucune vente à cette note',
  sans_marche: 'Pas de marché observé (commons, énergies, dresseurs)',
  inconnu: 'NON PRICÉ — à investiguer',
}
for (const k of Object.keys(cat)) {
  if (!cat[k].length) continue
  console.log(`\n── ${LABEL[k]} : ${cat[k].length} ──`)
  if (k === 'gradee' || k === 'inconnu' || k === 'estime') for (const l of cat[k]) console.log('   ' + l)
}
const cotees = rows.filter(r => r.current_price != null).length
console.log(`\n${rows.length} cartes · ${cotees} cotées (${Math.round(cotees / rows.length * 100)} %) · ${rows.length - cotees} sans prix`)
