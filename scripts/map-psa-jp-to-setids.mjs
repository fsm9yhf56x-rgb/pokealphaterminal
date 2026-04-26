#!/usr/bin/env node
/**
 * Map all 539 PSA Japanese sets to internal setIds (jp-<CODE>).
 * Output: scripts/data/psa-jp-mapping.json
 */
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf-8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(supabaseUrl, supabaseKey)

const psaSets = JSON.parse(readFileSync('scripts/data/psa-jp-discovery.json', 'utf-8'))

// Get all our DB JP set IDs (without 'jp-' prefix for matching)
const { data: dbSets } = await sb.from('tcg_sets').select('id, name').eq('lang', 'JP')
const dbCodes = new Set((dbSets || []).map(s => s.id.replace(/^jp-/, '').toUpperCase()))
console.log(`DB has ${dbCodes.size} JP set codes`)

const mapping = []
let matched = 0, unmatched = 0

for (const psa of psaSets) {
  const name = psa.name
  // Try patterns:
  // 1. "Pokemon Japanese <CODE>-<Description>"   (most common)
  // 2. "Pokemon Japanese <Description>"          (no code)
  
  let code = null
  let setId = null
  
  // Pattern 1: extract CODE before the dash
  const m1 = name.match(/^Pokemon Japanese ([A-Za-z0-9-]+?)-/)
  if (m1) {
    code = m1[1].toUpperCase()
    
    // Special cases for promo codes (S-P → S-P, SV-P → SV-P, M-P → M-P)
    // These have a dash inside so we need to handle them differently
    // The regex above stops at first dash, so for "SV-P-Promo" it would extract "SV"
    // Try a wider pattern: <CODE>-Promo at end
    const promoMatch = name.match(/^Pokemon Japanese ([A-Z]+\d*-?P)\b/)
    if (promoMatch) code = promoMatch[1].toUpperCase()
  }
  
  // Pattern 2: special-case keyword sets (no code)
  if (!code) {
    const kwMap = {
      'Pokemon Japanese Coin Promo':                'coin-promo',
      'Pokemon Japanese Insert Cards':              'insert',
      'Pokemon Japanese Promo':                     'promo',
      'Pokemon Japanese Vending':                   'vending',
      'Pokemon Japanese-Basic Energies':            'basic-energies',
      'Pokemon Japanese Coronet Mountains':         'coronet',
      'Pokemon Japanese Basic':                     'PMCG1',  // 1996 Base
      'Pokemon Japanese Jungle':                    'PMCG2',
      'Pokemon Japanese Fossil':                    'PMCG3',
      'Pokemon Japanese Rocket':                    'PMCG4',
      'Pokemon Japanese Gym':                       'PMCG5',
      'Pokemon Japanese Gym 2':                     'PMCG6',
      'Pokemon Japanese Neo Promo':                 'neo-promo',
    }
    for (const [k, v] of Object.entries(kwMap)) {
      if (name.startsWith(k)) {
        code = v.toUpperCase()
        // Add year suffix for yearly promos
        if (['COIN-PROMO','INSERT','VENDING','PROMO'].includes(code) && psa.year) {
          code = `${code}-${psa.year}`
        }
        break
      }
    }
  }
  
  if (code) {
    setId = `jp-${code}`
    const inDb = dbCodes.has(code)
    mapping.push({ ...psa, code, setId, inDb })
    if (inDb) matched++
    else unmatched++
  } else {
    mapping.push({ ...psa, code: null, setId: null, inDb: false })
    unmatched++
  }
}

console.log(`\n━━━ Mapping result ━━━`)
console.log(`✅ Matched in DB:   ${matched} sets`)
console.log(`❌ Not in DB:       ${unmatched} sets`)
console.log(`📊 Match rate:      ${(matched / psaSets.length * 100).toFixed(1)}%`)

writeFileSync('scripts/data/psa-jp-mapping.json', JSON.stringify(mapping, null, 2))
console.log(`\n✅ Saved to scripts/data/psa-jp-mapping.json`)

// Show samples of each
console.log('\n━━━ Sample MATCHED (first 10) ━━━')
for (const m of mapping.filter(m => m.inDb).slice(0, 10)) {
  console.log(`  ✅ [${m.headingId}] ${m.name.slice(0, 60).padEnd(60)} → ${m.setId}`)
}

console.log('\n━━━ Sample UNMATCHED (first 20) ━━━')
for (const m of mapping.filter(m => !m.inDb).slice(0, 20)) {
  const reason = m.code ? `code=${m.code} (DB miss)` : 'no code'
  console.log(`  ❌ [${m.headingId}] ${m.name.slice(0, 55).padEnd(55)} → ${reason}`)
}
