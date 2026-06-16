const { createClient } = require('@supabase/supabase-js')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
const BUCKET = 'card-images'
const STORAGE_BASE = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}`
const BASE = 'https://www.pokemon-card.com'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('═══ Rebuilding JP table (sets first) ═══\n')

  // 1. Scan storage for JP folders
  const { data: folders } = await supabase.storage.from(BUCKET).list('jp', { limit: 1000 })
  const jpFolders = (folders || []).filter(f => f.name && !f.name.startsWith('.'))
  console.log(`${jpFolders.length} JP set folders in storage\n`)

  // 2. Insert ALL sets first
  console.log('Inserting sets...')
  const setsBatch = jpFolders.map(f => ({
    id: `jp-${f.name}`,
    name: f.name,
    lang: 'JP',
    synced_at: new Date().toISOString(),
  }))
  const { error: setErr } = await supabase.from('tcg_sets').upsert(setsBatch, { onConflict: 'id' })
  if (setErr) console.error('Sets error:', setErr.message)
  else console.log(`  ${setsBatch.length} sets inserted\n`)

  // 3. Now insert cards per folder
  console.log('Scanning images and inserting cards...')
  let totalCards = 0

  for (const folder of jpFolders) {
    const setCode = folder.name
    const { data: files } = await supabase.storage.from(BUCKET).list(`jp/${setCode}`, { limit: 10000 })
    if (!files) continue

    const imageFiles = files.filter(f => /\.(jpg|webp|png)$/.test(f.name))
    if (imageFiles.length === 0) continue

    const batch = imageFiles.map(f => {
      const cardId = f.name.replace(/\.(jpg|webp|png)$/, '')
      return {
        id: `jp-${setCode}-${cardId}`,
        set_id: `jp-${setCode}`,
        local_id: cardId,
        name: cardId,
        lang: 'JP',
        image_local: `${STORAGE_BASE}/jp/${setCode}/${f.name}`,
        synced_at: new Date().toISOString(),
      }
    })

    const { error } = await supabase.from('tcg_cards').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`  ${setCode}: INSERT ERROR — ${error.message}`)
    } else {
      totalCards += batch.length
    }

    if (totalCards % 2000 < 100) process.stdout.write(`  ${totalCards} cards...\r`)
    await sleep(30)
  }

  console.log(`\n  ${totalCards} cards inserted from storage`)

  // 4. Verify
  const { count } = await supabase.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('lang', 'JP')
  console.log(`  DB count: ${count}\n`)

  // 5. Enrich with names from pokemon-card.com
  console.log('Enriching names from pokemon-card.com...')
  let enriched = 0, page = 1

  while (true) {
    const url = `${BASE}/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&page=${page}`
    try {
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
      })
      if (!r.ok) break
      const data = await r.json()
      if (!data?.cardList?.length) break

      for (const card of data.cardList) {
        const cardId = card.cardID
        const name = card.cardNameAltText || card.cardNameViewText || ''
        const thumbPath = card.cardThumbFile || ''
        const setCode = thumbPath.split('/').slice(-2, -1)[0] || ''

        if (name && cardId && setCode) {
          await supabase.from('tcg_cards')
            .update({ name })
            .eq('id', `jp-${setCode}-${cardId}`)
        }
      }

      enriched += data.cardList.length
      if (page % 50 === 0) console.log(`  Page ${page}/${data.maxPage} — ${enriched} names`)
      if (page >= data.maxPage) break
      page++
      await sleep(150)
    } catch { break }
  }

  console.log(`  ${enriched} names enriched`)

  // Final count
  const { count: finalCount } = await supabase.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('lang', 'JP')
  const { count: namedCount } = await supabase.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('lang', 'JP').neq('name', '')

  console.log(`\n✅ DONE — ${finalCount} JP cards, ${namedCount} with names`)
}

main().catch(console.error)
