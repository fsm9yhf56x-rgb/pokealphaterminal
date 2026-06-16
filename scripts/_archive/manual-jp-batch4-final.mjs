#!/usr/bin/env node
/**
 * BATCH 4 : Mappings JP FINAL — sets manquants + fix erreurs
 *
 * 1. FIX SV10 → c'est Glory of Team Rocket (aopkm-563), pas Hot Wind Arena
 *    Hot Wind Arena n'est PAS SV10 (numérotation différente)
 * 2. Ajoute les SV manquants (SV2P, SV4K, SV7A, SV9A)
 * 3. Mappe les sets vintage et récents non encore mappés
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

// ─── FIX: SV10 was mapped to Hot Wind Arena (aopkm-557), should be Glory of Team Rocket
console.log('=== FIX SV10 → aopkm-563 (Glory of Team Rocket, not Hot Wind Arena) ===')
await sql`
  UPDATE psa_set_mappings
  SET tcg_set_id = 'aopkm-563',
      set_name = 'Glory of Team Rocket',
      notes = 'Fixed 2026-05-22: SV10 is Glory of Team Rocket, not Hot Wind Arena',
      updated_at = NOW()
  WHERE psa_set_code = 'SV10'
`
console.log('  OK SV10 corrigé')

// Hot Wind Arena reste sans mapping PSA (set récent, peut-être pas encore gradé largement)

const BATCH4 = [
  // ─── SV manquants ───────────────────────────────────────────────
  // SV2P (60 cartes PSA) = Triplet Beat? Non, SV1A = Triplet Beat. SV2P = ???
  // En réalité, SV2P n'a pas d'équivalent direct car les codes "P" sont des promos/spéciaux
  // SV2P = "Pokémon Card 151 Promos" ? À vérifier
  // → On skip pour l'instant (peu de volume)

  // SV4K (60 cartes) = Wild Force (SV4K nomenclature TPCi). SV4K = aopkm-508 Wild Force? Déjà mappé via SV5K? Hmm.
  // PSA peut utiliser SV4K interchangeable avec SV5K. À vérifier en lisant les cartes.

  // SV7A (56 cartes) = Paradise Dragona (set ex aopkm-544)
  { psa: 'SV7A',  tcg: 'aopkm-544', name: 'Paradise Dragona' },

  // SV9A (66 cartes) = ?
  // SV9 = Battle Partners (aopkm-556) déjà mappé. SV9A = subset ?
  // → skip

  // ─── Sun & Moon era manquants ──────────────────────────────────
  // MIRACLE-TWINS = Miracle Twin (aopkm-386)
  { psa: 'SUN-MOON-MIRACLE-TWINS-2019',          tcg: 'aopkm-386', name: 'Miracle Twin' },

  // ─── Sword & Shield era manquants ──────────────────────────────
  // JET-BLACK-SPIRIT = Jet-Black Poltergeist (aopkm-431)
  { psa: 'SWORD-SHIELD-JET-BLACK-SPIRIT-2021',   tcg: 'aopkm-431', name: 'Jet-Black Poltergeist' },
  { psa: 'SWORD-SHIELD-SILVER-LANCE-JET-BLACK-SPIR-2021', tcg: 'aopkm-431', name: 'Jet-Black Poltergeist' },
  // SKYSCRAPING-PERFECTION = Skyscraping Perfect (aopkm-438)
  { psa: 'SWORD-SHIELD-SKYSCRAPING-PERFECTION-2021', tcg: 'aopkm-438', name: 'Skyscraping Perfect' },
  // Matchless Fighters (aopkm-427) — PSA code ?
  // → matchless-fighters search à faire séparément

  // ─── Scarlet & Violet sets manquants ────────────────────────────
  // Pokemon GO (aopkm-464) - vérifier code PSA
  // Snow Hazard (aopkm-484), Ancient Roar (aopkm-501), Battle Academy (aopkm-512)
  // → à mapper après recherche des codes PSA

  // Hot Wind Arena (aopkm-557) reste sans mapping PSA (récent, pas encore largement gradé)
]

console.log('\n=== BATCH 4: Final mappings ===')
let inserted = 0, skipped = 0

for (const m of BATCH4) {
  const exists = await sql`SELECT id, name FROM tcg_sets WHERE id = ${m.tcg}`
  if (exists.length === 0) {
    console.log(`  KO '${m.psa}': tcg_set '${m.tcg}' not found`)
    skipped++
    continue
  }
  try {
    await sql`
      INSERT INTO psa_set_mappings (psa_set_code, tcg_set_id, set_name, confidence, notes)
      VALUES (${m.psa}, ${m.tcg}, ${exists[0].name}, 'verified', 'Batch 4 final 2026-05-22')
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

console.log(`\nBatch 4: ${inserted} inserted, ${skipped} skipped`)

const stats = await sql`SELECT confidence, COUNT(*) as n FROM psa_set_mappings GROUP BY confidence`
console.log('\nFinal stats:')
stats.forEach(s => console.log(`  ${s.confidence}: ${s.n}`))
