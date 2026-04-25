import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

// 1. Total count
const { count } = await sb.from('psa_pop_reports').select('*', { count: 'exact', head: true })
console.log(`✅ Total rows in psa_pop_reports: ${count}`)

// 2. Distinct card_refs
const { data: refs } = await sb.from('psa_pop_reports').select('card_ref')
console.log(`📦 Distinct card_refs: ${new Set(refs.map(r => r.card_ref)).size}`)

// 3. Charizard variants (base1-4)
console.log('\n🔥 Charizard (base1-4) — toutes les variantes PSA :')
const { data: charizard } = await sb
  .from('psa_pop_reports')
  .select('variety, pop_10, pop_total, psa_spec_id')
  .eq('card_ref', 'base1-4')
  .order('pop_total', { ascending: false })

for (const row of charizard || []) {
  const pct = row.pop_total > 0 ? ((row.pop_10 / row.pop_total) * 100).toFixed(2) : 'N/A'
  console.log(
    `  ${(row.variety || 'Unlimited').padEnd(25)} → ` +
    `PSA10=${String(row.pop_10).padEnd(6)} ` +
    `Total=${String(row.pop_total).padEnd(7)} ` +
    `(${pct}% gem mint) ` +
    `[spec=${row.psa_spec_id}]`
  )
}

// 4. Top 5 cartes les plus rares en PSA 10 du set
console.log('\n💎 Top 5 cartes les plus rares en PSA 10 (Holo, ≥500 graded) :')
const { data: rare } = await sb
  .from('psa_pop_reports')
  .select('card_ref, variety, subject_name, pop_10, pop_total')
  .eq('card_ref', 'base1-1')  // start with Alakazam to test
  .gte('pop_total', 500)
  .order('pop_10', { ascending: true })
  .limit(5)

console.log(JSON.stringify(rare, null, 2))

// 5. Test psa_pop_latest view
console.log('\n📊 View psa_pop_latest (Charizard variants) :')
const { data: latest } = await sb
  .from('psa_pop_latest')
  .select('variety, pop_10, pop_total, pct_gem_mint, gem_mint_tier')
  .eq('card_ref', 'base1-4')
  .order('pop_total', { ascending: false })

for (const row of latest || []) {
  console.log(
    `  ${(row.variety || 'Unlimited').padEnd(25)} → ` +
    `${String(row.pop_10).padEnd(6)}/${row.pop_total} ` +
    `(${row.pct_gem_mint}% gem) [${row.gem_mint_tier}]`
  )
}
