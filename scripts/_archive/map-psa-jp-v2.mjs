#!/usr/bin/env node
/**
 * Improved PSA JP mapping v2.
 * Generates a UNIQUE setId for ALL 539 sets, including vintage exclusifs.
 * Output: scripts/data/psa-jp-mapping-v2.json
 */
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = readFileSync('.env.local', 'utf-8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(supabaseUrl, supabaseKey)

const psaSets = JSON.parse(readFileSync('scripts/data/psa-jp-discovery.json', 'utf-8'))
const { data: dbSets } = await sb.from('tcg_sets').select('id, name').eq('lang', 'JP')
const dbCodes = new Set((dbSets || []).map(s => s.id.replace(/^jp-/, '').toUpperCase()))

// Slugify a name into a setId-safe string
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/^pokemon japanese\s*/i, '')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const mapping = []
let matchedDb = 0
let codedNoDb = 0
let vintageGen = 0

for (const psa of psaSets) {
  const name = psa.name
  let code = null
  let setId = null
  let isVintageGen = false  // generated for vintage exclusive

  // Special edge cases for promo codes (S-P, SV-P, M-P, BW-P, XY-P, SM-P, etc.)
  const promoMatch = name.match(/^Pokemon Japanese (DPP|HSP|BWP|XYP|SMP|SWSHP|SV-P|S-P|M-P|MP\d|XY-P|MMB-P|XY-Black\sStar)\b/i)
  if (promoMatch) {
    code = promoMatch[1].toUpperCase().replace('-BLACK STAR', '-BS')
  }

  // Pattern: "Pokemon Japanese <CODE>-<Description>"
  if (!code) {
    const m1 = name.match(/^Pokemon Japanese ([A-Za-z0-9-]+?)-/)
    if (m1) code = m1[1].toUpperCase()
  }

  // Special-case keyword sets without codes
  if (!code) {
    const kw = {
      'Pokemon Japanese Basic':                  'PMCG1',
      'Pokemon Japanese Jungle':                 'PMCG2',
      'Pokemon Japanese Fossil':                 'PMCG3',
      'Pokemon Japanese Fossil Test Issue':      'PMCG3-TEST',
      'Pokemon Japanese Rocket':                 'PMCG4',
      'Pokemon Japanese Rocket Gang':            'PMCG4',
      'Pokemon Japanese Gym 2':                  'PMCG6',
      'Pokemon Japanese Gym Deck':               'PMCG-GYM-DECK',
      'Pokemon Japanese Gym':                    'PMCG5',
      'Pokemon Japanese Bulbasaur Deck':         'BULBASAUR-DECK',
      'Pokemon Japanese Squirtle Deck':          'SQUIRTLE-DECK',
      'Pokemon Japanese Charmander Deck':        'CHARMANDER-DECK',
      'Pokemon Japanese Pikachu Deck':           'PIKACHU-DECK',
      'Pokemon Japanese Red/Green Gift Set':     'RED-GREEN-GIFT',
      'Pokemon Japanese Vending':                'VENDING',
      'Pokemon Japanese Neo Promo':              'NEO-PROMO',
      'Pokemon Japanese-Basic Energies':         'BASIC-ENERGIES',
      'Pokemon Japanese Coronet Mountains':      'CORONET',
      'Pokemon Japanese E-Starter Deck':         'E-STARTER',
    }
    for (const [k, v] of Object.entries(kw)) {
      if (name.startsWith(k)) {
        code = v
        break
      }
    }
  }

  // Yearly promos (Coin Promo, Insert Cards, Promo, Meiji, Toyota, Ana Airways, etc.)
  if (!code) {
    const yearlyPatterns = [
      { rx: /^Pokemon Japanese Coin Promo/i,                   prefix: 'COIN-PROMO' },
      { rx: /^Pokemon Japanese Insert Cards/i,                 prefix: 'INSERT' },
      { rx: /^Pokemon Japanese Corocoro Comics Promo/i,        prefix: 'COROCORO' },
      { rx: /^Pokemon Japanese Meiji Promo/i,                  prefix: 'MEIJI' },
      { rx: /^Pokemon Japanese Toyota Promo/i,                 prefix: 'TOYOTA' },
      { rx: /^Pokemon Japanese Ana Airways/i,                  prefix: 'ANA' },
      { rx: /^Pokemon Japanese CD Promo/i,                     prefix: 'CD-PROMO' },
      { rx: /^Pokemon Japanese Promo Corocoro/i,               prefix: 'PROMO-COROCORO' },
      { rx: /^Pokemon Japanese Promo Game Boy/i,               prefix: 'PROMO-GAMEBOY' },
      { rx: /^Pokemon Japanese Promo (.+)$/i,                  prefix: null }, // generate from name
      { rx: /^Pokemon Japanese (.+) City Gym Deck/i,           prefix: null }, // city gym decks
      { rx: /^Amada Pokemon Japanese Super DX Stickers/i,      prefix: 'AMADA-DX-STICKERS' },
      { rx: /^Pokemon Japanese .+/i,                            prefix: null }, // last resort
    ]
    for (const p of yearlyPatterns) {
      const m = name.match(p.rx)
      if (m) {
        if (p.prefix) {
          code = `${p.prefix}-${psa.year || 'unknown'}`
        } else {
          // Use slugified name + year
          const slug = slugify(name).slice(0, 40)
          code = `${slug.toUpperCase()}-${psa.year || 'unknown'}`
        }
        isVintageGen = true
        break
      }
    }
  }

  if (code) {
    setId = `jp-${code}`
    const inDb = dbCodes.has(code.toUpperCase())
    mapping.push({ ...psa, code, setId, inDb, isVintageGen })
    if (inDb) matchedDb++
    else if (isVintageGen) vintageGen++
    else codedNoDb++
  } else {
    mapping.push({ ...psa, code: null, setId: null, inDb: false })
  }
}

console.log(`━━━ Mapping v2 result ━━━`)
console.log(`✅ Matched in DB:           ${matchedDb}`)
console.log(`🟡 Coded but not in DB:     ${codedNoDb}`)
console.log(`🆕 Vintage exclusive (gen): ${vintageGen}`)
console.log(`❌ No code at all:          ${psaSets.length - matchedDb - codedNoDb - vintageGen}`)
console.log(`📊 Total mapped:            ${matchedDb + codedNoDb + vintageGen} / ${psaSets.length}`)

writeFileSync('scripts/data/psa-jp-mapping-v2.json', JSON.stringify(mapping, null, 2))
console.log(`\n✅ Saved to scripts/data/psa-jp-mapping-v2.json`)

// Show no-code samples
const noCode = mapping.filter(m => !m.code)
if (noCode.length > 0) {
  console.log(`\n━━━ Sets sans code (${noCode.length}) - might need manual mapping ━━━`)
  for (const m of noCode.slice(0, 20)) {
    console.log(`  [${m.year}][${m.headingId}] ${m.name}`)
  }
}
