const fs = require('fs')

async function main() {
  console.log('═══ Scraping JP eras from Bulbapedia ═══\n')

  const r = await fetch('https://bulbapedia.bulbagarden.net/wiki/List_of_Japanese_Pok%C3%A9mon_Trading_Card_Game_expansions', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
  })
  const html = await r.text()

  // Split by era headings
  const eraNames = [
    'Original Era','neo Era','VS Era','web Era','e-Card Era',
    'ADV Era','PCG Era','DP Era','DPt Era','LEGEND Era',
    'BW Era','XY Era','XY BREAK Era',
    'Sun &amp; Moon Era','Sun & Moon Era',
    'Sword &amp; Shield Era','Sword & Shield Era',
    'Scarlet &amp; Violet Era','Scarlet & Violet Era',
    'MEGA Series',
    'Promotional sets'
  ]

  // For each era, find the section and extract Japanese set names
  const results = []

  for (const era of eraNames) {
    const eraId = era.replace(/&amp;/g, '&').replace(/ /g, '_')
    const idx = html.indexOf(`id="${eraId}"`)
    if (idx === -1) continue

    // Find next era heading to delimit section
    let endIdx = html.length
    for (const nextEra of eraNames) {
      const nextId = nextEra.replace(/&amp;/g, '&').replace(/ /g, '_')
      if (nextId === eraId) continue
      const nextIdx = html.indexOf(`id="${nextId}"`, idx + 100)
      if (nextIdx > idx && nextIdx < endIdx) endIdx = nextIdx
    }

    const section = html.substring(idx, endIdx)

    // Extract Japanese names (in bold or links)
    // Look for Japanese text patterns in the section
    const jpNames = section.match(/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf\u3400-\u4dbf]{2,30}[^<]{0,20}/g) || []
    
    // Also extract linked set names
    const links = section.match(/title="([^"]+\(TCG\))"/g) || []
    const setNames = links.map(l => l.match(/title="([^"]+) \(TCG\)"/)?.[1]).filter(Boolean)

    // Extract English names from the section too
    const enNames = section.match(/<i>([^<]+)<\/i>/g) || []
    const englishNames = enNames.map(n => n.replace(/<\/?i>/g, '').trim()).filter(n => /^[A-Za-z\s&':!]+$/.test(n))

    const cleanEra = era.replace(/&amp;/g, '&')
    console.log(`\n═══ ${cleanEra} ═══`)
    console.log(`  Set names (TCG links): ${setNames.length}`)
    setNames.forEach(n => console.log(`    ${n}`))
    if (englishNames.length) {
      console.log(`  English names: ${englishNames.length}`)
      englishNames.slice(0, 5).forEach(n => console.log(`    ${n}`))
    }
  }
}

main().catch(console.error)
