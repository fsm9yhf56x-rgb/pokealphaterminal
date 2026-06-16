const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}
async function imageExists(path) {
  const parts = path.split('/')
  const folder = parts.slice(0,-1).join('/')
  const file = parts[parts.length-1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function main() {
  const missing = { en: {}, fr: {} }
  
  for (const lang of ['en','fr']) {
    const sets = await fetchJSON(`https://api.tcgdex.net/v2/${lang}/sets`)
    if (!sets) continue
    for (const set of sets) {
      const sd = await fetchJSON(`https://api.tcgdex.net/v2/${lang}/sets/${set.id}`)
      if (!sd?.cards) continue
      let count = 0
      for (const c of sd.cards) {
        const exists = await imageExists(`${lang}/${set.id}/${c.localId}.webp`)
        if (!exists) count++
        await sleep(10)
      }
      if (count > 0) missing[lang][`${set.id} (${set.name})`] = count
    }
  }

  console.log('\n═══ MISSING EN ═══')
  Object.entries(missing.en).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${v}\t${k}`))
  console.log(`  TOTAL: ${Object.values(missing.en).reduce((a,b)=>a+b,0)}`)

  console.log('\n═══ MISSING FR ═══')
  Object.entries(missing.fr).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${v}\t${k}`))
  console.log(`  TOTAL: ${Object.values(missing.fr).reduce((a,b)=>a+b,0)}`)
}

main().catch(console.error)
