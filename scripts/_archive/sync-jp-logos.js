const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const BASE = 'https://www.pokemon-card.com'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('═══ Downloading JP set logos ═══\n')

  const sets = JSON.parse(fs.readFileSync('public/data/sets-JP.json', 'utf8'))
  console.log(`${sets.length} JP sets to check\n`)

  let downloaded = 0, notFound = 0, alreadyHad = 0

  for (const set of sets) {
    const setCode = set.id
    const logoUrl = `${BASE}/assets/images/card/regulation_logo_1/${setCode}.gif`
    const storagePath = `jp-logos/${setCode}.gif`

    // Check if already in storage
    const { data: existing } = await supabase.storage.from(BUCKET).list('jp-logos', { search: `${setCode}.gif` })
    if (existing && existing.length > 0) { alreadyHad++; continue }

    // Download
    try {
      const res = await fetch(logoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      })
      if (!res.ok) { notFound++; continue }
      const buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length < 100) { notFound++; continue }

      const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
        contentType: 'image/gif', upsert: true
      })
      if (!error) {
        downloaded++
        set.logo = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
      }
    } catch { notFound++ }

    await sleep(100)
  }

  // Also try alternate patterns for sets without logos
  const noLogo = sets.filter(s => !s.logo)
  console.log(`\nFirst pass: ${downloaded} downloaded, ${notFound} not found, ${alreadyHad} already had`)
  console.log(`Still missing: ${noLogo.length} sets\n`)

  // Try alternate URL patterns
  let altFound = 0
  for (const set of noLogo) {
    const alts = [
      `${BASE}/assets/images/card/regulation_logo_1/${set.id.toLowerCase()}.gif`,
      `${BASE}/assets/images/card/regulation_logo_1/${set.id.toUpperCase()}.gif`,
      `${BASE}/assets/images/card/regulation_logo_1/${set.id.replace(/-/g, '')}.gif`,
    ]
    for (const url of alts) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
        })
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer())
          if (buffer.length < 100) continue
          const storagePath = `jp-logos/${set.id}.gif`
          const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
            contentType: 'image/gif', upsert: true
          })
          if (!error) {
            set.logo = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`
            altFound++
            break
          }
        }
      } catch {}
      await sleep(50)
    }
  }

  console.log(`Alt patterns: ${altFound} more found`)

  // For sets still without logo, try EN logos as fallback
  const enSets = JSON.parse(fs.readFileSync('public/data/sets-EN.json', 'utf8'))
  const enLogoMap = new Map(enSets.filter(s => s.logo).map(s => [s.id, s.logo]))

  // JP → EN set ID mapping for logo fallback
  const JP_EN = {
    SV1S:'sv01',SV1V:'sv01',SV2D:'sv02',SV2P:'sv02',SV2a:'sv03.5',SV3:'sv03',SV3a:'sv03',
    SV4K:'sv04',SV4M:'sv04',SV4a:'sv04.5',SV5K:'sv05',SV5M:'sv05',SV5a:'sv05',
    SV6:'sv06',SV6a:'sv06.5',SV7:'sv07',SV7a:'sv07',SV8:'sv08',SV8a:'sv08.5',
    SV9:'sv09',SV9a:'sv09',SV10:'sv10',SV11B:'sv10.5b',SV11W:'sv10.5w',
    S1H:'swsh1',S1W:'swsh1',S2:'swsh2',S3:'swsh3',S4:'swsh4',S8:'swsh8',S9:'swsh10',S12:'swsh12',
    SM1S:'sm1',SM1M:'sm1',SM6:'sm6',SM7:'sm7',SM8:'sm8',SM9:'sm9',SM10:'sm10',SM11:'sm11',
    M1S:'me01',M2:'me02',M2a:'me02.5',M3:'me03',M4:'me03',
    PMCG1:'base1',PMCG2:'base2',PMCG3:'base3',PMCG4:'base5',
    neo1:'neo1',neo2:'neo2',neo3:'neo3',neo4:'neo4',
    DP1:'dp1',DP2:'dp2',DP3:'dp3',BW:'bw1',
  }

  let enFallback = 0
  for (const set of sets) {
    if (set.logo) continue
    const enId = JP_EN[set.id]
    if (enId && enLogoMap.has(enId)) {
      set.logo = enLogoMap.get(enId)
      enFallback++
    }
  }
  console.log(`EN fallback logos: ${enFallback}`)

  // Write updated sets
  const withLogo = sets.filter(s => s.logo).length
  const withDate = sets.filter(s => s.releaseDate).length
  const withSerie = sets.filter(s => s.serie && s.serie !== 'Autre').length

  fs.writeFileSync('public/data/sets-JP.json', JSON.stringify(sets))
  console.log(`\n✅ Final: ${withLogo} logos, ${withDate} dates, ${withSerie} series out of ${sets.length} sets`)
}

main().catch(console.error)
