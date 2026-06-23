#!/usr/bin/env node
/**
 * Lie les cartes JP (k_cards_export) a la population PSA (psa_pop_reports)
 * et remplit psa_card_mappings. Idempotent (ON CONFLICT DO NOTHING).
 *
 * Strategie en 2 passes :
 *   1. set+numero : code PSA (jp-SV2A-208) <-> slug k_set commencant par le code
 *   2. nom+numero : pour les sets restants, match par nom Pokemon normalise
 *      (le code PSA est devine par chevauchement de noms, seuil >= 3 matches)
 *
 * Lancer : node scripts/match-psa-jp-pop.mjs
 * Cron    : apres chaque scrape PSA / sync catalogue JP.
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)

const pad = n => String(n).replace(/[^0-9]/g, '').padStart(3, '0')
const norm = s => (s || '').toLowerCase()
  .replace(/-holo$|-holo-.*$|-reverse foil$|-glossy$|-cosmos.*$/i, '')
  .replace(/['’`]/g, '').replace(/\b(ex|gx|v|vmax|vstar|prime|break)\b/g, '')
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

async function insertRows(rows, method) {
  let ins = 0
  for (const [tid, ref] of rows) {
    await sql`INSERT INTO psa_card_mappings (tcg_card_id, psa_card_ref, match_method, confidence)
              VALUES (${tid}, ${ref}, ${method}, 'auto') ON CONFLICT DO NOTHING`
    ins++
  }
  return ins
}

async function main() {
  console.log('=== match-psa-jp-pop ===')

  // Index pop PSA JP : par code -> { num->ref, nn->ref, list }
  const psa = await sql`
    SELECT card_ref, subject_name,
      regexp_replace(card_ref,'^jp-([A-Z0-9]+)-.*$','\\1') code,
      regexp_replace(card_ref,'^jp-[A-Z0-9]+-([0-9A-Za-z]+)$','\\1') num
    FROM psa_pop_reports WHERE card_ref ~ '^jp-[A-Z0-9]+-[0-9A-Za-z]+$'`
  const byCode = {}
  for (const p of psa) {
    const e = (byCode[p.code] ||= { num: {}, nn: {}, list: [] })
    e.num[pad(p.num)] = p.card_ref
    const nn = norm(p.subject_name)
    if (nn && !e.nn[nn]) e.nn[nn] = p.card_ref
    e.list.push({ nn })
  }
  console.log('Codes PSA JP:', Object.keys(byCode).length)

  // Cartes JP non mappees
  const unmapped = await sql`
    SELECT ke.id, ke.set_id, ke.local_id, ke.name
    FROM k_cards_export ke
    WHERE ke.lang='JP'
      AND NOT EXISTS (SELECT 1 FROM psa_card_mappings m WHERE m.tcg_card_id=ke.id)`
  console.log('Cartes JP non mappees:', unmapped.length)
  if (unmapped.length === 0) { console.log('Rien a faire.'); return }

  const ourSets = await sql`SELECT id FROM k_sets WHERE 'jp'=ANY(langs)`
  const setIds = ourSets.map(s => s.id)

  // PASSE 1 : set+numero (code PSA = prefixe du slug)
  const codeToSet = {}
  for (const code of Object.keys(byCode)) {
    const lc = code.toLowerCase()
    const hit = setIds.find(s => s === lc) || setIds.find(s => s.startsWith(lc + '-'))
    if (hit) codeToSet[code] = hit
  }
  const bySet = {}
  for (const c of unmapped) (bySet[c.set_id] ||= []).push(c)

  const p1 = []
  for (const [code, setId] of Object.entries(codeToSet)) {
    const cards = bySet['jp-' + setId] || []
    for (const c of cards) {
      const ref = byCode[code].num[pad(c.local_id)]
      if (ref) p1.push([c.id, ref])
    }
  }
  const ins1 = await insertRows(p1, 'number')
  console.log('Passe 1 (set+numero):', ins1)

  // PASSE 2 : nom+numero pour les sets restants
  const stillUnmapped = await sql`
    SELECT ke.id, ke.set_id, ke.local_id, ke.name
    FROM k_cards_export ke
    WHERE ke.lang='JP'
      AND NOT EXISTS (SELECT 1 FROM psa_card_mappings m WHERE m.tcg_card_id=ke.id)`
  const bySet2 = {}
  for (const c of stillUnmapped) (bySet2[c.set_id] ||= []).push(c)

  const p2 = []
  for (const cards of Object.values(bySet2)) {
    let best = null, bestScore = 0
    for (const [code, e] of Object.entries(byCode)) {
      const set = new Set(e.list.map(x => x.nn))
      let score = 0
      for (const c of cards) if (c.name && set.has(norm(c.name))) score++
      if (score > bestScore) { bestScore = score; best = code }
    }
    if (best && bestScore >= 3) {
      const e = byCode[best]
      for (const c of cards) {
        const ref = e.num[pad(c.local_id)] || e.nn[norm(c.name)]
        if (ref) p2.push([c.id, ref])
      }
    }
  }
  const ins2 = await insertRows(p2, 'name')
  console.log('Passe 2 (nom+numero):', ins2)

  const tot = await sql`SELECT COUNT(*)::int n FROM psa_card_mappings`
  console.log('Total psa_card_mappings:', tot[0].n)
}
main().catch(e => { console.error(e); process.exit(1) })
