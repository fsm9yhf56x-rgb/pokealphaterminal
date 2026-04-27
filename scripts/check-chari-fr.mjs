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

console.log('🔥 Recherche large de Charizard / Dracaufeu :\n')

// Search by exact card num 4 in FR base1
const { data: byNum } = await sb.from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .eq('set_id', 'fr-base1').eq('local_id', '4')
console.log('fr-base1 #4:', JSON.stringify(byNum, null, 2))

// Search Dracaufeu
const { data: dracau } = await sb.from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .ilike('name', '%dracaufeu%')
console.log('\nName ilike Dracaufeu:', JSON.stringify(dracau?.slice(0,5), null, 2))

// All Charizard / Charizard-like
const { data: charis } = await sb.from('tcg_cards')
  .select('id, set_id, local_id, name, lang')
  .or('name.ilike.%charizard%,name.ilike.%dracaufeu%')
  .limit(10)
console.log('\nAll Charizard/Dracaufeu (10 first):', JSON.stringify(charis, null, 2))
