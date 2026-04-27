#!/usr/bin/env node
/**
 * Marks has_image=true for cards where TCGdex hosts an image (in any lang).
 * Uses pagination to handle Supabase's 1000-row default limit.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const SERIES_MAP = {
  ecard1: 'ecard', ecard2: 'ecard', ecard3: 'ecard',
  base1: 'base', base2: 'base', base3: 'base', base4: 'base', base5: 'base', basep: 'base',
  neo1: 'neo', neo2: 'neo', neo3: 'neo', neo4: 'neo',
  gym1: 'gym', gym2: 'gym',
  dp1: 'dp', dp2: 'dp', dp3: 'dp', dp4: 'dp', dp5: 'dp', dp6: 'dp', dp7: 'dp',
  pl1: 'pl', pl2: 'pl', pl3: 'pl', pl4: 'pl',
  hgss1: 'hgss', hgss2: 'hgss', hgss3: 'hgss', hgss4: 'hgss', hgssp: 'hgss',
  col1: 'col',
  bw: 'bw', xy: 'xy', sm: 'sm', swsh: 'swsh', sv: 'sv',
  ex: 'ex',
  pop: 'pop', cel25: 'cel25', dpp: 'dp', dv1: 'dv', det1: 'det',
  me01: 'me', me02: 'me', me03: 'me', mep: 'me', mee: 'me',
  A1: 'A1', A2: 'A2', A3: 'A3', A4: 'A4',
  P: 'P-A',
}

function getSeries(setId) {
  const id = setId.replace(/^(fr-|en-|jp-)/, '')
  for (const k of Object.keys(SERIES_MAP).sort((a, b) => b.length - a.length)) {
    if (id.startsWith(k)) return SERIES_MAP[k]
  }
  return id.match(/^([a-z]+)/i)?.[1] || id
}

async function tryImageExists(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' })
    return r.ok
  } catch {
    return false
  }
}

;(async () => {
  // Paginate through all cards without image
  console.log('📥 Fetching all cards without image...')
  const allCards = []
  const PAGE_SIZE = 1000
  let offset = 0
  while (true) {
    const { data } = await sb.from('tcg_cards')
      .select('id, set_id, local_id, lang')
      .eq('has_image', false)
      .range(offset, offset + PAGE_SIZE - 1)
    if (!data || data.length === 0) break
    allCards.push(...data)
    offset += data.length
    if (data.length < PAGE_SIZE) break
  }
  console.log(`Total: ${allCards.length} cards to check\n`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  
  let foundEN = 0, foundFR = 0, foundUniv = 0, notFound = 0, processed = 0
  const updates = []
  const startTime = Date.now()
  
  for (const card of allCards) {
    processed++
    
    if (processed % 200 === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      const rate = processed / elapsed || 1
      const eta = Math.round((allCards.length - processed) / rate)
      console.log(`  Progress: ${processed}/${allCards.length} | EN=${foundEN} FR=${foundFR} univ=${foundUniv} not_found=${notFound} | ${rate.toFixed(1)} req/s | ETA ${eta}s`)
    }
    
    const setId = card.set_id.replace(/^(fr-|en-|jp-)/, '')
    const series = getSeries(card.set_id)
    
    let found = null
    for (const lang of ['en', 'fr', 'univ']) {
      const url = `https://assets.tcgdex.net/${lang}/${series}/${setId}/${card.local_id}/high.png`
      if (await tryImageExists(url)) {
        found = lang
        break
      }
    }
    
    if (found) {
      updates.push(card.id)
      if (found === 'en') foundEN++
      else if (found === 'fr') foundFR++
      else foundUniv++
    } else {
      notFound++
    }
    
    await new Promise(r => setTimeout(r, 30))
    
    if (updates.length >= 200) {
      const batch = updates.splice(0, 200)
      await sb.from('tcg_cards').update({ has_image: true, image_synced_at: new Date().toISOString() }).in('id', batch)
    }
  }
  
  if (updates.length > 0) {
    await sb.from('tcg_cards').update({ has_image: true, image_synced_at: new Date().toISOString() }).in('id', updates)
  }
  
  console.log(`\n━━━ Summary ━━━`)
  console.log(`✅ Found EN:    ${foundEN}`)
  console.log(`✅ Found FR:    ${foundFR}`)
  console.log(`✅ Found univ:  ${foundUniv}`)
  console.log(`❌ Not found:   ${notFound}`)
  console.log(`Total time: ${Math.round((Date.now() - startTime) / 1000)}s`)
})()
