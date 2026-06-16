require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))
let reqCount = 0

async function get(path) {
  reqCount++
  const r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) { await sleep(12000); reqCount--; return get(path) }
  if (r.status !== 200) return null
  return r.json()
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(sv\d+\w*|swsh\d*|sm\d*\w*|xy\d*|bw\d*|dp\d*|hgss|ex|me\d*|mep|mee|s\d+\w*|l\d+|sv|swsh|sm|me)[:\s.-]+/i, '')
    .replace(/\b(and|the|of|&)\b/g, ' ')
    .replace(/[^a-z0-9]/g, '')
}

;(async () => {
  await sql`CREATE TABLE IF NOT EXISTS kodo_set_map (
    kodo_set_id text PRIMARY KEY,
    kodo_set_name text,
    us_slug text,
    eu_slug text,
    candidates jsonb,
    method text,
    confidence real,
    validated boolean NOT NULL DEFAULT false,
    mapped_at timestamptz
  )`

  console.log('1. Catalogue sets PokeTrace...')
  let ptSets = [], cursor = null
  for (let i = 0; i < 60; i++) {
    const body = await get('/sets?limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    if (!body) break
    const rows = body.data || body.sets || []
    if (!rows.length) break
    ptSets = ptSets.concat(rows)
    cursor = body.pagination && body.pagination.nextCursor
    if (!cursor) break
    await sleep(450)
  }
  console.log('   ', ptSets.length, 'sets PokeTrace')

  const ptIndex = []
  for (const s of ptSets) {
    const slug = s.slug || s.id
    if (!slug) continue
    ptIndex.push({ slug, name: s.name || slug, n: norm(s.name || slug), nRaw: norm((s.name || slug).replace(/^ex\s+/i, '')) })
  }

  const mySets = await sql`SELECT s.id, s.name, count(c.id) AS cards
    FROM tcg_sets s JOIN tcg_cards c ON c.set_id = s.id
    WHERE s.id LIKE 'en-%' GROUP BY s.id, s.name ORDER BY s.id`
  console.log('2. Sets Kodo EN:', mySets.length)

  const marketCache = {}
  async function marketOf(slug) {
    if (marketCache[slug] !== undefined) return marketCache[slug]
    const body = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=1')
    await sleep(450)
    const card = body && body.data && body.data[0]
    marketCache[slug] = card ? card.market : null
    return marketCache[slug]
  }

  let full = 0, partial = 0, ambiguous = 0, none = 0
  const reportAmbiguous = [], reportNone = []

  for (const ms of mySets) {
    const target = norm(ms.name)
    const cands = ptIndex.filter(p => p.n === target || p.nRaw === target || p.n === norm('ex ' + ms.name))
    if (!cands.length) {
      none++
      reportNone.push(ms.id + ' | ' + ms.name)
      await sql`INSERT INTO kodo_set_map (kodo_set_id, kodo_set_name, candidates, method, confidence, mapped_at)
        VALUES (${ms.id}, ${ms.name}, '[]', 'none', 0, now())
        ON CONFLICT (kodo_set_id) DO UPDATE SET candidates='[]', method='none', confidence=0, mapped_at=now()`
      continue
    }

    let usSlug = null, euSlug = null, conflict = false
    for (const c of cands.slice(0, 5)) {
      const m = await marketOf(c.slug)
      if (m === 'US') { if (usSlug) conflict = true; else usSlug = c.slug }
      else if (m === 'EU') { if (euSlug) conflict = true; else euSlug = c.slug }
    }

    const conf = conflict ? 0.4 : (usSlug && euSlug ? 1 : (usSlug || euSlug ? 0.7 : 0))
    if (conflict) { ambiguous++; reportAmbiguous.push(ms.id + ' | ' + ms.name + ' → ' + cands.map(c => c.slug).join(', ')) }
    else if (usSlug && euSlug) full++
    else if (usSlug || euSlug) partial++
    else { none++; reportNone.push(ms.id + ' | ' + ms.name + ' (candidats sans marche)') }

    await sql`INSERT INTO kodo_set_map (kodo_set_id, kodo_set_name, us_slug, eu_slug, candidates, method, confidence, validated, mapped_at)
      VALUES (${ms.id}, ${ms.name}, ${usSlug}, ${euSlug}, ${JSON.stringify(cands.map(c => c.slug))},
        'name+marketprobe', ${conf}, ${!conflict && !!(usSlug || euSlug)}, now())
      ON CONFLICT (kodo_set_id) DO UPDATE SET us_slug=EXCLUDED.us_slug, eu_slug=EXCLUDED.eu_slug,
        candidates=EXCLUDED.candidates, method=EXCLUDED.method, confidence=EXCLUDED.confidence,
        validated=EXCLUDED.validated, mapped_at=now()`

    if ((full + partial + ambiguous + none) % 25 === 0)
      console.log('   ...', full + partial + ambiguous + none, '/', mySets.length, '| req:', reqCount)
  }

  console.log('\n=== RAPPORT SETS ===')
  console.log('Complets (US+EU):', full, '| Partiels (1 marche):', partial, '| Ambigus:', ambiguous, '| Introuvables:', none)
  console.log('Requetes utilisees:', reqCount)
  if (reportAmbiguous.length) console.log('\nAMBIGUS (a valider):\n' + reportAmbiguous.join('\n'))
  if (reportNone.length) console.log('\nINTROUVABLES:\n' + reportNone.join('\n'))
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
