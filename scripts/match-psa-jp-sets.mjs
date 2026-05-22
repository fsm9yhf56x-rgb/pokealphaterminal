#!/usr/bin/env node
/**
 * Auto-matching PSA jp-* set codes ↔ TCGdex aopkm-* set IDs
 *
 * Strategy:
 *   1. Normalize names on both sides (lowercase, strip filler words, year, etc.)
 *   2. Match by exact normalized name → confidence='auto'
 *   3. Match by short PSA codes (SV2A, M2, etc.) via manual mapping → confidence='verified'
 *   4. Insert into psa_set_mappings
 *
 * Output: report of matched / unmatched sets
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Manual mapping for short codes that don't match by name
// (verified against psacard.com)
const MANUAL_SHORT_CODES = {
  'SV2A': 'aopkm-490',   // Pokémon Card 151
  'SV4A': 'aopkm-506',   // Shiny Treasure ex
  'SV3': null,            // To be researched
  'SV5A': null,
  'SV8A': null,
  'SV11B': null,
  'SV11W': null,
  'M2': null,             // Mega Evolution series
  'M2A': null,
}

// Normalize set name for matching
// "SWORD-SHIELD-SHINY-STAR-V-2020" → "shiny star v"
// "Shiny Star V" → "shiny star v"
function normalize(s) {
  if (!s) return ''
  return s
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\b(sword shield|sun moon|black white|diamond pearl|xy|x y|bw|sm|dp|ex|ruby sapphire)\b/g, ' ')
    .replace(/\b(19|20)\d{2}\b/g, ' ')  // remove years
    .replace(/\bpokemon\b|\bpokémon\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

console.log('=== Loading data ===')

const tcgSets = await sql`
  SELECT id, name FROM tcg_sets
  WHERE lang = 'JP' OR source = 'artofpkm' OR id LIKE 'aopkm-%'
`
console.log(`  tcg_sets JP/aopkm: ${tcgSets.length}`)

const psaSetsRaw = await sql`
  SELECT DISTINCT SUBSTRING(card_ref FROM 'jp-(.+)-\\d+$') as psa_set, COUNT(*) as cards
  FROM psa_pop_reports
  WHERE card_ref LIKE 'jp-%'
  GROUP BY psa_set
  HAVING SUBSTRING(card_ref FROM 'jp-(.+)-\\d+$') IS NOT NULL
  ORDER BY cards DESC
`
console.log(`  PSA jp-* distinct sets: ${psaSetsRaw.length}`)

// Build normalized index for TCG sets
const tcgByNorm = new Map()
for (const s of tcgSets) {
  const norm = normalize(s.name)
  if (norm) tcgByNorm.set(norm, s)
}

console.log('\n=== Matching ===')

const matches = []
const ambiguous = []
const unmatched = []

for (const ps of psaSetsRaw) {
  const psaCode = ps.psa_set
  if (!psaCode) continue

  // 1. Manual short code mapping
  if (MANUAL_SHORT_CODES[psaCode]) {
    const tcgId = MANUAL_SHORT_CODES[psaCode]
    const tcgSet = tcgSets.find(s => s.id === tcgId)
    if (tcgSet) {
      matches.push({
        psa_set_code: psaCode,
        tcg_set_id: tcgId,
        set_name: tcgSet.name,
        confidence: 'verified',
        notes: `Manual short-code mapping (${ps.cards} cards in PSA)`,
      })
      continue
    }
  }

  // 2. Normalized name match
  const norm = normalize(psaCode)
  const hit = tcgByNorm.get(norm)
  if (hit) {
    matches.push({
      psa_set_code: psaCode,
      tcg_set_id: hit.id,
      set_name: hit.name,
      confidence: 'auto',
      notes: `Auto: normalized '${norm}' (${ps.cards} cards)`,
    })
    continue
  }

  // 3. Fuzzy: partial substring match
  const normWords = norm.split(' ').filter(w => w.length > 3)
  if (normWords.length >= 2) {
    const candidates = []
    for (const [n, s] of tcgByNorm) {
      const hits = normWords.filter(w => n.includes(w)).length
      if (hits >= 2) candidates.push({ set: s, score: hits })
    }
    candidates.sort((a, b) => b.score - a.score)
    if (candidates.length === 1) {
      matches.push({
        psa_set_code: psaCode,
        tcg_set_id: candidates[0].set.id,
        set_name: candidates[0].set.name,
        confidence: 'auto',
        notes: `Fuzzy: ${candidates[0].score} word match (${ps.cards} cards)`,
      })
      continue
    } else if (candidates.length > 1) {
      ambiguous.push({ psaCode, cards: ps.cards, candidates: candidates.slice(0, 3) })
      continue
    }
  }

  unmatched.push({ psaCode, cards: ps.cards })
}

console.log(`  Matched: ${matches.length}`)
console.log(`  Ambiguous: ${ambiguous.length}`)
console.log(`  Unmatched: ${unmatched.length}`)

console.log('\n=== Insert into psa_set_mappings ===')

let inserted = 0
for (const m of matches) {
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa_set_code}, ${m.tcg_set_id}, ${m.set_name}, ${m.confidence}, ${m.notes})
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id,
        set_name = EXCLUDED.set_name,
        confidence = EXCLUDED.confidence,
        notes = EXCLUDED.notes,
        updated_at = NOW()
    `
    inserted++
  } catch (e) {
    console.error(`  KO ${m.psa_set_code}: ${e.message}`)
  }
}
console.log(`  Inserted/updated: ${inserted}`)

// Output report
console.log('\n=== Top matches ===')
matches.slice(0, 10).forEach(m =>
  console.log(`  [${m.confidence}] '${m.psa_set_code}' → ${m.tcg_set_id} (${m.set_name})`)
)

console.log('\n=== Top ambiguous (need review) ===')
ambiguous.slice(0, 10).forEach(a => {
  console.log(`  '${a.psaCode}' (${a.cards} cards):`)
  a.candidates.forEach(c => console.log(`    - ${c.set.id} (${c.set.name}) score=${c.score}`))
})

console.log('\n=== Top unmatched (need manual mapping) ===')
unmatched.slice(0, 15).forEach(u =>
  console.log(`  '${u.psaCode}' (${u.cards} cards)`)
)

const final = await sql`SELECT COUNT(*) as n FROM psa_set_mappings`
console.log(`\n✓ Total mappings in DB: ${final[0].n}`)
