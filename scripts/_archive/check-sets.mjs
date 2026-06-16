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
