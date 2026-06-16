const API_KEY = process.env.POKETRACE_API_KEY

async function main() {
  const BASE = 'https://api.poketrace.com/v1'
  const headers = { 'Authorization': `Bearer ${API_KEY}` }

  // 1. Test basic card search
  console.log('═══ 1. Card search ═══')
  const r1 = await fetch(`${BASE}/cards?name=charizard&limit=3`, { headers })
  console.log('Status:', r1.status)
  const d1 = await r1.json()
  console.log('Response keys:', Object.keys(d1))
  console.log('First card:', JSON.stringify(d1.data?.[0] || d1.results?.[0] || d1).slice(0, 500))

  // 2. Test set query (batch)
  console.log('\n═══ 2. Set batch ═══')
  const r2 = await fetch(`${BASE}/cards?set=sv03&limit=20`, { headers })
  console.log('Status:', r2.status)
  const d2 = await r2.json()
  console.log('Cards returned:', d2.data?.length || d2.results?.length || 'unknown')
  if (d2.data?.[0] || d2.results?.[0]) {
    const card = d2.data?.[0] || d2.results?.[0]
    console.log('Card keys:', Object.keys(card))
    console.log('Sample:', JSON.stringify(card).slice(0, 600))
  }

  // 3. Test with market param
  console.log('\n═══ 3. Market EU ═══')
  const r3 = await fetch(`${BASE}/cards?set=sv03&market=cardmarket&limit=3`, { headers })
  console.log('Status:', r3.status)
  const d3 = await r3.json()
  console.log('Sample:', JSON.stringify(d3.data?.[0] || d3.results?.[0] || d3).slice(0, 500))

  // 4. Test JP market
  console.log('\n═══ 4. Market JP ═══')
  const r4 = await fetch(`${BASE}/cards?set=sv03&market=jp&limit=3`, { headers })
  console.log('Status:', r4.status)
  const d4 = await r4.json()
  console.log('Sample:', JSON.stringify(d4.data?.[0] || d4.results?.[0] || d4).slice(0, 500))

  // 5. Test graded prices
  console.log('\n═══ 5. Graded ═══')
  const r5 = await fetch(`${BASE}/cards?name=charizard&graded=true&limit=3`, { headers })
  console.log('Status:', r5.status)
  const d5 = await r5.json()
  console.log('Sample:', JSON.stringify(d5.data?.[0] || d5.results?.[0] || d5).slice(0, 500))

  // 6. Test pagination
  console.log('\n═══ 6. Pagination ═══')
  const r6 = await fetch(`${BASE}/cards?set=sv03&limit=20&offset=20`, { headers })
  console.log('Status:', r6.status)
  const d6 = await r6.json()
  console.log('Cards page 2:', d6.data?.length || d6.results?.length || 'unknown')

  // 7. Check rate limit headers
  console.log('\n═══ 7. Rate limits ═══')
  console.log('Headers:')
  for (const [k, v] of r1.headers) {
    if (/rate|limit|remain|quota/i.test(k)) console.log(`  ${k}: ${v}`)
  }

  // 8. OpenAPI spec
  console.log('\n═══ 8. OpenAPI ═══')
  const r8 = await fetch('https://api.poketrace.com/v1/openapi.json')
  if (r8.ok) {
    const spec = await r8.json()
    console.log('Paths:', Object.keys(spec.paths || {}))
    console.log('Endpoints:', Object.entries(spec.paths || {}).map(([p, v]) => p + ' [' + Object.keys(v).join(',') + ']'))
  }
}

main().catch(console.error)
