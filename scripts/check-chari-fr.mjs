import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
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
