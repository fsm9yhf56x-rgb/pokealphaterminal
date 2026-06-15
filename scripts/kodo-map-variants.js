require(process.cwd() + '/node_modules/dotenv').config({ path: '.env.local', quiet: true })
const { neon } = require(process.cwd() + '/node_modules/@neondatabase/serverless')
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const sleep = ms => new Promise(r => setTimeout(r, ms))
async function get(p, tries=4){for(let i=1;i<=tries;i++){try{const r=await fetch(BASE+p,{headers:{'X-API-Key':KEY}});if(r.status===429){await sleep(12000);i--;continue}if(r.status===200)return r.json()}catch(e){}await sleep(i*1500)}return null}
async function fetchSet(slug){let all=[],c=null;for(let i=0;i<10;i++){const b=await get('/cards?set='+encodeURIComponent(slug)+'&limit=100'+(c?'&cursor='+encodeURIComponent(c):''));if(!b)break;all=all.concat(b.data||[]);c=b.pagination&&b.pagination.nextCursor;if(!c)break;await sleep(450)}return all}
const num = s => { const m=String(s||'').match(/\d+/); return m?parseInt(m[0],10):null }

// kodo_set_id -> { slug PokeTrace, regex variant a retenir }
const VARIANT_MAP = [
  { set:'en-base1-shadowless',    slug:'base-set-shadowless', re:/^Unlimited/i },      // shadowless unlimited
  { set:'en-base1-shadowless-ns', slug:'base-set-shadowless', re:/^1st_Edition/i },     // 1st ed (= shadowless 1st)
  { set:'en-base2-1st',           slug:'jungle',              re:/^1st_Edition/i },
  { set:'en-base3-1st',           slug:'fossil',              re:/^1st_Edition/i },
  { set:'en-base5-1st',           slug:'team-rocket',         re:/^1st_Edition/i },
  { set:'en-gym1-1st',            slug:'gym-heroes',          re:/^1st_Edition/i },
  { set:'en-gym2-1st',            slug:'gym-challenge',       re:/^1st_Edition/i },
  { set:'en-neo1-1st',            slug:'neo-genesis',         re:/^1st_Edition/i },
  { set:'en-neo2-1st',            slug:'neo-discovery',       re:/^1st_Edition/i },
  { set:'en-neo3-1st',            slug:'neo-revelation',      re:/^1st_Edition/i },
  { set:'en-neo4-1st',            slug:'neo-destiny',         re:/^1st_Edition/i },
]

;(async () => {
  const cache = {}
  for (const m of VARIANT_MAP) {
    if (!cache[m.slug]) { cache[m.slug] = await fetchSet(m.slug); console.log('fetch', m.slug, ':', cache[m.slug].length) }
    const rows = cache[m.slug].filter(c => m.re.test(c.variant || ''))
    // index par numero: holo prioritaire
    const byNum = {}
    for (const c of rows) {
      const n = num(c.cardNumber); if (n==null) continue
      const holo = /holo/i.test(c.variant || '')
      byNum[n] = byNum[n] || {}
      byNum[n][holo ? 'holo' : 'norm'] = c
    }
    const mine = await sql`SELECT id FROM tcg_cards WHERE set_id=${m.set}`
    let mapped = 0
    for (const card of mine) {
      const n = num(card.id.split('-').pop())
      const slot = byNum[n]
      if (!slot) continue
      const pick = slot.holo || slot.norm
      const isEU = pick.market === 'EU'
      await sql`INSERT INTO source_refs (kodo_card_id, poketrace_us_id, poketrace_us_holo_id, poketrace_eu_id, poketrace_eu_holo_id, tcgplayer_id, cardmarket_id, mapped_at, map_method, map_confidence)
        VALUES (${card.id},
          ${isEU?null:(slot.norm&&slot.norm.id)}, ${isEU?null:(slot.holo&&slot.holo.id)},
          ${isEU?(slot.norm&&slot.norm.id):null}, ${isEU?(slot.holo&&slot.holo.id):null},
          ${pick.refs&&pick.refs.tcgplayerId?String(pick.refs.tcgplayerId):null},
          ${pick.refs&&pick.refs.cardmarketId?String(pick.refs.cardmarketId):null},
          now(), 'variant:'||${m.re.source}, 1)
        ON CONFLICT (kodo_card_id) DO UPDATE SET
          poketrace_us_id=EXCLUDED.poketrace_us_id, poketrace_us_holo_id=EXCLUDED.poketrace_us_holo_id,
          poketrace_eu_id=EXCLUDED.poketrace_eu_id, poketrace_eu_holo_id=EXCLUDED.poketrace_eu_holo_id,
          tcgplayer_id=COALESCE(EXCLUDED.tcgplayer_id, source_refs.tcgplayer_id),
          cardmarket_id=COALESCE(EXCLUDED.cardmarket_id, source_refs.cardmarket_id),
          map_method=EXCLUDED.map_method`
      mapped++
    }
    // mettre a jour kodo_set_map
    await sql`UPDATE kodo_set_map SET us_slug=${m.slug}, method='variant-mapped', validated=true WHERE kodo_set_id=${m.set}`
    console.log(m.set, '(', m.re.source, ') →', mapped, '/', mine.length, 'mappees')
  }
  console.log('\nVariants mappes. Relance l ingestion pour ces cartes.')
})().catch(e=>console.error('ERR:',e.message))
