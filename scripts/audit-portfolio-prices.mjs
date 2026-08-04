import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local','utf8') : ''
const url = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
const rows = await sql`
  SELECT pc.name, kc.lang, pc.condition, pc.graded, pc.current_price, pc.price_basis
  FROM portfolio_cards pc LEFT JOIN k_cards kc ON kc.id = pc.k_card_id
  WHERE pc.card_number <> 'SEALED' ORDER BY kc.lang, pc.graded, pc.name`
const bad = []
for (const r of rows) {
  const b = String(r.price_basis ?? '')
  const suspect = r.current_price == null || !b
    || b.startsWith('fair_value') || b.includes('insufficient') || b.includes('no_data')
    || (r.graded && !b.startsWith('tier:'))
  console.log(`${suspect ? '⚠️ ' : '   '}${(r.lang||'??').toUpperCase()} ${String(r.name).padEnd(24).slice(0,24)} ${String(r.condition ?? '—').padEnd(18)} ${String(r.current_price ?? '—').padStart(9)}  ${b || '—'}`)
  if (suspect) bad.push(r.name)
}
console.log(`\n${rows.length} cartes · ${bad.length} suspectes`)
