require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function get(path) {
  const r = await fetch(BASE + path, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) { await sleep(12000); return get(path) }
  return r.status === 200 ? r.json() : null
}
async function marketOf(slug) {
  const b = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=1')
  await sleep(450)
  return b && b.data && b.data[0] ? b.data[0].market : null
}

// Ambigus: slugs candidats retenus manuellement
const RESOLVE = {
  'en-base1':      ['base-set'],
  'en-bwp':        ['bw-black-star-promos'],
  'en-dpp':        ['dp-black-star-promos'],
  'en-hgssp':      ['hgss-black-star-promos'],
  'en-mep':        ['mep-black-star-promos'],
  'en-sm6':        ['forbidden-light', 'sm-forbidden-light', 'sm6-forbidden-light'],
  'en-smp':        ['sm-black-star-promos'],
  'en-sv10.5b':    ['black-bolt', 'sv-black-bolt'],
  'en-sv10.5w':    ['white-flare', 'sv-white-flare'],
  'en-swsh10.5':   ['pokemon-go'],
  'en-swsh12.5':   ['crown-zenith', 'swsh-crown-zenith'],
  'en-swshp':      ['swsh-black-star-promos'],
  'en-xyp':        ['xy-black-star-promos'],
}

// 1st Ed / Shadowless → meme slug que le set parent + filtre variant a l'ingestion
const VARIANT_SETS = {
  'en-base1-shadowless':    { parent: 'en-base1', variantFilter: 'Shadowless' },
  'en-base1-shadowless-ns': { parent: 'en-base1', variantFilter: '1st Edition' },
  'en-base2-1st':           { parent: 'en-base2', variantFilter: '1st Edition' },
  'en-base3-1st':           { parent: 'en-base3', variantFilter: '1st Edition' },
  'en-base5-1st':           { parent: 'en-base5', variantFilter: '1st Edition' },
  'en-gym1-1st':            { parent: 'en-gym1', variantFilter: '1st Edition' },
  'en-gym2-1st':            { parent: 'en-gym2', variantFilter: '1st Edition' },
  'en-neo1-1st':            { parent: 'en-neo1', variantFilter: '1st Edition' },
  'en-neo2-1st':            { parent: 'en-neo2', variantFilter: '1st Edition' },
  'en-neo3-1st':            { parent: 'en-neo3', variantFilter: '1st Edition' },
  'en-neo4-1st':            { parent: 'en-neo4', variantFilter: '1st Edition' },
}

// Hors perimetre Kodo Engine (Pocket = virtuel, micro-sets)
const EXCLUDE_PREFIXES = ['en-A', 'en-B1', 'en-B2', 'en-P-A', 'en-tk-']
const EXCLUDE_EXACT = ['en-bog', 'en-exu', 'en-fut2020', 'en-mee', 'en-sve', 'en-xya', 'en-2021swsh', 'en-2023sv', 'en-svp']

;(async () => {
  console.log('=== 1. Resolution des ambigus ===')
  for (const [kodoId, slugs] of Object.entries(RESOLVE)) {
    let us = null, eu = null
    for (const slug of slugs) {
      const m = await marketOf(slug)
      if (m === 'US' && !us) us = slug
      if (m === 'EU' && !eu) eu = slug
    }
    await sql`UPDATE kodo_set_map SET us_slug=${us}, eu_slug=${eu},
      confidence=${us || eu ? 1 : 0}, validated=${!!(us || eu)},
      method='manual-resolve', mapped_at=now() WHERE kodo_set_id=${kodoId}`
    console.log(kodoId, '→ US:', us || '-', '| EU:', eu || '-')
  }

  console.log('\n=== 2. Sets variant (1st Ed / Shadowless) ===')
  for (const [kodoId, cfg] of Object.entries(VARIANT_SETS)) {
    const parent = await sql`SELECT us_slug, eu_slug FROM kodo_set_map WHERE kodo_set_id=${cfg.parent}`
    const p = parent[0] || {}
    await sql`INSERT INTO kodo_set_map (kodo_set_id, kodo_set_name, us_slug, eu_slug, candidates, method, confidence, validated, mapped_at)
      VALUES (${kodoId}, ${kodoId}, ${p.us_slug || null}, ${p.eu_slug || null},
        ${JSON.stringify({ variantFilter: cfg.variantFilter, parent: cfg.parent })},
        'variant-of-parent', ${p.us_slug || p.eu_slug ? 0.9 : 0}, ${!!(p.us_slug || p.eu_slug)}, now())
      ON CONFLICT (kodo_set_id) DO UPDATE SET us_slug=EXCLUDED.us_slug, eu_slug=EXCLUDED.eu_slug,
        candidates=EXCLUDED.candidates, method='variant-of-parent', confidence=EXCLUDED.confidence,
        validated=EXCLUDED.validated, mapped_at=now()`
    console.log(kodoId, '→ parent', cfg.parent, '| filtre:', cfg.variantFilter, '| US:', p.us_slug || '-')
  }

  console.log('\n=== 3. Exclusions ===')
  const all = await sql`SELECT kodo_set_id FROM kodo_set_map WHERE method='none'`
  let excluded = 0
  for (const r of all) {
    const id = r.kodo_set_id
    if (EXCLUDE_EXACT.includes(id) || EXCLUDE_PREFIXES.some(p => id.startsWith(p))) {
      await sql`UPDATE kodo_set_map SET method='excluded', validated=true, mapped_at=now() WHERE kodo_set_id=${id}`
      excluded++
    }
  }
  console.log('Exclus:', excluded)

  console.log('\n=== BILAN GLOBAL ===')
  const bilan = await sql`SELECT method, count(*) AS n,
    count(us_slug) AS with_us, count(eu_slug) AS with_eu
    FROM kodo_set_map GROUP BY method ORDER BY n DESC`
  for (const b of bilan) console.log(b.method, ':', b.n, '| US:', b.with_us, '| EU:', b.with_eu)
  const rest = await sql`SELECT kodo_set_id, kodo_set_name FROM kodo_set_map WHERE validated=false AND method NOT IN ('excluded')`
  console.log('\nNon resolus restants:', rest.length)
  for (const r of rest) console.log(' -', r.kodo_set_id, '|', r.kodo_set_name)
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
