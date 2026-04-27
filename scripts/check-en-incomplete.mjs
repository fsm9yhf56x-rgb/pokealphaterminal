import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const { data: enSets } = await sb.from('tcg_sets').select('id, name, total_cards').eq('lang', 'EN').order('id')

const incomplete = []
for (const s of enSets || []) {
  const { count } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.id)
  if (count < (s.total_cards || 0) && s.total_cards > 0) {
    incomplete.push({ ...s, count, missing: s.total_cards - count })
  }
}
console.log(`━━━ ${incomplete.length} EN sets incomplets ━━━`)

let syncable = 0, notFound = 0
for (const s of incomplete) {
  const tcgdexId = s.id.replace(/^en-/, '')
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/en/sets/${tcgdexId}`)
    if (r.ok) {
      const set = await r.json()
      const tcgdexCount = set.cardCount?.total || 0
      const status = tcgdexCount >= s.total_cards ? '✅' : (tcgdexCount > 0 ? '🟡' : '❌')
      console.log(`  ${status} [${s.id.padEnd(30)}] DB=${String(s.count).padStart(3)} expected=${String(s.total_cards).padStart(3)} | TCGdex=${tcgdexCount}`)
      if (tcgdexCount > 0) syncable++
      else notFound++
    } else {
      console.log(`  ❌ [${s.id.padEnd(30)}] TCGdex ${r.status}`)
      notFound++
    }
  } catch (e) {
    console.log(`  ⚠️  [${s.id.padEnd(30)}] ERR ${e.message.slice(0, 30)}`)
    notFound++
  }
  await new Promise(r => setTimeout(r, 250))
}

console.log(`\n━━━ Summary ━━━`)
console.log(`✅ Syncable from TCGdex: ${syncable}`)
console.log(`❌ Not in TCGdex:        ${notFound}`)
