import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Priority 1: process.env (GitHub Actions / production)
// Priority 2: .env.local (local dev)
let url = process.env.NEXT_PUBLIC_SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  try {
    const env = readFileSync('.env.local', 'utf-8')
    url = url || env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
    key = key || env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
  } catch {}
}
if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key)

const SETS = [
  'base1','base2','base3','base4','base5','basep',
  'gym1','gym2',
  'neo1','neo2','neo3','neo4',
  'lc','ecard1',
  'ex1','ex2','ex3','ex4','ex5','ex6','ex7','ex8','ex9','ex10','ex11','ex12','ex13','ex14','ex15','ex16',
]

console.log('PSA pop reports — distribution complète\n')
let total = 0
for (const s of SETS) {
  const { count } = await sb.from('psa_pop_reports').select('*', { count: 'exact', head: true })
    .like('card_ref', `${s}-%`)
  total += count || 0
  console.log(`  ${s.padEnd(8)} ${String(count).padStart(4)} rows`)
}
console.log('  ' + '─'.repeat(20))
console.log(`  TOTAL    ${String(total).padStart(4)} rows`)

console.log('\nTop 5 cartes EX era les + dures à GEM MINT (≥1500 graded):\n')
const { data: rare } = await sb.from('psa_pop_latest')
  .select('card_ref, variety, subject_name, pop_10, pop_total, pct_gem_mint')
  .or(SETS.filter(s => s.startsWith('ex')).map(s => `card_ref.like.${s}-%`).join(','))
  .gte('pop_total', 1500)
  .order('pct_gem_mint', { ascending: true })
  .limit(5)

for (const r of rare || []) {
  const name = r.subject_name?.replace('-Holo','') || '?'
  console.log(
    `  ${r.card_ref.padEnd(12)} ${name.padEnd(22)} ${(r.variety || 'Unlimited').padEnd(15)} → ` +
    `${String(r.pop_10).padStart(3)} / ${String(r.pop_total).padStart(5)} = ${r.pct_gem_mint}%`
  )
}
