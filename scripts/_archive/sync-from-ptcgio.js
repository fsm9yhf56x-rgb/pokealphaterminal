const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const DELAY = 120
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Map TCGDex set IDs → PokemonTCG.io set IDs
const SET_MAP = {
  // EN missing sets
  'sm3.5':'sm35', 'sm7.5':'sm75', 'cel25':'cel25',
  'smp':'smp', 'swshp':'swshp', 'svp':'svp', 'mep':'mep',
  'hgssp':'hsp', 'bwp':'bwp', 'xyp':'xyp', 'np':'np', 'dpp':'dpp',
  '2021swsh':'mcd21', '2022swsh':'mcd22', '2023sv':'mcd23',
  '2024sv':'mcd24', '2011bw':'mcd11', '2012bw':'mcd12',
  '2014xy':'mcd14', '2015xy':'mcd15', '2016xy':'mcd16',
  '2017sm':'mcd17', '2018sm':'mcd18', '2019sm':'mcd19',
  'tk-bw-e':'tk1a', 'tk-bw-z':'tk1b', 'tk-xy-sy':'tk2a', 'tk-xy-n':'tk2b',
  'tk-xy-b':'tk2a', 'tk-xy-w':'tk2b', 'tk-xy-latio':'tk2a', 'tk-xy-latia':'tk2b',
  'tk-xy-su':'tk2a', 'tk-xy-p':'tk2b', 'tk-sm-r':'tk2a', 'tk-sm-l':'tk2b',
  'tk-ex-m':'tk1a', 'tk-ex-p':'tk1b', 'tk-dp-m':'tk1a', 'tk-dp-l':'tk1b',
  'tk-ex-latio':'tk1a', 'tk-ex-latia':'tk1b', 'tk-hs-g':'tk1a', 'tk-hs-r':'tk1b',
  'exu':'ex10', 'bog':'basep', 'xya':'xyp',
  'ecard2':'ecard2', 'ecard3':'ecard3',
  'pop6':'pop6', 'swsh4':'swsh4', 'B1a':'sv9', 'B2a':'sv10',
  'sve':'sve', 'mee':'sve',
  'sm115':'sm115', 'sma':'sma',
  'col1':'col1', 'det1':'det1',
  // FR specific
  '2018sm-fr':'mcd18', '2019sm-fr':'mcd19', '2013bw':'mcd12',
  'basep':'basep', 'A3b':'sv9', 'A4':'me3', 'A4a':'me3',
  'ex5.5':'ex5',
}

async function imageExistsInStorage(path) {
  const parts = path.split('/')
  const folder = parts.slice(0,-1).join('/')
  const file = parts[parts.length-1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function fetchAllCards(ptcgSetId) {
  let all = [], page = 1
  while (true) {
    try {
      const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${ptcgSetId}&pageSize=250&page=${page}`)
      const d = await r.json()
      if (!d.data?.length) break
      all.push(...d.data)
      if (d.data.length < 250) break
      page++
      await sleep(500) // respect rate limit
    } catch { break }
  }
  return all
}

async function downloadAndUpload(imageUrl, storagePath) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 500) return false
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: 'image/png', upsert: true
    })
    return !error
  } catch { return false }
}

async function main() {
  console.log('═══ Syncing missing images from PokemonTCG.io ═══\n')

  // Find all missing images
  for (const lang of ['en', 'fr']) {
    console.log(`\n── ${lang.toUpperCase()} ──`)
    
    const tcgdexSets = await (await fetch(`https://api.tcgdex.net/v2/${lang}/sets`)).json()
    let totalRecovered = 0, totalStillMissing = 0

    for (const set of tcgdexSets) {
      const setData = await (await fetch(`https://api.tcgdex.net/v2/${lang}/sets/${set.id}`)).json()
      if (!setData?.cards) continue

      // Check which cards are missing
      const missing = []
      for (const card of setData.cards) {
        const path = `${lang}/${set.id}/${card.localId}.webp`
        const exists = await imageExistsInStorage(path)
        if (!exists) missing.push(card)
        await sleep(10)
      }
      if (missing.length === 0) continue

      // Find matching PokemonTCG.io set
      const ptcgSetId = SET_MAP[set.id]
      if (!ptcgSetId) {
        totalStillMissing += missing.length
        continue
      }

      // Fetch cards from PokemonTCG.io
      const ptcgCards = await fetchAllCards(ptcgSetId)
      if (ptcgCards.length === 0) {
        totalStillMissing += missing.length
        continue
      }

      let setRecovered = 0
      for (const card of missing) {
        const localId = card.localId
        
        // Try multiple matching strategies
        let ptcgCard = ptcgCards.find(c => {
          const cNum = c.number?.replace(/^0+/, '')
          const lId = localId?.replace(/^0+/, '')
          return cNum === lId || c.number === localId
        })
        
        if (!ptcgCard) {
          // Try by name similarity
          ptcgCard = ptcgCards.find(c => 
            c.name.toLowerCase().includes(card.name?.toLowerCase()?.split(' ')[0] || '???')
          )
        }

        if (ptcgCard?.images?.large) {
          const storagePath = `${lang}/${set.id}/${localId}.webp`
          const ok = await downloadAndUpload(ptcgCard.images.large, storagePath)
          if (ok) {
            setRecovered++
            totalRecovered++
          } else {
            totalStillMissing++
          }
        } else if (ptcgCard?.images?.small) {
          const storagePath = `${lang}/${set.id}/${localId}.webp`
          const ok = await downloadAndUpload(ptcgCard.images.small, storagePath)
          if (ok) { setRecovered++; totalRecovered++ } else { totalStillMissing++ }
        } else {
          totalStillMissing++
        }
        await sleep(DELAY)
      }

      if (setRecovered > 0) {
        console.log(`  ${set.id} (${set.name}): ${setRecovered}/${missing.length} recovered`)
      }
    }

    console.log(`\n${lang.toUpperCase()} total: ${totalRecovered} recovered, ${totalStillMissing} still missing`)
  }

  console.log('\n✅ PokemonTCG.io sync complete')
}

main().catch(console.error)
