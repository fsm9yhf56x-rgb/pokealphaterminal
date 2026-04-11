async function testUrl(url) {
  try { const r = await fetch(url, { method: 'HEAD' }); return r.ok } catch { return false }
}

async function main() {
  console.log('═══ PokemonTCG.io CDN URL patterns ═══\n')
  
  const patterns = [
    // Standard patterns
    'https://images.pokemontcg.io/sv1/1.png',
    'https://images.pokemontcg.io/sv1/1_hires.png',
    'https://images.pokemontcg.io/sv1/001.png',
    'https://images.pokemontcg.io/sv1/1_hiRes.png',
    'https://images.pokemontcg.io/base1/4.png',
    'https://images.pokemontcg.io/base1/4_hires.png',
    'https://images.pokemontcg.io/swsh1/1.png',
    'https://images.pokemontcg.io/swsh1/1_hires.png',
    'https://images.pokemontcg.io/sm1/1.png',
    'https://images.pokemontcg.io/sm1/1_hires.png',
    'https://images.pokemontcg.io/xy1/1.png',
    'https://images.pokemontcg.io/xy1/1_hires.png',
    // Celebrations, promos
    'https://images.pokemontcg.io/cel25/1.png',
    'https://images.pokemontcg.io/cel25/1_hires.png',
    'https://images.pokemontcg.io/swshp/SWSH001.png',
    'https://images.pokemontcg.io/smp/SM01.png',
    'https://images.pokemontcg.io/smp/SM01_hires.png',
    // McDonald's
    'https://images.pokemontcg.io/mcd21/1.png',
    'https://images.pokemontcg.io/mcd22/1.png',
    'https://images.pokemontcg.io/mcd19/1.png',
    // Shining Legends, Dragon Majesty (missing from TCGDex)
    'https://images.pokemontcg.io/sm35/1.png',
    'https://images.pokemontcg.io/sm35/1_hires.png',
    'https://images.pokemontcg.io/sm75/1.png',
    'https://images.pokemontcg.io/sm75/1_hires.png',
    // Trainer kits
    'https://images.pokemontcg.io/tk1a/1.png',
    'https://images.pokemontcg.io/tk2a/1.png',
  ]

  for (const u of patterns) {
    const ok = await testUrl(u)
    console.log(`${ok?'✅':'❌'} ${u}`)
  }

  // Now test via API to get real image URLs for missing sets
  console.log('\n═══ API — Missing set samples ═══\n')
  const missingSets = ['sm35','sm75','cel25','cel25c','mcd21','mcd22','mcd19','smp','swshp','svp','tk1a','tk2a']
  for (const setId of missingSets) {
    try {
      const r = await fetch(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}&pageSize=2`)
      const d = await r.json()
      if (d.data?.length) {
        for (const c of d.data) {
          console.log(`✅ ${setId} → ${c.id} ${c.name}`)
          console.log(`   small: ${c.images?.small}`)
          console.log(`   large: ${c.images?.large}`)
        }
      } else {
        console.log(`❌ ${setId} → no results`)
      }
    } catch { console.log(`❌ ${setId} → fetch error`) }
  }

  // Get all PokemonTCG.io set IDs
  console.log('\n═══ All PokemonTCG.io sets ═══\n')
  let page = 1, allSets = []
  while (true) {
    const r = await fetch(`https://api.pokemontcg.io/v2/sets?pageSize=250&page=${page}`)
    const d = await r.json()
    if (!d.data?.length) break
    allSets.push(...d.data)
    if (d.data.length < 250) break
    page++
  }
  console.log(`Total sets: ${allSets.length}`)
  console.log('Set IDs:', allSets.map(s => s.id).join(', '))
}

main().catch(console.error)
