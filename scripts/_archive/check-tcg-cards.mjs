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

// 1. Total count
const { count: total } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true })
console.log(`TOTAL cards in tcg_cards: ${total}`)

// 2. Sample 5 rows to see actual schema
const { data: sample } = await sb.from('tcg_cards').select('*').limit(5)
console.log('\n📋 Sample (first 5 rows):')
console.log(JSON.stringify(sample, null, 2))

// 3. Try filtering by likely set columns
console.log('\n🔍 Trying different filters:')

const { count: c1 } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).like('set_id', 'base1%')
console.log(`  set_id LIKE 'base1%': ${c1}`)

const { count: c2 } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', 'base1')
console.log(`  set_id = 'base1': ${c2}`)

// Check what set columns exist
if (sample && sample[0]) {
  const cols = Object.keys(sample[0])
  console.log(`\n🗂️  Available columns: ${cols.join(', ')}`)
  const setCols = cols.filter(c => c.toLowerCase().includes('set'))
  console.log(`   Set-related: ${setCols.join(', ')}`)
}
