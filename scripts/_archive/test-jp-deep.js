async function main() {
  // ═══ 1. POKEMON-CARD.COM — scrape la page pour trouver les vraies URLs d'images ═══
  console.log('═══ 1. pokemon-card.com — scraping card pages ═══')
  
  const cardPages = [
    'https://www.pokemon-card.com/card-search/details.php/card/43689',
    'https://www.pokemon-card.com/card-search/details.php/card/43690',
    'https://www.pokemon-card.com/card-search/details.php/card/50000',
    'https://www.pokemon-card.com/card-search/details.php/card/55000',
  ]
  
  for (const url of cardPages) {
    try {
      const res = await fetch(url)
      if (!res.ok) { console.log(`❌ ${url} [${res.status}]`); continue }
      const html = await res.text()
      
      // Find all image URLs
      const imgs = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp|gif)/gi) || []
      const cardImgs = imgs.filter(u => /card_image|card-image|large|detail/i.test(u))
      
      console.log(`✅ ${url}`)
      if (cardImgs.length) {
        cardImgs.forEach(u => console.log(`   IMG: ${u}`))
      } else {
        // Try src= patterns
        const srcs = html.match(/src="([^"]+\.(jpg|png|webp))"/gi) || []
        const bigSrcs = srcs.filter(s => /card|large|detail|image/i.test(s))
        if (bigSrcs.length) bigSrcs.slice(0,5).forEach(s => console.log(`   SRC: ${s}`))
        else {
          // Show all image srcs
          srcs.slice(0,8).forEach(s => console.log(`   SRC: ${s}`))
        }
      }
    } catch(e) { console.log(`❌ ${url} — ${e.message}`) }
  }

  // Also try the card search API
  console.log('\n═══ 2. pokemon-card.com search API ═══')
  const searchUrls = [
    'https://www.pokemon-card.com/card-search/resultAPI.php?keyword=リザードン',
    'https://www.pokemon-card.com/card-search/result.php?keyword=リザードン',
    'https://www.pokemon-card.com/assets/images/card_images/',
  ]
  for (const u of searchUrls) {
    try {
      const r = await fetch(u)
      console.log(`${r.ok?'✅':'❌'} [${r.status}] ${u} (${r.headers.get('content-type')})`)
      if (r.ok && r.headers.get('content-type')?.includes('json')) {
        const d = await r.json()
        console.log(`   ${JSON.stringify(d).slice(0,500)}`)
      } else if (r.ok && r.headers.get('content-type')?.includes('html')) {
        const html = await r.text()
        const imgs = html.match(/https?:\/\/[^"'\s]+card_images[^"'\s]+/gi) || []
        if (imgs.length) {
          console.log(`   Found ${imgs.length} card_images URLs:`)
          imgs.slice(0,5).forEach(u => console.log(`     ${u}`))
        }
      }
    } catch(e) { console.log(`❌ ${u} — ${e.message}`) }
  }

  // ═══ 3. TCGCOLLECTOR — with proper headers ═══
  console.log('\n═══ 3. tcgcollector.com (with headers) ═══')
  const tcgcSets = ['sv1v', 's1h', 'sv1s', 's12', 'sm1']
  for (const setId of tcgcSets) {
    try {
      const r = await fetch(`https://www.tcgcollector.com/cards/jp?cardSet=${setId}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        }
      })
      if (r.ok) {
        const html = await r.text()
        const imgs = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi) || []
        const cardImgs = imgs.filter(u => /card|product|image/i.test(u) && !/logo|icon|banner|flag/i.test(u))
        const hosts = [...new Set(cardImgs.map(u => { try { return new URL(u).hostname } catch { return '?' } }))]
        console.log(`✅ ${setId}: ${cardImgs.length} card images from ${hosts.join(', ')}`)
        cardImgs.slice(0,3).forEach(u => console.log(`   ${u}`))
      } else {
        console.log(`❌ ${setId} [${r.status}]`)
      }
    } catch(e) { console.log(`❌ ${setId} — ${e.message}`) }
  }

  // ═══ 4. PKMNCARDS.COM — JP card pages ═══
  console.log('\n═══ 4. pkmncards.com JP cards ═══')
  try {
    const r = await fetch('https://pkmncards.com/?s=charizard+japanese&display=scan&sort=date', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (r.ok) {
      const html = await r.text()
      const imgs = html.match(/https?:\/\/[^"'\s]+\.(jpg|png|webp)/gi) || []
      const cardImgs = imgs.filter(u => /upload|card|scan/i.test(u) && !/logo|icon|banner|avatar/i.test(u))
      console.log(`✅ Found ${cardImgs.length} card images`)
      cardImgs.slice(0,5).forEach(u => console.log(`   ${u}`))
    } else {
      console.log(`❌ [${r.status}]`)
    }
  } catch(e) { console.log(`❌ ${e.message}`) }

  // ═══ 5. DIRECT CDN TEST — pokemontcg.io with JP set IDs ═══
  console.log('\n═══ 5. pokemontcg.io — JP-exclusive sets ═══')
  // The JP sets on pokemontcg.io use different IDs
  // Let's search for JP cards
  try {
    // Search for Japanese Charizard
    const r = await fetch('https://api.pokemontcg.io/v2/cards?q=name:Charizard nationalPokedexNumbers:6&pageSize=5&orderBy=-set.releaseDate')
    const d = await r.json()
    if (d.data) {
      for (const c of d.data) {
        console.log(`  ${c.id} — ${c.name} (${c.set.name}) — ${c.images?.large ? '✅ has image' : '❌ no image'}`)
      }
    }
  } catch {}

  // ═══ 6. POKEMONCARD.JP (official JP database) ═══
  console.log('\n═══ 6. pokemon-card.com card-search ═══')
  try {
    const r = await fetch('https://www.pokemon-card.com/card-search/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (r.ok) {
      const html = await r.text()
      const imgs = html.match(/src="([^"]+\.(jpg|png|webp))"/gi) || []
      console.log(`  Page loaded, ${imgs.length} images found`)
      // Look for card image URL patterns
      const patterns = html.match(/card_images\/[^"'\s]+/g) || []
      console.log(`  card_images patterns: ${patterns.length}`)
      patterns.slice(0,5).forEach(p => console.log(`    ${p}`))
      
      // Look for data attributes or JSON
      const jsonBlocks = html.match(/\{[^}]*card_images[^}]*\}/g) || []
      if (jsonBlocks.length) console.log(`  JSON blocks with card_images: ${jsonBlocks[0].slice(0,200)}`)
    }
  } catch(e) { console.log(`  ❌ ${e.message}`) }

  console.log('\n═══ DEEP SCAN COMPLETE ═══')
}

main().catch(console.error)
