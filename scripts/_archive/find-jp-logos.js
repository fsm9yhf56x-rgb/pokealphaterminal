const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  console.log('═══ Finding JP set logos from pokemon-card.com ═══\n')

  const BASE = 'https://www.pokemon-card.com'

  // 1. Scrape a card page to find the set logo URL pattern
  const testPages = [
    '/card-search/details.php/card/43689',
    '/card-search/details.php/card/50000',
    '/card-search/details.php/card/40000',
    '/card-search/details.php/card/45000',
  ]

  for (const page of testPages) {
    const res = await fetch(BASE + page, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (!res.ok) continue
    const html = await res.text()
    
    // Find all image URLs
    const imgs = html.match(/src="([^"]+)"/gi) || []
    const setImgs = imgs.filter(i => /mark|logo|series|expansion|symbol/i.test(i))
    console.log(`${page}:`)
    if (setImgs.length) {
      setImgs.forEach(i => console.log(`  SET: ${i}`))
    }
    // Also look for any /assets/images path that might be a logo
    const assetImgs = imgs.filter(i => i.includes('/assets/images/') && !i.includes('card_images') && !i.includes('globalmenu'))
    assetImgs.forEach(i => console.log(`  ASSET: ${i}`))

    await sleep(300)
  }

  // 2. Check the expansion list page
  console.log('\n--- Expansion list page ---')
  const expansionRes = await fetch(BASE + '/card-search/', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  if (expansionRes.ok) {
    const html = await expansionRes.text()
    const markImgs = html.match(/src="([^"]*(?:mark|logo|expansion|series|symbol)[^"]*)"/gi) || []
    console.log(`Found ${markImgs.length} mark/logo images`)
    markImgs.slice(0, 10).forEach(i => console.log(`  ${i}`))

    // Find expansion/series related sections
    const expansions = html.match(/expansion[^"]{0,200}/gi) || []
    console.log(`\nExpansion refs: ${expansions.length}`)
    expansions.slice(0, 5).forEach(e => console.log(`  ${e.slice(0, 100)}`))
  }

  // 3. Try the API with expansion data
  console.log('\n--- API expansion data ---')
  const apiRes = await fetch(BASE + '/card-search/resultAPI.php?keyword=&regulation_sidebar_form=all&page=1', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  if (apiRes.ok) {
    const data = await apiRes.json()
    // Check full card data structure
    const card = data.cardList?.[0]
    console.log('Full card keys:', Object.keys(card || {}))
    console.log('Full card sample:', JSON.stringify(card).slice(0, 500))
  }

  // 4. Try known logo URL patterns
  console.log('\n--- Testing logo URL patterns ---')
  const patterns = [
    '/assets/images/card_images/mark/SV1S.png',
    '/assets/images/card_images/mark/sv1s.png',
    '/assets/images/expansion/SV1S.png',
    '/assets/images/expansion/sv1s.png',
    '/assets/images/series/SV1S.png',
    '/assets/images/logo/SV1S.png',
    '/assets/images/card_images/expansion/SV1S.png',
  ]
  for (const p of patterns) {
    const r = await fetch(BASE + p, { method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    console.log(`${r.ok ? '✅' : '❌'} [${r.status}] ${p}`)
  }

  console.log('\n✅ Done')
}

main().catch(console.error)
