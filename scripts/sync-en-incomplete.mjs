#!/usr/bin/env node
/**
 * Sync the 28 incomplete EN sets from TCGdex into tcg_cards.
 * Uses upsert to handle existing partial fills.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = readFileSync('.env.local', 'utf-8')
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)[1].trim()
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)[1].trim()
const sb = createClient(url, key)

const { data: enSets } = await sb.from('tcg_sets').select('id, name, total_cards').eq('lang', 'EN').order('id')

const incomplete = []
for (const s of enSets || []) {
  const { count } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.id)
  if (count < (s.total_cards || 0) && s.total_cards > 0) incomplete.push({ ...s, count })
}

console.log(`🎯 ${incomplete.length} EN sets to sync\n`)

let totalInserted = 0, totalSkipped = 0, totalErrors = 0

for (const s of incomplete) {
  const tcgdexId = s.id.replace(/^en-/, '')
  
  try {
    const r = await fetch(`https://api.tcgdex.net/v2/en/sets/${tcgdexId}`)
    if (!r.ok) {
      console.log(`  ❌ [${s.id}] TCGdex ${r.status}`)
      totalErrors++
      continue
    }
    const set = await r.json()
    const cards = set.cards || []
    
    if (cards.length === 0) {
      console.log(`  ⚠️  [${s.id}] No cards in TCGdex response`)
      continue
    }

    // Build rows for upsert
    const rows = cards.map(c => ({
      id: `${s.id}-${c.localId}`,    // canonical id
      set_id: s.id,
      local_id: c.localId,
      name: c.name,
      lang: 'EN',
      rarity: c.rarity || null,
      card_type: c.category || null,
      hp: c.hp ? parseInt(c.hp) : null,
      synced_at: new Date().toISOString(),
      has_image: !!c.image,
      is_active: true,
    }))

    // Upsert (insert if missing, ignore if exists)
    const { data, error } = await sb.from('tcg_cards').upsert(rows, { onConflict: 'id', ignoreDuplicates: true })
    
    if (error) {
      console.log(`  ❌ [${s.id.padEnd(28)}] DB error: ${error.message.slice(0, 60)}`)
      totalErrors++
    } else {
      // Re-count after insert
      const { count: newCount } = await sb.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('set_id', s.id)
      const inserted = newCount - s.count
      console.log(`  ✅ [${s.id.padEnd(28)}] ${s.count} → ${newCount} (+${inserted}) | ${set.name}`)
      totalInserted += inserted
    }
  } catch (e) {
    console.log(`  ⚠️  [${s.id}] ERR ${e.message.slice(0, 40)}`)
    totalErrors++
  }
  
  await new Promise(r => setTimeout(r, 300))
}

console.log(`\n━━━ Summary ━━━`)
console.log(`✅ Total inserted: ${totalInserted} cards`)
console.log(`❌ Errors: ${totalErrors}`)
