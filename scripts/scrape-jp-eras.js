const fs = require('fs')

async function main() {
  console.log('═══ Scraping JP set eras from TCGCollector ═══\n')

  const r = await fetch('https://www.tcgcollector.com/sets/jp', {
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  })
  
  if (!r.ok) {
    console.log('Failed:', r.status)
    // Fallback: Bulbapedia
    console.log('\nTrying Bulbapedia...')
    const r2 = await fetch('https://bulbapedia.bulbagarden.net/wiki/List_of_Japanese_Pok%C3%A9mon_Trading_Card_Game_expansions', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
    })
    if (r2.ok) {
      const html = await r2.text()
      
      // Find all era headings and their sets
      const sections = html.split(/<h[23][^>]*>/)
      console.log('Bulbapedia sections:', sections.length)
      
      const eras = []
      let currentEra = null
      
      for (const section of sections) {
        // Check if this is an era heading
        const headingMatch = section.match(/^([^<]+)</)
        if (headingMatch) {
          const heading = headingMatch[1].trim()
          if (/era|series|original/i.test(heading) || /Original|Neo|e-Card|ADV|PCG|Diamond|Platinum|LEGEND|Black|White|XY|Sun|Moon|Sword|Shield|Scarlet|Violet|MEGA/i.test(heading)) {
            currentEra = heading.replace(/\[.*\]/, '').trim()
          }
        }
        
        // Find set names and codes in this section
        if (currentEra) {
          // Look for Japanese set names
          const setLinks = section.match(/<a[^>]*title="([^"]*\(TCG\))"[^>]*>/g) || []
          const setNames = section.match(/title="([^"]*\(TCG\))"/g) || []
          if (setNames.length) {
            setNames.forEach(m => {
              const name = m.match(/title="([^"]+)"/)?.[1]?.replace(' (TCG)', '') || ''
              if (name) eras.push({ era: currentEra, name })
            })
          }
        }
      }
      
      console.log('\nEras found:', [...new Set(eras.map(e => e.era))].join(', '))
      console.log('Total sets:', eras.length)
      eras.slice(0, 20).forEach(e => console.log(`  ${e.era} → ${e.name}`))
    }
    return
  }

  const html = await r.text()
  console.log('Page loaded, size:', html.length)
  
  // Find era sections and their sets
  // TCGCollector uses heading structure with set links
  const eraPattern = /class="[^"]*set-group-title[^"]*"[^>]*>([^<]+)/g
  const setPattern = /class="[^"]*set-name[^"]*"[^>]*>([^<]+)/g
  
  let match
  const eras = []
  
  // Try to find structure
  const headings = html.match(/<h[23][^>]*>[^<]+/g) || []
  console.log('Headings:', headings.length)
  headings.filter(h => /era|original|neo|e-card|adv|pcg|dp|platinum|legend|bw|xy|sun|moon|sword|shield|scarlet|violet|mega/i.test(h))
    .forEach(h => console.log('  ' + h))
  
  // Find all set links with their context
  const setLinks = html.match(/<a[^>]*href="\/cards\/jp\?cardSet=[^"]*"[^>]*>[^<]*/g) || []
  console.log('\nSet links:', setLinks.length)
  setLinks.slice(0, 20).forEach(l => console.log('  ' + l))
}

main().catch(console.error)
