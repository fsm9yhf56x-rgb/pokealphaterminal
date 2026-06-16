#!/usr/bin/env node
/**
 * Sync the 198 incomplete FR sets from TCGdex into tcg_cards.
 * Estimated 21,000+ FR cards to recover.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Priority 1: process.env (GitHub Actions / production)
// Priority 2: .env.local (local dev)
let url = process.env.NEXT_PUBLIC_SUPABASE_URL
let key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  try {
    const env = readFileSync('.env.local', 'utf-8')
    url = url || env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim()
    key = key || env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim()
  } catch {}
}
if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const sb = createClient(url, key)

const { data: frSets } = await sb.from('tcg_sets').select('id, name, total_cards').eq('lang', 'FR').order('id')

const incomplete = []
for (const s of frSets || []) {
  const { count } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.id)
  if (count < (s.total_cards || 0) && s.total_cards > 0) {
    incomplete.push({ ...s, count })
  }
}

console.log(`🇫🇷 ${incomplete.length} FR sets to sync\n`)

let totalInserted = 0, totalErrors = 0, totalEmpty = 0

for (const s of incomplete) {
  // Strip 'fr-' prefix if present (some FR sets are 'fr-A1' not just 'A1')
  const tcgdexId = s.id.replace(/^fr-/, '')
  
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/fr/sets/${tcgdexId}`)
    if (!r.ok) {
      console.log(`  ❌ [${s.id.padEnd(28)}] TCGdex ${r.status}`)
      totalErrors++
      continue
    }
    const set = await r.json()
    const cards = set.cards || []
    
    if (cards.length === 0) {
      console.log(`  ⚠️  [${s.id.padEnd(28)}] Empty TCGdex response`)
      totalEmpty++
      continue
    }

    const rows = cards.map(c => ({
      id: `${s.id}-${c.localId}`,
      set_id: s.id,
      local_id: c.localId,
      name: c.name,
      lang: 'FR',
      rarity: c.rarity || null,
      card_type: c.category || null,
      hp: c.hp ? parseInt(c.hp) : null,
      synced_at: new Date().toISOString(),
      has_image: !!c.image,
      is_active: true,
    }))

    const { error } = await sb.from('tcg_cards').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    
    if (error) {
      console.log(`  ❌ [${s.id.padEnd(28)}] DB error: ${error.message.slice(0, 60)}`)
      totalErrors++
    } else {
      const { count: newCount } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.id)
      const inserted = newCount - s.count
      if (inserted > 0) {
        console.log(`  ✅ [${s.id.padEnd(28)}] ${s.count} → ${newCount} (+${inserted})`)
        totalInserted += inserted
      } else {
        console.log(`  ⏭  [${s.id.padEnd(28)}] No new cards (already synced)`)
      }
    }
  } catch (e) {
    console.log(`  ⚠️  [${s.id.padEnd(28)}] ERR ${e.message.slice(0, 40)}`)
    totalErrors++
  }
  
  await new Promise(r => setTimeout(r, 250))
}

console.log(`\n━━━ Summary ━━━`)
console.log(`✅ Total inserted:   ${totalInserted} cards`)
console.log(`⚠️  Empty in TCGdex: ${totalEmpty} sets`)
console.log(`❌ Errors:           ${totalErrors} sets`)
