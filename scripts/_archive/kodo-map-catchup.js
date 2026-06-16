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
async function fetchSet(slug) {
  let all = [], cursor = null
  for (let i = 0; i < 60; i++) {
    const b = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    if (!b) break
    all = all.concat(b.data || [])
    cursor = b.pagination && b.pagination.nextCursor
    if (!cursor) break
    await sleep(420)
  }
  return all
}
// numero normalise AVEC prefixe lettres: 'TG12', 'GG23', 'H3', 'SV45', '101'
const tok = s => {
  const m = String(s || '').toUpperCase().match(/([A-Z]{0,3})0*(\d+)/)
  return m ? m[1] + m[2] : null
}

const FIXES = [
  { set: 'en-swsh9',    slugs: ['swsh09-brilliant-stars-trainer-gallery', 'brilliant-stars-trainer-gallery'] },
  { set: 'en-swsh10',   slugs: ['swsh10-astral-radiance-trainer-gallery', 'astral-radiance-trainer-gallery'] },
  { set: 'en-swsh11',   slugs: ['swsh11-lost-origin-trainer-gallery', 'lost-origin-trainer-gallery'] },
  { set: 'en-swsh12',   slugs: ['swsh12-silver-tempest-trainer-gallery', 'silver-tempest-trainer-gallery'] },
  { set: 'en-swsh12.5', slugs: ['swsh-crown-zenith-galarian-gallery', 'crown-zenith-galarian-gallery'] },
  { set: 'en-swsh4.5',  slugs: ['shining-fates-shiny-vault'] },
  { set: 'en-cel25',    slugs: ['celebrations-classic-collection'] },
  { set: 'en-g1',       slugs: ['generations-radiant-collection'] },
  { set: 'en-bw11',     slugs: ['legendary-treasures-radiant-collection'] },
  { set: 'en-ecard2',   slugs: [] },  // re-match prefixe H sur slugs deja mappes
  { set: 'en-ecard3',   slugs: [] },
]

;(async () => {
  console.log('=== DIAGNOSTIC obsidian-flames & mfb ===')
  for (const sid of ['en-obsidian-flames', 'en-mfb']) {
    const cards = await sql`SELECT id FROM tcg_cards WHERE set_id=${sid} LIMIT 3`
    const map = await sql`SELECT us_slug, eu_slug, candidates FROM kodo_set_map WHERE kodo_set_id=${sid}`
    console.log(sid, '| ids:', cards.map(c => c.id).join(', '))
    console.log('   map:', JSON.stringify(map[0] || null))
  }

  console.log('\n=== RATTRAPAGE ===')
  for (const fix of FIXES) {
    const base = await sql`SELECT us_slug, eu_slug FROM kodo_set_map WHERE kodo_set_id=${fix.set}`
    const slugsToFetch = fix.slugs.length ? fix.slugs : [base[0] && base[0].us_slug, base[0] && base[0].eu_slug].filter(Boolean)

    const myCards = await sql`SELECT c.id FROM tcg_cards c
      LEFT JOIN source_refs r ON r.kodo_card_id = c.id
      WHERE c.set_id = ${fix.set} AND r.kodo_card_id IS NULL`
    if (!myCards.length) { console.log(fix.set, ': rien a rattraper'); continue }
    const byTok = {}
    for (const c of myCards) {
      const t = tok(c.id.split('-').pop())
      if (t) byTok[t] = c.id
    }

    const refs = {}
    const ensure = t => refs[t] || (refs[t] = {})
    for (const slug of slugsToFetch) {
      const rows = await fetchSet(slug)
      if (!rows.length) { console.log('  [vide]', slug); continue }
      for (const c of rows) {
        const t = tok(c.cardNumber)
        if (!t || !byTok[t]) continue
        if (/reverse|1st/i.test(c.variant || '')) continue
        const slot = ensure(t)
        const holo = /holo/i.test(c.variant || '')
        const isEU = c.market === 'EU'
        const key = (isEU ? 'eu' : 'us') + (holo ? '_holo' : '')
        slot[key] = c.id
        if (!isEU && !slot.tcgp && c.refs && c.refs.tcgplayerId) slot.tcgp = String(c.refs.tcgplayerId)
        if (isEU && !slot.cm && c.refs && c.refs.cardmarketId) slot.cm = String(c.refs.cardmarketId)
      }
    }

    let mapped = 0
    for (const [t, s] of Object.entries(refs)) {
      mapped++
      const score = ['us','us_holo','eu','eu_holo'].filter(k => s[k]).length
      await sql`INSERT INTO source_refs (kodo_card_id, tcgplayer_id, poketrace_us_id, poketrace_us_holo_id,
          poketrace_eu_id, poketrace_eu_holo_id, cardmarket_id, mapped_at, map_method, map_confidence)
        VALUES (${byTok[t]}, ${s.tcgp || null}, ${s.us || null}, ${s.us_holo || null},
          ${s.eu || null}, ${s.eu_holo || null}, ${s.cm || null}, now(), 'catchup', ${score / 4})
        ON CONFLICT (kodo_card_id) DO UPDATE SET
          tcgplayer_id = COALESCE(EXCLUDED.tcgplayer_id, source_refs.tcgplayer_id),
          poketrace_us_id = COALESCE(EXCLUDED.poketrace_us_id, source_refs.poketrace_us_id),
          poketrace_us_holo_id = COALESCE(EXCLUDED.poketrace_us_holo_id, source_refs.poketrace_us_holo_id),
          poketrace_eu_id = COALESCE(EXCLUDED.poketrace_eu_id, source_refs.poketrace_eu_id),
          poketrace_eu_holo_id = COALESCE(EXCLUDED.poketrace_eu_holo_id, source_refs.poketrace_eu_holo_id),
          cardmarket_id = COALESCE(EXCLUDED.cardmarket_id, source_refs.cardmarket_id),
          mapped_at = now(), map_confidence = EXCLUDED.map_confidence`
    }
    console.log(fix.set, ':', mapped, '/', myCards.length, 'rattrapees')
  }

  const cover = await sql`
    SELECT count(c.id) AS total, count(r.kodo_card_id) AS mapped
    FROM tcg_cards c
    JOIN kodo_set_map m ON m.kodo_set_id = c.set_id AND m.method NOT IN ('excluded','variant-of-parent')
    LEFT JOIN source_refs r ON r.kodo_card_id = c.id`
  console.log('\nCOUVERTURE FINALE:', cover[0].mapped, '/', cover[0].total,
    '(' + (100 * cover[0].mapped / cover[0].total).toFixed(1) + '%)')
})().catch(e => { console.error('ERR:', e.message); process.exit(1) })
