import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const { count } = await sb.from('psa_pop_reports').select('*', { count: 'exact', head: true })
console.log(`📊 Total PSA pop rows: ${count}`)

const { data: bySet } = await sb.from('psa_pop_reports').select('card_ref')
const setCounts = {}
for (const r of bySet || []) {
  const setId = r.card_ref.replace(/-\d+.*$/, '')
  setCounts[setId] = (setCounts[setId] || 0) + 1
}
console.log('\n📦 Rows per set:')
for (const [s, c] of Object.entries(setCounts).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${s.padEnd(10)} ${String(c).padStart(4)} rows`)
}

console.log('\n💎 Top 10 plus rares en PSA 10 (toutes cartes ≥1000 graded):')
const { data: rare } = await sb
  .from('psa_pop_latest')
  .select('card_ref, variety, subject_name, pop_10, pop_total, pct_gem_mint, gem_mint_tier')
  .gte('pop_total', 1000)
  .order('pct_gem_mint', { ascending: true })
  .limit(10)

for (const r of rare || []) {
  console.log(
    `  ${r.card_ref.padEnd(15)} ${(r.variety || 'Unlimited').padEnd(20)} ` +
    `PSA10=${String(r.pop_10).padEnd(4)} / ${String(r.pop_total).padEnd(7)} ` +
    `(${r.pct_gem_mint}% gem) [${r.gem_mint_tier}]`
  )
}
