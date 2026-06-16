async function fetchJSON(url) {
  try { const r = await fetch(url); if (!r.ok) return null; return r.json() } catch { return null }
}
async function testUrl(url) {
  try { const r = await fetch(url, { method: 'HEAD', redirect: 'follow' }); return { ok: r.ok, status: r.status, type: r.headers.get('content-type'), size: r.headers.get('content-length') } } catch(e) { return { ok: false, err: e.message } }
}

async function main() {
  // ════════════════════════════════
  // 1. JPN-CARDS.COM API
  // ════════════════════════════════
  console.log('═══ 1. jpn-cards.com API ═══')
  const jpnBase = 'https://www.jpn-cards.com/v2'
  
  // Test endpoints
  const endpoints = [
    `${jpnBase}/set`,
    `${jpnBase}/set?name=Scarlet`,
    `${jpnBase}/card?name=Charizard`,
    `${jpnBase}/card?set_id=1`,
    `${jpnBase}/card/1`,
  ]
  for (const u of endpoints) {
    const d = await fetchJSON(u)
    if (d) {
      const sample = Array.isArray(d) ? d.slice(0,2) : d
      console.log(`✅ ${u}`)
      console.log(`   → ${JSON.stringify(sample).slice(0,300)}`)
    } else {
      console.log(`❌ ${u}`)
    }
  }

  // ════════════════════════════════
  // 2. MALIE.IO (high quality scans from PTCGL)
  // ════════════════════════════════
  console.log('\n═══ 2. malie.io (PTCGL extracts) ═══')
  const malieUrls = [
    'https://malie.io/static/index.html',
    'https://malie.io/static/sv1/001.png',
    'https://malie.io/static/sv/sv1/001.png',
    'https://malie.io/static/SV1/001.png',
    'https://malie.io/static/swsh1/001.png',
    'https://malie.io/static/sm1/001.png',
    'https://malie.io/static/base1/001.png',
  ]
  for (const u of malieUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} ${r.size?`(${Math.round(r.size/1024)}KB)`:''} ${r.type||''}`)
  }
  
  // Try to get the index page and parse file listing
  try {
    const res = await fetch('https://malie.io/static/index.html')
    if (res.ok) {
      const html = await res.text()
      const links = html.match(/href="([^"]+)"/gi) || []
      console.log(`   Index has ${links.length} links`)
      const dirs = links.filter(l => !l.includes('.')).slice(0, 20)
      console.log(`   Dirs: ${dirs.join(', ')}`)
    }
  } catch {}

  // ════════════════════════════════
  // 3. POKEMONCARD.IO
  // ════════════════════════════════
  console.log('\n═══ 3. pokemoncard.io ═══')
  const pcioUrls = [
    'https://pokemoncard.io/api/card?name=Charizard',
    'https://pokemoncard.io/api/cards?set=sv1',
  ]
  for (const u of pcioUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`)
  }

  // ════════════════════════════════
  // 4. POKEMON.COM OFFICIAL (JP)
  // ════════════════════════════════
  console.log('\n═══ 4. pokemon.co.jp official ═══')
  const pokejpUrls = [
    'https://www.pokemon-card.com/card-search/details.php/card/43689',
    'https://www.pokemon-card.com/assets/images/card_images/large/SV1S/044070_P_RIZAADONEX.jpg',
    'https://www.pokemon-card.com/assets/images/card_images/large/SV1V/044102_P_NYAOHAEX.jpg',
    'https://www.pokemon-card.com/assets/images/card_images/large/S1H/037190_P_RIZAADONV.jpg',
    'https://www.pokemon-card.com/assets/images/card_images/large/S1/036024_P_RIZAADON.jpg',
  ]
  for (const u of pokejpUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} ${r.size?`(${Math.round(r.size/1024)}KB)`:''} ${r.type||''}`)
  }

  // ════════════════════════════════
  // 5. POKÉBEACH SCANS
  // ════════════════════════════════
  console.log('\n═══ 5. PokeBeach scans ═══')
  const beachUrls = [
    'https://www.pokebeach.com/scans/scarlet-violet/001-sprigatito.jpg',
    'https://www.pokebeach.com/images/gallery/sets/sv1/001.jpg',
  ]
  for (const u of beachUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u}`)
  }

  // ════════════════════════════════
  // 6. POKEMON ZONE / CARDEX JP
  // ════════════════════════════════
  console.log('\n═══ 6. JP card databases ═══')
  const jpDbUrls = [
    'https://pokemon-card.net/card/s1/001',
    'https://pokemon-card.net/api/cards?set=s1',
    'https://pokemoncard.net/card/s1/001',
    'https://pokeca-pokemon.com/card/s1-001',
    'https://pokecabook.com/card/s1-001',
    'https://pokeca-pokemon.com/',
  ]
  for (const u of jpDbUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} ${r.type||''}`)
  }

  // ════════════════════════════════
  // 7. PHYGITALS.COM deeper scan
  // ════════════════════════════════
  console.log('\n═══ 7. phygitals.com deep scan ═══')
  try {
    const res = await fetch('https://www.phygitals.com/series')
    const html = await res.text()
    // Find card image URLs from pokemontcg.io
    const cardImgs = html.match(/https:\/\/images\.pokemontcg\.io\/[^"'\s]+/g) || []
    console.log(`   PokemonTCG.io images found: ${cardImgs.length}`)
    
    // Try a specific card page
    const cardPageRes = await fetch('https://www.phygitals.com/card/sv1-1')
    if (cardPageRes.ok) {
      const cardHtml = await cardPageRes.text()
      const imgs = cardHtml.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi) || []
      console.log(`   Card page sv1-1 images: ${imgs.slice(0,5).join('\n     ')}`)
    }
  } catch(e) { console.log(`   Error: ${e.message}`) }

  // ════════════════════════════════
  // 8. POKECOLLECTOR.COM
  // ════════════════════════════════
  console.log('\n═══ 8. pokecollector.com ═══')
  const collUrls = [
    'https://pokecollector.com/card/sv1-001',
    'https://www.pokecollector.com/card/sv1-001',
    'https://pokecollector.com/',
  ]
  for (const u of collUrls) {
    const r = await testUrl(u)
    console.log(`${r.ok?'✅':'❌'} [${r.status||'ERR'}] ${u} ${r.type||''}`)
  }

  // ════════════════════════════════
  // 9. TCGCOLLECTOR.COM  
  // ════════════════════════════════
  console.log('\n═══ 9. tcgcollector.com ═══')
  try {
    const res = await fetch('https://www.tcgcollector.com/cards/jp?cardSet=sv1v')
    if (res.ok) {
      const html = await res.text()
      const imgs = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi) || []
      const hosts = [...new Set(imgs.map(u => { try { return new URL(u).hostname } catch { return '?' } }))]
      console.log(`   ✅ Found ${imgs.length} images from: ${hosts.join(', ')}`)
      const cardImgs = imgs.filter(u => /card|image/i.test(u)).slice(0,5)
      if (cardImgs.length) cardImgs.forEach(u => console.log(`     ${u}`))
    } else {
      console.log(`   ❌ [${res.status}]`)
    }
  } catch(e) { console.log(`   Error: ${e.message}`) }

  console.log('\n═══ SCAN COMPLETE ═══')
}

main().catch(console.error)
