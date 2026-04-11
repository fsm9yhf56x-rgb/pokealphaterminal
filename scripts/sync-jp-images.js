const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const BASE = 'https://www.pokemon-card.com'
const DELAY = 200
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(page) {
  // Empty keyword + no regulation = ALL cards
  const url = `${BASE}/card-search/resultAPI.php?keyword=&page=${page}`
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

async function downloadAndUpload(imageUrl, storagePath) {
  try {
    const res = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.length < 1000) return false
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType: 'image/jpeg', upsert: true
    })
    return !error
  } catch { return false }
}

async function imageExists(path) {
  const parts = path.split('/')
  const folder = parts.slice(0,-1).join('/')
  const file = parts[parts.length-1]
  const { data } = await supabase.storage.from(BUCKET).list(folder, { search: file })
  return data && data.length > 0
}

async function main() {
  console.log('═══ Syncing JP images from pokemon-card.com (official) ═══\n')

  // First, get total count
  const first = await fetchPage(1)
  if (!first || !first.result) {
    console.error('Failed to fetch first page')
    return
  }

  const totalCards = first.hitCnt
  const maxPage = first.maxPage
  const cardsPerPage = first.cardList.length

  console.log(`Total JP cards: ${totalCards}`)
  console.log(`Pages: ${maxPage} (${cardsPerPage} per page)\n`)

  let totalUploaded = 0, totalSkipped = 0, totalFailed = 0
  const setsSeen = new Set()

  for (let page = 1; page <= maxPage; page++) {
    const data = page === 1 ? first : await fetchPage(page)
    if (!data?.cardList) { console.log(`  Page ${page} failed, skipping`); continue }

    for (const card of data.cardList) {
      const cardId = card.cardID
      const thumbPath = card.cardThumbFile // e.g. /assets/images/card_images/large/SV2P/043689_T_PINIXYA.jpg
      const name = card.cardNameAltText || card.cardNameViewText || ''

      if (!thumbPath) { totalFailed++; continue }

      // Extract set code from path: /assets/images/card_images/large/{SET}/...
      const pathParts = thumbPath.split('/')
      const setCode = pathParts[pathParts.length - 2] || 'unknown'
      const fileName = pathParts[pathParts.length - 1]
      
      setsSeen.add(setCode)

      const storagePath = `jp/${setCode}/${cardId}.jpg`

      // Check if already exists
      const exists = await imageExists(storagePath)
      if (exists) { totalSkipped++; continue }

      // Download and upload
      const imageUrl = `${BASE}${thumbPath}`
      const ok = await downloadAndUpload(imageUrl, storagePath)
      
      if (ok) {
        totalUploaded++

        // Upsert into tcg_cards
        await supabase.from('tcg_cards').upsert({
          id: `jp-${cardId}`,
          set_id: `jp-${setCode}`,
          local_id: cardId,
          name: name,
          lang: 'JP',
          image_url: imageUrl,
          image_local: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } else {
        totalFailed++
      }

      await sleep(DELAY)
    }

    if (page % 10 === 0 || page === maxPage) {
      console.log(`  Page ${page}/${maxPage} — ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalFailed} failed`)
    }
  }

  console.log(`\n═══ JP Sets found: ${setsSeen.size} ═══`)
  console.log([...setsSeen].sort().join(', '))

  // Upsert JP sets into tcg_sets
  for (const setCode of setsSeen) {
    await supabase.from('tcg_sets').upsert({
      id: `jp-${setCode}`,
      name: setCode,
      lang: 'JP',
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  console.log(`\n✅ JP sync complete: ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalFailed} failed`)
}

main().catch(console.error)
