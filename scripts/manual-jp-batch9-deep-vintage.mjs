#!/usr/bin/env node
/**
 * BATCH 9: Deep vintage WotC JP + Classic Collections
 *
 * Identifications par cross-référencement noms de cartes:
 *   MEIJI-1998 → aopkm-29 Meiji Promos (vintage 1998)
 *   GUREN-TOWN-GYM-DECK-1999 → aopkm-22 Cinnabar City Gym Blaine
 *   CLF → Classic Collection Bulbasaur trio (aopkm 545 'Pokemon Card Game Classic')
 *   CLL → Classic Collection Charmander trio (aopkm 545 'Pokemon Card Game Classic')
 *   CLK → Classic Collection Squirtle trio (aopkm 545 'Pokemon Card Game Classic')
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// Verify Pokemon Card Game Classic content
console.log('=== Verify aopkm-545 Pokemon Card Game Classic ===')
const pcgc = await sql`SELECT local_id, name FROM tcg_cards WHERE set_id = 'aopkm-545' AND (name ILIKE '%bulbasaur%' OR name ILIKE '%charizard%' OR name ILIKE '%blastoise%') LIMIT 10`
pcgc.forEach(x => console.log(`  aopkm-545-${x.local_id}: ${x.name}`))

const BATCH9 = [
  // Classic Collection = Pokemon Card Game Classic (aopkm-545)
  // CLF = Bulbasaur set, CLL = Charizard set, CLK = Squirtle set, all part of Classic Collection
  { psa: 'CLF',  tcg: 'aopkm-545', name: 'Pokémon Card Game Classic' },
  { psa: 'CLL',  tcg: 'aopkm-545', name: 'Pokémon Card Game Classic' },
  { psa: 'CLK',  tcg: 'aopkm-545', name: 'Pokémon Card Game Classic' },

  // Guren Town Gym Deck = Blaine's Cinnabar Gym (Guren = Cinnabar in JP)
  { psa: 'GUREN-TOWN-GYM-DECK-1999',  tcg: 'aopkm-22', name: 'Cinnabar City Gym–Blaine' },

  // SVM = needs investigation, samples are Amoonguss EX, Torchic, Blaziken EX
  // → likely "Scarlet & Violet ex Special Set" or similar
  // → skip for now, low volume

  // BLACK-WHITE-2010 = first BW JP main set
  // Sewaddle/Snivy = BW Collection Black & White JP (aopkm-217 or 218)
  // Let's check
]

console.log('\n=== Search BW JP main sets (aopkm 215-225) ===')
const bw = await sql`SELECT id, name FROM tcg_sets WHERE id ~ '^aopkm-[0-9]+$' AND (REGEXP_REPLACE(id, 'aopkm-', ''))::int BETWEEN 215 AND 230 ORDER BY (REGEXP_REPLACE(id, 'aopkm-', ''))::int`
bw.forEach(x => console.log(`  '${x.id}': '${x.name}'`))

// VS Pokemon Card = aopkm-46 Pokemon Card VS - already mapped via VS-2001
// E = aopkm-52 e Starter Pack
BATCH9.push({ psa: 'E', tcg: 'aopkm-52', name: 'e Starter Pack' })

// Bulbasaur Deck & Squirtle Deck = vintage WotC starter decks
// These were sold separately = aopkm-66/67/68 (Treecko, Torchic, Mudkip) ? Non, those are ADV
// PMCG era starters = aopkm-74/75/85/93/94 (Flygon, Salamence, Metagross, Deoxys, Rayquaza)
// Bulbasaur/Squirtle Decks = older. → Probably from Pokemon Card e starter sets, skip if no clear match

console.log('\n=== BATCH 9: Classic Collection + Vintage ===')
let inserted = 0, skipped = 0

for (const m of BATCH9) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 9 deep vintage 2026-05-22')
      ON CONFLICT (psa_set_code) DO UPDATE SET
        tcg_set_id = EXCLUDED.tcg_set_id, set_name = EXCLUDED.set_name,
        confidence = 'verified', updated_at = NOW()
    `
    console.log(`  OK '${m.psa}' → ${m.tcg} (${exists[0].name})`)
    inserted++
  } catch (e) {
    console.log(`  KO '${m.psa}': ${e.message}`)
    skipped++
  }
}

console.log(`\nBatch 9: ${inserted} inserted, ${skipped} skipped`)
