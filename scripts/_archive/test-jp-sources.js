async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}
async function testUrl(url) {
  try { const r = await fetch(url, { method: 'HEAD', redirect: 'follow' }); return { ok: r.ok, status: r.status, type: r.headers.get('content-type') } } catch { return { ok: false } }
}
async function testGet(url) {
  try { const r = await fetch(url); return { ok: r.ok, status: r.status, size: r.headers.get('content-length'), type: r.headers.get('content-type') } } catch { return { ok: false } }
}

async function main() {
  console.log('═══ FULL JP IMAGE SOURCE SCAN ═══\n')

  // ────────────────────────────────
  // 1. TCGDex JP
  // ────────────────────────────────
  console.log('1. TCGDex JP')
  const jpSets = await fetchJSON('https://api.tcgdex.net/v2/ja/sets')
  console.log(`   ${jpSets?.length || 0} sets available`)
  const jpUrls = [
    'https://assets.tcgdex.net/ja/sv1/001/high.webp',
    'https://assets.tcgdex.net/ja/sv1/001/low.webp',
    'https://assets.tcgdex.net/ja/sv1a/001/high.webp',
    'https://assets.tcgdex.net/ja/s1/001/high.webp',
    'https://assets.tcgdex.net/ja/S1/001/high.webp',
    'https://assets.tcgdex.net/ja/S1a/001/high.webp',
    'https://assets.tcgdex.net/ja/sm1/001/high.webp',
    'https://assets.tcgdex.net/ja/swsh1/001/high.webp',
    'https://assets.tcgdex.net/ja/xy1/001/high.webp',
    'https://assets.tcgdex.net/ja/bw1/001/high.webp',
    'https://assets.tcgdex.net/ja/base1/001/high.webp',
    'https://assets.tcgdex.net/ja/PMCG1/001/high.webp',
    'https://assets.tcgdex.net/ja/neo1/001/high.webp',
  ]
  for (const u of jpUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 2. PokemonTCG.io
  // ────────────────────────────────
  console.log('\n2. PokemonTCG.io')
  const ptcgJP = await fetchJSON('https://api.pokemontcg.io/v2/cards?q=set.id:sv1&pageSize=2')
  if (ptcgJP?.data) {
    for (const c of ptcgJP.data) console.log(`   ${c.id} ${c.name} — large: ${c.images?.large ? '✅' : '❌'}`)
  }
  // Check if JP sets exist
  const ptcgSetsJP = await fetchJSON('https://api.pokemontcg.io/v2/sets?q=name:*Japanese*&pageSize=5')
  console.log(`   JP sets search: ${ptcgSetsJP?.data?.length || 0} results`)
  const ptcgSetsAll = await fetchJSON('https://api.pokemontcg.io/v2/sets?pageSize=5&orderBy=-releaseDate')
  if (ptcgSetsAll?.data) {
    for (const s of ptcgSetsAll.data) console.log(`   Latest: ${s.id} — ${s.name} (${s.total} cards)`)
  }

  // ────────────────────────────────
  // 3. Phygitals.com
  // ────────────────────────────────
  console.log('\n3. Phygitals.com')
  const phygPages = [
    'https://www.phygitals.com/series',
    'https://www.phygitals.com/api/series',
    'https://www.phygitals.com/api/v1/series',
    'https://api.phygitals.com/series',
    'https://api.phygitals.com/v1/series',
  ]
  for (const u of phygPages) { const r = await testGet(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} (${r.type||'?'})`) }
  
  // Try scraping the series page
  try {
    const res = await fetch('https://www.phygitals.com/series')
    if (res.ok) {
      const html = await res.text()
      // Look for image URLs
      const imgMatches = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi) || []
      const uniqueHosts = [...new Set(imgMatches.map(u => new URL(u).hostname))]
      console.log(`   Found ${imgMatches.length} image URLs from ${uniqueHosts.length} hosts:`)
      uniqueHosts.forEach(h => console.log(`     → ${h}`))
      // Show first 5 card-like URLs
      const cardImgs = imgMatches.filter(u => /card|set|serie|pokemon/i.test(u)).slice(0, 5)
      if (cardImgs.length) { console.log('   Card-like URLs:'); cardImgs.forEach(u => console.log(`     ${u}`)) }
      // Look for API endpoints in JS
      const apiMatches = html.match(/["'](\/api\/[^"']+|https?:\/\/api\.[^"'\s]+)/g) || []
      if (apiMatches.length) { console.log('   API refs found:'); apiMatches.slice(0,5).forEach(u => console.log(`     ${u}`)) }
    }
  } catch (e) { console.log(`   Fetch error: ${e.message}`) }

  // ────────────────────────────────
  // 4. Pokécardex (FR site with JP data)
  // ────────────────────────────────
  console.log('\n4. Pokecardex.com')
  const pcdxUrls = [
    'https://www.pokecardex.com/assets/images/sets_jp/SV1/HD/SV1_JP_1.jpg',
    'https://www.pokecardex.com/assets/images/sets_jp/S1/HD/S1_JP_1.jpg',
    'https://www.pokecardex.com/assets/images/sets_jp/SM1/HD/SM1_JP_1.jpg',
    'https://www.pokecardex.com/assets/images/sets_jp/SV1/SV1_JP_1.jpg',
    'https://www.pokecardex.com/assets/images/sets/SV1/HD/SV1_JP_1.jpg',
    'https://www.pokecardex.com/assets/images/sets_en/SV01/HD/SV01_EN_1.jpg',
    'https://www.pokecardex.com/assets/images/sets_fr/SV01/HD/SV01_FR_1.jpg',
  ]
  for (const u of pcdxUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 5. Limitless TCG
  // ────────────────────────────────
  console.log('\n5. LimitlessTCG.com')
  const ltcgUrls = [
    'https://limitlesstcg.com/cards/sv1/1.png',
    'https://limitlesstcg.com/cards/SV1/001.png',
    'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pokemon/sv1/sv1_001_R_EN.png',
    'https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/pokemon/sv1/sv1_001_R_JP.png',
  ]
  for (const u of ltcgUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 6. Pkmncards.com
  // ────────────────────────────────
  console.log('\n6. Pkmncards.com')
  const pkmnUrls = [
    'https://pkmncards.com/wp-content/uploads/en_US-SV01-001-sprigatito.jpg',
    'https://pkmncards.com/wp-content/uploads/ja-SV1-001.jpg',
    'https://pkmncards.com/?s=charizard&display=scan&sort=date',
  ]
  for (const u of pkmnUrls.slice(0,2)) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 7. Serebii.net
  // ────────────────────────────────
  console.log('\n7. Serebii.net')
  const serebiiUrls = [
    'https://www.serebii.net/card/scarletviolet/001.jpg',
    'https://www.serebii.net/card/japanesescarletex/001.jpg',
    'https://www.serebii.net/card/scarletex/001.jpg',
  ]
  for (const u of serebiiUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 8. Bulbapedia archives
  // ────────────────────────────────
  console.log('\n8. Bulbapedia/Archives')
  const bulbaUrls = [
    'https://archives.bulbagarden.net/media/upload/f/f4/SVEnglishKoreanSV001.jpg',
    'https://archives.bulbagarden.net/media/upload/0/07/SVJapaneseSV1001.jpg',
    'https://archives.bulbagarden.net/w/index.php?title=Special:FilePath&file=SVJapaneseSV1001.jpg',
  ]
  for (const u of bulbaUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 9. PokeTrace CDN
  // ────────────────────────────────
  console.log('\n9. PokeTrace CDN')
  const ptUrls = [
    'https://cdn.poketrace.com/cards/96b13860dec8d94b.webp',
  ]
  for (const u of ptUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 10. CardDex / jpn-cards
  // ────────────────────────────────
  console.log('\n10. JPN Cards sources')
  const jpnUrls = [
    'https://jpn-cards.com/v2/card/sv1-001',
    'https://api.jpn-cards.com/v2/card?id=sv1-001',
    'https://jpn-cards.com/images/cards/sv1/001.jpg',
  ]
  for (const u of jpnUrls) { const r = await testGet(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} (${r.type||'?'})`) }

  // ────────────────────────────────
  // 11. Poke-Holo / CardMarket images
  // ────────────────────────────────
  console.log('\n11. CardMarket image CDN')
  const cmUrls = [
    'https://product-images.s3.cardmarket.com/4/SV01/739693/739693.jpg',
    'https://static.cardmarket.com/img/cards/SV01/001.jpg',
  ]
  for (const u of cmUrls) { const r = await testUrl(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`) }

  // ────────────────────────────────
  // 12. PokeWallet CDN
  // ────────────────────────────────
  console.log('\n12. PokeWallet')
  const pwUrls = [
    'https://www.pokewallet.io/api/cards?search=charizard&limit=1',
  ]
  for (const u of pwUrls) { const r = await testGet(u); console.log(`   ${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} (${r.type||'?'})`) }

  console.log('\n═══ SCAN COMPLETE ═══')
}

main().catch(console.error)
