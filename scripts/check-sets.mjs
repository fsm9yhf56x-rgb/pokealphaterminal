import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const { data, error } = await sb
  .from('tcg_sets')
  .select('id, name, lang, total_cards, release_date')
  .order('release_date', { ascending: true, nullsFirst: false })
  .limit(50)

if (error) { console.error(error); process.exit(1) }

console.log('TOTAL SETS:', data.length)
console.log('---')
for (const s of data.slice(0, 30)) {
  console.log(`${(s.id||'').padEnd(25)} ${(s.name||'').padEnd(40)} ${s.lang} ${s.total_cards || '?'} cards · ${s.release_date || '?'}`)
}
