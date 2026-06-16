const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtheycxwbkweehfezyem.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SERVICE_KEY) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const DELAY = 50
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}

async function main() {
  console.log('Fixing tcg_cards table — adding language-prefixed IDs\n')

  // Clear the table first
  await supabase.from('tcg_cards').delete().neq('id', '')
  console.log('Table cleared\n')

  for (const lang of [{ code: 'en', label: 'EN' }, { code: 'fr', label: 'FR' }]) {
    console.log(`═══ ${lang.label} ═══`)
    const sets = await fetchJSON(`https://api.tcgdex.net/v2/${lang.code}/sets`)
    if (!sets) continue

    let total = 0, inserted = 0
    const batch = []

    for (const set of sets) {
      const setData = await fetchJSON(`https://api.tcgdex.net/v2/${lang.code}/sets/${set.id}`)
      if (!setData?.cards) continue

      // Upsert set
      await supabase.from('tcg_sets').upsert({
        id: `${lang.code}-${set.id}`,
        name: set.name,
        lang: lang.label,
        total_cards: setData.cardCount?.total || setData.cards.length,
        release_date: setData.releaseDate || null,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'id' })

      for (const card of setData.cards) {
        total++
        const storagePath = `${lang.code}/${set.id}/${card.localId}.webp`
        const imageLocal = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`

        batch.push({
          id: `${lang.code}-${card.id || set.id + '-' + card.localId}`,
          set_id: `${lang.code}-${set.id}`,
          local_id: card.localId,
          name: card.name,
          lang: lang.label,
          rarity: card.rarity || null,
          card_type: card.category || null,
          hp: card.hp || null,
          image_url: card.image ? `${card.image}/high.webp` : null,
          image_local: imageLocal,
          synced_at: new Date().toISOString(),
        })

        // Insert in batches of 500
        if (batch.length >= 500) {
          const { error } = await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
          if (error) console.error('Batch error:', error.message)
          else inserted += batch.length
          batch.length = 0
          process.stdout.write(`  ${inserted} inserted...\r`)
          await sleep(DELAY)
        }
      }
    }

    // Final batch
    if (batch.length > 0) {
      const { error } = await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
      if (error) console.error('Final batch error:', error.message)
      else inserted += batch.length
    }

    console.log(`${lang.label}: ${inserted} cards inserted (${total} total from API)\n`)
  }

  console.log('✅ Table fixed')
}

main().catch(console.error)
