import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

// Count rows per setId by direct LIKE matching
const SETS = ['base1','base2','base3','base4','base5','basep','gym1','gym2','neo1','neo2','neo3','neo4','lc','ecard1']

console.log('📦 Rows per set (precise):\n')
let total = 0
for (const s of SETS) {
  const { count } = await sb.from('psa_pop_reports').select('*', { count: 'exact', head: true })
    .like('card_ref', `${s}-%`)
  total += count || 0
  console.log(`  ${s.padEnd(10)} ${String(count).padStart(4)} rows`)
}
console.log(`  ${'─'.repeat(20)}`)
console.log(`  ${'TOTAL'.padEnd(10)} ${String(total).padStart(4)} rows`)

// Top 10 PSA 10 rarest with their actual subject names
console.log('\n💎 Top 10 cartes les + dures à GEM MINT (≥2000 gradées):\n')
const { data: rare } = await sb
  .from('psa_pop_latest')
  .select('card_ref, variety, subject_name, card_number, pop_10, pop_total, pct_gem_mint')
  .gte('pop_total', 2000)
  .order('pct_gem_mint', { ascending: true })
  .limit(10)

for (const r of rare || []) {
  const name = r.subject_name?.replace('-Holo','') || '?'
  console.log(
    `  ${r.card_ref.padEnd(14)} ${name.padEnd(20)} ${(r.variety || 'Unlimited').padEnd(22)}\n` +
    `  └ PSA10 ${String(r.pop_10).padStart(4)} / ${String(r.pop_total).padStart(6)}  →  ${r.pct_gem_mint}% gem\n`
  )
}
