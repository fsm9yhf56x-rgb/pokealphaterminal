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

// Check all variants of base1
console.log('🔍 Checking base1 variants in tcg_cards:\n')

for (const pattern of [
  'en-base1%', 'fr-base1%',
  'en-base1-shadowless%', 'fr-base1-shadowless%',
  'en-base1-1st%', 'fr-base1-1st%',
]) {
  const { count } = await sb
    .from('tcg_cards')
    .select('*', { count: 'exact', head: true })
    .like('set_id', pattern)
  console.log(`  set_id LIKE '${pattern}'  →  ${count} cards`)
}

// Sample of EN base1 to see local_id format
console.log('\n📋 Sample EN base1 (first 3):')
const { data: enSample } = await sb
  .from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .eq('set_id', 'en-base1')
  .limit(3)
console.log(JSON.stringify(enSample, null, 2))

// Sample of FR base1
console.log('\n📋 Sample FR base1 (first 3):')
const { data: frSample } = await sb
  .from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .eq('set_id', 'fr-base1')
  .limit(3)
console.log(JSON.stringify(frSample, null, 2))

// Charizard search
console.log('\n🔥 Charizard in base1 (any lang):')
const { data: chari } = await sb
  .from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .ilike('name', 'Charizard%')
  .like('set_id', '%base1%')
console.log(JSON.stringify(chari, null, 2))
