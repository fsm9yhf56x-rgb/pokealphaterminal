#!/usr/bin/env node
/**
 * PSA Pop Report scraper (API-based, not HTML).
 *
 * Usage:
 *   node scripts/scrape-psa-set.mjs --setId=base1
 *   node scripts/scrape-psa-set.mjs --setId=base1 --dry-run
 *
 * What it does:
 *   1. Resolves setId → (categoryId, headingId) via psa-headings.mjs
 *   2. POST psacard.com/Pop/GetSetItems → fetch all entries (1 request, 487+ items)
 *   3. Maps each entry to a card_ref in our DB via psa-mapper.mjs
 *   4. Inserts into psa_pop_reports
 *   5. Logs to sync_logs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { mapToCardRef, stripSubjectSuffix } from './lib/psa-mapper.mjs'
import { getPsaConfig } from './lib/psa-headings.mjs'
import { fetchPsaSetAllPages } from './lib/psa-fetcher.mjs'

// ─── CLI args ───────────────────────────────────────────
const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)

const setId = args.setId
const dryRun = !!args['dry-run']

if (!setId) {
  console.error('❌ Usage: node scripts/scrape-psa-set.mjs --setId=base1 [--dry-run]')
  process.exit(1)
}

// ─── Init Supabase ──────────────────────────────────────
const env = readFileSync('.env.local', 'utf-8')
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(supabaseUrl, supabaseKey)

// ─── Fetch PSA data (via Puppeteer + stealth) ──────────
async function fetchPsaSet({ categoryId, headingId, label }) {
  console.log(`📡 Fetching PSA pop for "${label}" (heading=${headingId})...`)
  const { data, recordsTotal, source } = await fetchPsaSetAllPages({
    categoryId,
    headingId,
    verbose: true,
  })
  console.log(`✅ Received ${recordsTotal} entries (source: ${source})`)
  return data
}

// ─── Preload canonical card_refs from DB (multi-language) ──
async function preloadCardRefs(setId) {
  // tcg_cards uses language-prefixed set_ids: en-base1, fr-base1, jp-base1.
  // We need any of them to confirm the card exists.
  // The result Set contains canonical refs (no lang prefix): "base1-4".
  const { data, error } = await sb
    .from('tcg_cards')
    .select('local_id')
    .or(`set_id.eq.en-${setId},set_id.eq.fr-${setId},set_id.eq.jp-${setId}`)

  if (error) throw error

  const refs = new Set()
  for (const row of data || []) {
    if (row.local_id) refs.add(`${setId}-${row.local_id}`)
  }
  console.log(`📦 Preloaded ${refs.size} canonical card_refs for "${setId}" (multi-lang)`)
  return refs
}

// ─── Transform PSA entry → DB row ───────────────────────
function transformEntry(entry, setId, knownCardRefs, sourceUrl) {
  const cleanSubject = stripSubjectSuffix(entry.SubjectName)
  const cardNumber = entry.CardNumber || ''

  const { card_ref, confidence, bucket } = mapToCardRef({
    setId,
    cardNumber,
    variety: entry.Variety || '',
    knownCardRefs,
  })

  return {
    card_ref,
    psa_spec_id: String(entry.SpecID),
    variety: entry.Variety || null,
    subject_name: entry.SubjectName || null,
    card_number: cardNumber || null,

    pop_1: entry.Grade1 ?? null,
    pop_1_5: entry.Grade1_5 ?? null,
    pop_2: entry.Grade2 ?? null,
    pop_2_5: entry.Grade2_5 ?? null,
    pop_3: entry.Grade3 ?? null,
    pop_3_5: entry.Grade3_5 ?? null,
    pop_4: entry.Grade4 ?? null,
    pop_4_5: entry.Grade4_5 ?? null,
    pop_5: entry.Grade5 ?? null,
    pop_5_5: entry.Grade5_5 ?? null,
    pop_6: entry.Grade6 ?? null,
    pop_6_5: entry.Grade6_5 ?? null,
    pop_7: entry.Grade7 ?? null,
    pop_7_5: entry.Grade7_5 ?? null,
    pop_8: entry.Grade8 ?? null,
    pop_8_5: entry.Grade8_5 ?? null,
    pop_9: entry.Grade9 ?? null,
    pop_9_5: null, // PSA doesn't expose 9.5 directly in this API
    pop_10: entry.Grade10 ?? null,

    pop_authentic: entry.GradeN0 ?? null,

    // Store qualified grades + half grades as JSONB metadata
    pop_qualifier: {
      Grade1Q: entry.Grade1Q ?? 0,
      Grade1_5Q: entry.Grade1_5Q ?? 0,
      Grade2Q: entry.Grade2Q ?? 0,
      Grade3Q: entry.Grade3Q ?? 0,
      Grade3_5Q: entry.Grade3_5Q ?? 0,
      Grade4Q: entry.Grade4Q ?? 0,
      Grade5Q: entry.Grade5Q ?? 0,
      Grade6Q: entry.Grade6Q ?? 0,
      Grade7Q: entry.Grade7Q ?? 0,
      Grade8Q: entry.Grade8Q ?? 0,
      Grade9Q: entry.Grade9Q ?? 0,
      HalfGradeTotal: entry.HalfGradeTotal ?? 0,
      QualifiedGradeTotal: entry.QualifiedGradeTotal ?? 0,
      _mapping_confidence: confidence,
      _mapping_bucket: bucket,
    },

    pop_total: entry.GradeTotal ?? entry.Total ?? 0,
    source_url: sourceUrl,
  }
}

// ─── Main ───────────────────────────────────────────────
async function main() {
  const startTime = Date.now()
  const config = getPsaConfig(setId)
  const sourceUrl = `https://www.psacard.com/pop/tcg-cards/heading/${config.headingId}`

  // 1. Fetch PSA data
  const entries = await fetchPsaSet(config)

  // Skip the first row if it's the "TOTAL POPULATION" aggregate
  const cardEntries = entries.filter(e => e.SpecID && e.SpecID !== 0)
  console.log(`🃏 Filtered to ${cardEntries.length} card entries (excluded aggregate row)`)

  // 2. Preload card_refs for this set base
  const knownCardRefs = await preloadCardRefs(setId)

  // 3. Transform
  const rows = cardEntries.map(e => transformEntry(e, setId, knownCardRefs, sourceUrl))

  // Stats
  const stats = {
    total: rows.length,
    matched: rows.filter(r => knownCardRefs.has(r.card_ref)).length,
    orphans: rows.filter(r => !knownCardRefs.has(r.card_ref)).length,
    bucketed: {},
  }
  for (const r of rows) {
    const b = r.pop_qualifier._mapping_bucket
    stats.bucketed[b] = (stats.bucketed[b] || 0) + 1
  }

  console.log('\n📊 Mapping stats:')
  console.log(`   Total rows:    ${stats.total}`)
  console.log(`   Matched (DB):  ${stats.matched} (confidence 1.0)`)
  console.log(`   Orphans:       ${stats.orphans} (confidence 0.5)`)
  console.log(`   By bucket:    `, stats.bucketed)

  if (dryRun) {
    console.log('\n🧪 DRY RUN — first 5 rows:')
    console.log(JSON.stringify(rows.slice(0, 5), null, 2))
    console.log('\n✋ Skipped DB insert (--dry-run)')
    return
  }

  // 4. Insert (upsert based on uniqueness constraint)
  console.log(`\n💾 Inserting ${rows.length} rows...`)
  const { error } = await sb.from('psa_pop_reports').insert(rows)
  if (error) {
    console.error('❌ Insert failed:', error)
    throw error
  }

  // 5. Log to sync_logs
  await sb.from('sync_logs').insert({
    job_name: `psa_pop_${setId}`,
    status: 'success',
    metadata: {
      setId,
      heading_id: config.headingId,
      label: config.label,
      items_processed: rows.length,
      duration_ms: Date.now() - startTime,
      stats,
    },
  }).then(({ error: e }) => {
    if (e) console.warn('⚠️  sync_logs insert failed (non-fatal):', e.message)
  })

  console.log(`\n✅ Done in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
}

main().catch(err => {
  console.error('💥 Fatal:', err)
  process.exit(1)
})
