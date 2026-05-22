import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Normaliseur identique à match-psa-jp-sets
function normalize(s) {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\b(sword shield|sun moon|black white|diamond pearl|xy|x y|bw|sm|dp|ex|ruby sapphire)\b/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')
    .replace(/\bpokemon\b|\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

console.log('=== Re-evaluate "manual" flagged mappings ===')
console.log('Logic: if normalized names match EXACTLY, multiple PSA variants per card is normal\n')

const manuals = await sql`
  SELECT m.psa_set_code, m.tcg_set_id, t.name as tcg_name,
         (SELECT COUNT(*) FROM psa_pop_reports
          WHERE card_ref LIKE 'jp-' || m.psa_set_code || '-%') as psa_cards,
         t.total_cards as tcg_cards
  FROM psa_set_mappings m
  JOIN tcg_sets t ON t.id = m.tcg_set_id
  WHERE m.confidence = 'manual'
`

let restored = 0
let kept_suspect = 0

for (const m of manuals) {
  const psaNorm = normalize(m.psa_set_code)
  const tcgNorm = normalize(m.tcg_name)
  const exactMatch = psaNorm === tcgNorm

  const ratio = Number(m.psa_cards) / Math.max(1, Number(m.tcg_cards))

  if (exactMatch && ratio <= 4) {
    // Nom exact + ratio raisonnable (jusqu'à 4 variants par carte) → on restaure
    await sql`
      UPDATE psa_set_mappings
      SET confidence = 'auto',
          notes = ${`Name match exact: '${psaNorm}'. PSA ${m.psa_cards} variants for ${m.tcg_cards} cards (ratio ${ratio.toFixed(1)}x = avg ${ratio.toFixed(1)} variants per card)`},
          updated_at = NOW()
      WHERE psa_set_code = ${m.psa_set_code}
    `
    console.log(`  ✓ '${m.psa_set_code}' restored (exact name match, ${ratio.toFixed(1)}x variants)`)
    restored++
  } else {
    console.log(`  ⚠️ '${m.psa_set_code}' kept manual: psaNorm='${psaNorm}' vs tcgNorm='${tcgNorm}' ratio=${ratio.toFixed(1)}x`)
    kept_suspect++
  }
}

console.log(`\nRestored: ${restored}`)
console.log(`Kept suspect: ${kept_suspect}`)

const final = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log('\nFinal state:')
final.forEach(r => console.log(`  ${r.confidence}: ${r.n}`))

const ready = await sql`SELECT COUNT(*) as n FROM psa_set_mappings WHERE confidence IN ('verified', 'auto')`
console.log(`\n✓ Usable (verified + auto): ${ready[0].n} mappings`)
