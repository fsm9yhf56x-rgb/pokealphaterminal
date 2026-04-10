const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtheycxwbkweehfezyem.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY in env'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const TCGDEX = 'https://api.tcgdex.net/v2'
const ASSETS = 'https://assets.tcgdex.net'
const BUCKET = 'card-images'
const LANGS = [
  { code: 'en', label: 'EN' },
  { code: 'fr', label: 'FR' },
]
// JP has no images on TCGDex, we use EN fallback

const DELAY = 100 // ms between requests to be polite
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  const res = await fetch(url)
  if (!res.ok) return null
  return res.json()
}

async function imageExists(path) {
  const { data } = await supabase.storage.from(BUCKET).list(path.split('/').slice(0, -1).join('/'), {
    search: path.split('/').pop()
  })
  return data && data.length > 0
}

async function downloadAndUpload(imageUrl, storagePath) {
  try {
    const res = await fetch(imageUrl)
    if (!res.ok) return false
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') || 'image/webp'

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: true,
    })

    if (error) { console.error(`  Upload error ${storagePath}:`, error.message); return false }
    return true
  } catch (e) { console.error(`  Fetch error ${imageUrl}:`, e.message); return false }
}

async function syncLang(langCode, langLabel) {
  console.log(`\n═══ Syncing ${langLabel} (${langCode}) ═══`)

  const sets = await fetchJSON(`${TCGDEX}/${langCode}/sets`)
  if (!sets) { console.error('Failed to fetch sets'); return }

  console.log(`Found ${sets.length} sets`)
  let totalCards = 0, totalUploaded = 0, totalSkipped = 0, totalFailed = 0

  for (const set of sets) {
    const setData = await fetchJSON(`${TCGDEX}/${langCode}/sets/${set.id}`)
    if (!setData || !setData.cards) { continue }

    const cards = setData.cards
    let setUploaded = 0

    for (const card of cards) {
      totalCards++
      const cardId = card.id || `${set.id}-${card.localId}`
      const storagePath = `${langCode}/${set.id}/${card.localId}.webp`

      // Check if already uploaded
      const exists = await imageExists(storagePath)
      if (exists) { totalSkipped++; continue }

      // Build image URL
      let imageUrl = card.image
        ? `${card.image}/high.webp`
        : `${ASSETS}/${langCode}/${set.id}/${card.localId}/high.webp`

      const ok = await downloadAndUpload(imageUrl, storagePath)
      if (ok) {
        totalUploaded++; setUploaded++

        // Upsert into tcg_cards table
        await supabase.from('tcg_cards').upsert({
          id: cardId,
          set_id: set.id,
          local_id: card.localId,
          name: card.name,
          lang: langLabel,
          rarity: card.rarity || null,
          hp: card.hp || null,
          image_url: imageUrl,
          image_local: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'id' })
      } else {
        totalFailed++
      }

      await sleep(DELAY)
    }

    if (setUploaded > 0) {
      console.log(`  ${set.id} (${set.name}): ${setUploaded} uploaded, ${cards.length} total`)
    }

    // Upsert set info
    await supabase.from('tcg_sets').upsert({
      id: set.id,
      name: set.name,
      lang: langLabel,
      total_cards: setData.cardCount?.total || cards.length,
      release_date: setData.releaseDate || null,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'id' })
  }

  console.log(`\n${langLabel} done: ${totalCards} cards, ${totalUploaded} uploaded, ${totalSkipped} skipped, ${totalFailed} failed`)
}

async function main() {
  console.log('PokéAlpha Image Sync')
  console.log(`Target: ${SUPABASE_URL}`)
  console.log(`Bucket: ${BUCKET}`)

  for (const lang of LANGS) {
    await syncLang(lang.code, lang.label)
  }

  console.log('\n✅ Sync complete')
}

main().catch(console.error)
