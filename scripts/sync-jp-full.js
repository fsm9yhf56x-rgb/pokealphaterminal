const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const BASE = 'https://www.pokemon-card.com'
const DELAY = 200
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchPage(page, regulation) {
  const url = `${BASE}/card-search/resultAPI.php?keyword=&page=${page}${regulation ? '&regulation_sidebar_form=' + regulation : ''}`
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

async function syncRegulation(regulation, label) {
  console.log(`\n═══ Regulation: ${label} ═══`)
  
  const first = await fetchPage(1, regulation)
  if (!first?.result || !first.cardList?.length) {
    console.log('  No cards found')
    return { uploaded: 0, skipped: 0, failed: 0 }
  }

  const totalCards = first.hitCnt
  const maxPage = first.maxPage
  console.log(`  ${totalCards} cards, ${maxPage} pages`)

  let uploaded = 0, skipped = 0, failed = 0

  for (let page = 1; page <= maxPage; page++) {
    const data = page === 1 ? first : await fetchPage(page, regulation)
    if (!data?.cardList) continue

    for (const card of data.cardList) {
      const cardId = card.cardID
      const thumbPath = card.cardThumbFile
      const name = card.cardNameAltText || card.cardNameViewText || ''
      if (!thumbPath) { failed++; continue }

      const pathParts = thumbPath.split('/')
      const setCode = pathParts[pathParts.length - 2] || 'unknown'
      const storagePath = `jp/${setCode}/${cardId}.jpg`

      const exists = await imageExists(storagePath)
      if (exists) { skipped++; continue }

      const imageUrl = `${BASE}${thumbPath}`
      const ok = await downloadAndUpload(imageUrl, storagePath)
      
      if (ok) {
        uploaded++
        await supabase.from('tcg_cards').upsert({
          id: `jp-${cardId}`,
          set_id: `jp-${setCode}`,
          local_id: cardId,
          name,
          lang: 'JP',
          image_url: imageUrl,
          image_local: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } else { failed++ }

      await sleep(DELAY)
    }

    if (page % 20 === 0 || page === maxPage) {
      console.log(`  Page ${page}/${maxPage} — ${uploaded} new, ${skipped} skipped`)
    }
  }

  console.log(`  Done: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`)
  return { uploaded, skipped, failed }
}

async function main() {
  console.log('═══ FULL JP SYNC — All regulations ═══')

  // First discover all available regulations
  const first = await fetchPage(1, '')
  console.log(`Default regulation search: ${first?.hitCnt || 0} cards`)

  // Try different regulation values
  const regulations = [
    { code: 'all', label: 'All (no filter)' },
    { code: 'XY', label: 'XY regulation' },
    { code: 'SM', label: 'SM regulation' },
    { code: 'S', label: 'Sword & Shield regulation' },
    { code: 'SV', label: 'Scarlet & Violet regulation' },
    { code: 'BW', label: 'BW regulation' },
    { code: 'DP', label: 'DP regulation' },
    { code: 'none', label: 'No regulation (old cards)' },
  ]

  // First just check counts
  console.log('\nChecking card counts per regulation:')
  for (const reg of regulations) {
    const d = await fetchPage(1, reg.code)
    console.log(`  ${reg.label}: ${d?.hitCnt || 0} cards`)
    await sleep(300)
  }

  // Sync only regulations that have NEW cards (not already in XY default)
  const totals = { uploaded: 0, skipped: 0, failed: 0 }
  
  for (const reg of regulations) {
    const d = await fetchPage(1, reg.code)
    if (!d?.hitCnt || d.hitCnt <= 0) continue
    
    const r = await syncRegulation(reg.code, reg.label)
    totals.uploaded += r.uploaded
    totals.skipped += r.skipped
    totals.failed += r.failed
  }

  // Final count
  const { count } = await supabase.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('lang', 'JP')
  console.log(`\n✅ FULL JP SYNC COMPLETE`)
  console.log(`   New uploads: ${totals.uploaded}`)
  console.log(`   Skipped (already had): ${totals.skipped}`)
  console.log(`   Failed: ${totals.failed}`)
  console.log(`   Total JP cards in DB: ${count}`)
}

main().catch(console.error)
