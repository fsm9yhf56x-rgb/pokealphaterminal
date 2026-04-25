import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

// Sample row: Charizard Unlimited (base1-4 Holo)
const { data } = await sb
  .from('psa_pop_reports')
  .select('*')
  .eq('card_ref', 'base1-4')
  .is('variety', null)
  .limit(1)

if (data && data[0]) {
  const row = data[0]
  console.log('🔍 Charizard Base Set Holo Unlimited — toutes les colonnes pop_*:\n')

  const popCols = Object.keys(row).filter(k => k.startsWith('pop_'))
  for (const col of popCols) {
    console.log(`  ${col.padEnd(20)} ${row[col]}`)
  }

  console.log('\n📦 pop_qualifier (jsonb):')
  console.log(JSON.stringify(row.pop_qualifier, null, 2))
}
