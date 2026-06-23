#!/usr/bin/env node
/**
 * Rafraichit psa_pop_reports via l'API PSA officielle (GetPSASpecPopulation).
 * Fiable (pas de Cloudflare). Limite ~100 req/jour en gratuit -> MAX_REQ.
 *
 * Usage:
 *   node scripts/psa-pop-api-refresh.mjs            # 90 specs les plus stale
 *   PSA_MAX_REQ=50 node scripts/psa-pop-api-refresh.mjs
 *   PSA_FILTER=french node scripts/psa-pop-api-refresh.mjs   # cible les FR
 */
import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'
config({ path: '.env.production.local' })
const sql = neon(process.env.DATABASE_URL)
const TOKEN = process.env.PSA_BEARER_TOKEN
const MAX_REQ = Number(process.env.PSA_MAX_REQ || 90)
const FILTER = (process.env.PSA_FILTER || '').toLowerCase()

const API = 'https://api.psacard.com/publicapi/pop/GetPSASpecPopulation'

// Map champs API PSAPop -> colonnes psa_pop_reports
const GRADE_MAP = {
  Auth: 'pop_authentic', Grade1: 'pop_1', Grade1_5: 'pop_1_5', Grade2: 'pop_2',
  Grade2_5: 'pop_2_5', Grade3: 'pop_3', Grade3_5: 'pop_3_5', Grade4: 'pop_4',
  Grade4_5: 'pop_4_5', Grade5: 'pop_5', Grade5_5: 'pop_5_5', Grade6: 'pop_6',
  Grade6_5: 'pop_6_5', Grade7: 'pop_7', Grade7_5: 'pop_7_5', Grade8: 'pop_8',
  Grade8_5: 'pop_8_5', Grade9: 'pop_9', Grade9_5: 'pop_9_5', Grade10: 'pop_10',
}

async function fetchSpec(specId) {
  const r = await fetch(`${API}/${specId}`, { headers: { authorization: `bearer ${TOKEN}` } })
  if (!r.ok) return null
  const ct = r.headers.get('content-type') || ''
  if (!ct.includes('json')) return null
  return r.json()
}

async function main() {
  if (!TOKEN) { console.error('PSA_BEARER_TOKEN manquant'); process.exit(1) }

  // Selection: specs a rafraichir (les plus anciens d'abord), filtre langue optionnel
  const rows = FILTER
    ? await sql`SELECT id, psa_spec_id FROM psa_pop_reports
                WHERE psa_spec_id IS NOT NULL AND variety ILIKE ${'%'+FILTER+'%'}
                ORDER BY scraped_at ASC NULLS FIRST LIMIT ${MAX_REQ}`
    : await sql`SELECT id, psa_spec_id FROM psa_pop_reports
                WHERE psa_spec_id IS NOT NULL
                ORDER BY scraped_at ASC NULLS FIRST LIMIT ${MAX_REQ}`
  console.log(`Specs a rafraichir: ${rows.length} (filter=${FILTER||'none'}, max=${MAX_REQ})`)

  let ok = 0, fail = 0
  for (const row of rows) {
    const data = await fetchSpec(row.psa_spec_id)
    if (!data || !data.PSAPop) { fail++; continue }
    const p = data.PSAPop
    const set = {}
    for (const [apiKey, col] of Object.entries(GRADE_MAP)) {
      if (p[apiKey] != null) set[col] = Number(p[apiKey])
    }
    const total = p.Total != null ? Number(p.Total) : null
    // UPDATE dynamique
    await sql`UPDATE psa_pop_reports SET
      pop_authentic = ${set.pop_authentic ?? null},
      pop_1=${set.pop_1??null}, pop_1_5=${set.pop_1_5??null}, pop_2=${set.pop_2??null},
      pop_2_5=${set.pop_2_5??null}, pop_3=${set.pop_3??null}, pop_3_5=${set.pop_3_5??null},
      pop_4=${set.pop_4??null}, pop_4_5=${set.pop_4_5??null}, pop_5=${set.pop_5??null},
      pop_5_5=${set.pop_5_5??null}, pop_6=${set.pop_6??null}, pop_6_5=${set.pop_6_5??null},
      pop_7=${set.pop_7??null}, pop_7_5=${set.pop_7_5??null}, pop_8=${set.pop_8??null},
      pop_8_5=${set.pop_8_5??null}, pop_9=${set.pop_9??null}, pop_9_5=${set.pop_9_5??null},
      pop_10=${set.pop_10??null}, pop_total=${total},
      scraped_at = NOW()
      WHERE id = ${row.id}`
    ok++
    if (ok % 20 === 0) console.log(`  ${ok}/${rows.length}`)
    await new Promise(r => setTimeout(r, 400)) // throttle doux
  }
  console.log(`OK: ${ok} | echecs: ${fail}`)
}
main().catch(e => { console.error(e); process.exit(1) })
