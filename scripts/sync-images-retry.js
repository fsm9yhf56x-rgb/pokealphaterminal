const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtheycxwbkweehfezyem.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const TCGDEX_ASSETS = 'https://assets.tcgdex.net'
const POKEMONTCG_API = 'https://api.pokemontcg.io/v2'
const DELAY = 150
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch { return null }
}

async function tryDownload(url) {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 500) return null // too small = error page
    return { buffer, contentType: res.headers.get('content-type') || 'image/webp' }
  } catch { return null }
}

async function imageExists(storagePath) {
  const parts = storagePath.split('/')
  const folder = parts.slice(0, -1).join('/')
  const file = parts[parts.length - 1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function uploadBuffer(buffer, contentType, storagePath) {
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, { contentType, upsert: true })
  return !error
}

// Build list of all missing images
async function findMissing(langCode) {
  const sets = await fetchJSON(`https://api.tcgdex.net/v2/${langCode}/sets`)
  if (!sets) return []
  
  const missing = []
  for (const set of sets) {
    const setData = await fetchJSON(`https://api.tcgdex.net/v2/${langCode}/sets/${set.id}`)
    if (!setData?.cards) continue
    
    for (const card of setData.cards) {
      const storagePath = `${langCode}/${set.id}/${card.localId}.webp`
      const exists = await imageExists(storagePath)
      if (!exists) {
        missing.push({
          setId: set.id,
          setName: set.name,
          localId: card.localId,
          cardId: card.id || `${set.id}-${card.localId}`,
          name: card.name,
          image: card.image,
          storagePath,
          langCode,
        })
      }
      await sleep(20)
    }
  }
  return missing
}

async function tryAllSources(card) {
  const { langCode, setId, localId, image } = card
  
  // Source 1: TCGDex /low.webp (instead of /high.webp)
  const lowUrl = image 
    ? `${image}/low.webp`
    : `${TCGDEX_ASSETS}/${langCode}/${setId}/${localId}/low.webp`
  let result = await tryDownload(lowUrl)
  if (result) return result

  // Source 2: TCGDex /high.png
  const pngUrl = image
    ? `${image}/high.png`
    : `${TCGDEX_ASSETS}/${langCode}/${setId}/${localId}/high.png`
  result = await tryDownload(pngUrl)
  if (result) return result

  // Source 3: TCGDex EN fallback (for FR missing)
  if (langCode === 'fr') {
    const enHigh = `${TCGDEX_ASSETS}/en/${setId}/${localId}/high.webp`
    result = await tryDownload(enHigh)
    if (result) return result
    
    const enLow = `${TCGDEX_ASSETS}/en/${setId}/${localId}/low.webp`
    result = await tryDownload(enLow)
    if (result) return result
  }

  // Source 4: PokemonTCG.io API (EN only, maps set IDs differently)
  // Map TCGDex set IDs to pokemontcg.io format
  const ptcgSetMap = {
    'base1':'base1','base2':'base2','base3':'base3','base4':'base4','base5':'base5',
    'gym1':'gym1','gym2':'gym2','neo1':'neo1','neo2':'neo2','neo3':'neo3','neo4':'neo4',
    'ecard1':'ecard1','ecard2':'ecard2','ecard3':'ecard3',
    'ex1':'ex1','ex2':'ex2','ex3':'ex3','ex4':'ex4','ex5':'ex5','ex6':'ex6',
    'ex7':'ex7','ex8':'ex8','ex9':'ex9','ex10':'ex10','ex11':'ex11','ex12':'ex12',
    'ex13':'ex13','ex14':'ex14','ex15':'ex15','ex16':'ex16',
    'dp1':'dp1','dp2':'dp2','dp3':'dp3','dp4':'dp4','dp5':'dp5','dp6':'dp6','dp7':'dp7',
    'pl1':'pl1','pl2':'pl2','pl3':'pl3','pl4':'pl4',
    'hgss1':'hgss1','hgss2':'hgss2','hgss3':'hgss3','hgss4':'hgss4',
    'bw1':'bw1','bw2':'bw2','bw3':'bw3','bw4':'bw4','bw5':'bw5',
    'bw6':'bw6','bw7':'bw7','bw8':'bw8','bw9':'bw9','bw10':'bw10','bw11':'bw11',
    'xy1':'xy1','xy2':'xy2','xy3':'xy3','xy4':'xy4','xy5':'xy5','xy6':'xy6',
    'xy7':'xy7','xy8':'xy8','xy9':'xy9','xy10':'xy10','xy11':'xy11','xy12':'xy12',
    'sm1':'sm1','sm2':'sm2','sm3':'sm3','sm4':'sm4','sm5':'sm5','sm6':'sm6',
    'sm7':'sm7','sm8':'sm8','sm9':'sm9','sm10':'sm10','sm11':'sm11','sm12':'sm12',
    'swsh1':'swsh1','swsh2':'swsh2','swsh3':'swsh3','swsh4':'swsh4','swsh5':'swsh5',
    'swsh6':'swsh6','swsh7':'swsh7','swsh8':'swsh8','swsh9':'swsh9',
    'swsh10':'swsh10','swsh11':'swsh11','swsh12':'swsh12',
    'sv01':'sv1','sv02':'sv2','sv03':'sv3','sv04':'sv4','sv05':'sv5',
    'sv06':'sv6','sv07':'sv7','sv08':'sv8','sv09':'sv9','sv10':'sv10',
  }
  
  const ptcgSet = ptcgSetMap[setId]
  if (ptcgSet) {
    const ptcgId = `${ptcgSet}-${localId}`
    const cardData = await fetchJSON(`${POKEMONTCG_API}/cards/${ptcgId}`)
    if (cardData?.data?.images?.large) {
      result = await tryDownload(cardData.data.images.large)
      if (result) return result
    }
    if (cardData?.data?.images?.small) {
      result = await tryDownload(cardData.data.images.small)
      if (result) return result
    }
  }

  return null
}

async function main() {
  console.log('PokéAlpha Image Retry — Finding missing images...\n')

  for (const lang of [{ code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' }]) {
    console.log(`═══ Scanning ${lang.label} for missing images ═══`)
    const missing = await findMissing(lang.code)
    console.log(`Found ${missing.length} missing images\n`)

    if (missing.length === 0) continue

    let recovered = 0, stillMissing = 0

    for (let i = 0; i < missing.length; i++) {
      const card = missing[i]
      const result = await tryAllSources(card)
      
      if (result) {
        const ok = await uploadBuffer(result.buffer, result.contentType, card.storagePath)
        if (ok) {
          recovered++
          // Upsert tcg_cards
          await supabase.from('tcg_cards').upsert({
            id: card.cardId,
            set_id: card.setId,
            local_id: card.localId,
            name: card.name,
            lang: lang.label,
            image_local: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${card.storagePath}`,
            synced_at: new Date().toISOString(),
          }, { onConflict: 'id' })
          
          if (recovered % 10 === 0) process.stdout.write(`  ${recovered} recovered...\r`)
        } else {
          stillMissing++
        }
      } else {
        stillMissing++
      }
      
      await sleep(DELAY)
    }

    console.log(`\n${lang.label}: ${recovered} recovered, ${stillMissing} still missing out of ${missing.length}`)
  }

  console.log('\n✅ Retry complete')
}

main().catch(console.error)
