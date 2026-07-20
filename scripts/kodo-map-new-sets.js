/**
 * Kodo — kodo-map-new-sets.js : LE MAILLON QUI MANQUAIT.
 *
 * Constat du 20/07 : Pitch Black (me05, 240 cartes EN/FR) absorbe par le
 * catalogue, images OK, index OK — et AUCUN prix possible : source_refs
 * vide, slugs PokeTrace NULL. La campagne de mapping de mai (scripts
 * _archive/kodo-map-*) etait one-shot ; personne ne mappe les nouveaux sets.
 *
 * Ce script est idempotent et se branche dans sync-catalog.yml :
 *   1. trouve les sets ayant des cartes k_cards SANS source_refs
 *   2. resout leurs slugs PokeTrace par candidats de NOM (slugify) +
 *      sonde /cards?set=X&limit=1 ; classement US/EU par sources de prix
 *   3. upsert kodo_set_map, puis matching par numero (tok) -> source_refs
 *   4. set introuvable chez PokeTrace -> log + retry au prochain run
 *      (eux aussi ont un delai d'integration) — JAMAIS d'echec de chaine
 *
 * Usage :
 *   node scripts/kodo-map-new-sets.js            # DRY RUN (montre tout, n'ecrit rien)
 *   node scripts/kodo-map-new-sets.js --commit   # ecrit kodo_set_map + source_refs
 *   KODO_MAP_SETS=me05 node ...                  # restreindre a un/des sets (csv)
 */
const path = require('path')
try { require(path.join(process.cwd(), 'node_modules/dotenv')).config({ path: '.env.local', quiet: true }) } catch {}
const { neon } = require(path.join(process.cwd(), 'node_modules/@neondatabase/serverless'))
const sql = neon(process.env.DATABASE_URL)
const KEY = process.env.POKETRACE_API_KEY
const BASE = 'https://api.poketrace.com/v1'
const COMMIT = process.argv.includes('--commit')
const ONLY = (process.env.KODO_MAP_SETS || '').split(',').map(s => s.trim()).filter(Boolean)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// 429 : arret propre, jamais de boucle infinie (lecon du 17/07 sur l'ingest)
const MAX_429_STREAK = 8
let streak429 = 0, quotaDead = false, reqCount = 0
async function get(p, tries = 0) {
  if (quotaDead) return null
  reqCount++
  const r = await fetch(BASE + p, { headers: { 'X-API-Key': KEY } })
  if (r.status === 429) {
    reqCount--
    streak429++
    if (streak429 >= MAX_429_STREAK) { quotaDead = true; console.warn('[quota] epuise, arret propre'); return null }
    if (tries >= 2) return null
    await sleep(4000 * (tries + 1))
    return get(p, tries + 1)
  }
  streak429 = 0
  return r.status === 200 ? r.json() : null
}

// numero normalise avec prefixe lettres : 'TG12', 'SV45', '101' (tok de la campagne de mai)
const tok = s => { const m = String(s || '').toUpperCase().match(/([A-Z]{0,3})0*(\d+)/); return m ? m[1] + m[2] : null }

const slugify = s => String(s || '').toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/['\u2019]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// US/EU d'un slug : on regarde les sources de prix de la 1re carte
async function marketOf(slug) {
  const b = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=1')
  const card = b && b.data && b.data[0]
  if (!card) return null
  // le champ market EXISTE dans la reponse (vu au dry-run me05) — on le lit
  return { market: card.market === 'EU' ? 'EU' : 'US', sample: card }
}

async function fetchSetCards(slug) {
  let all = [], cursor = null
  for (let i = 0; i < 60; i++) {
    const b = await get('/cards?set=' + encodeURIComponent(slug) + '&limit=100' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''))
    if (!b) break
    all = all.concat((b.data || []).filter(c => c.productType !== 'sealed'))
    cursor = b.pagination && b.pagination.nextCursor
    if (!cursor) break
    await sleep(420)
  }
  return all
}

;(async () => {
  console.log('=== kodo-map-new-sets ' + (COMMIT ? '(COMMIT)' : '(DRY RUN — rien ne sera ecrit)') + ' ===')

  // 1. Sets avec cartes non mappees (set derive du print_id : tout sauf le dernier segment)
  const pending = await sql`
    SELECT regexp_replace(kc.print_id, '-[^-]+$', '') AS set_id, kc.lang, COUNT(*)::int AS missing
    FROM k_cards kc
    LEFT JOIN source_refs sr ON sr.kodo_card_id = kc.id
    WHERE sr.kodo_card_id IS NULL AND kc.lang IN ('en', 'fr')
    GROUP BY 1, 2 ORDER BY 3 DESC`
  const bySet = new Map()
  for (const p of pending) {
    if (ONLY.length && !ONLY.includes(p.set_id)) continue
    if (!bySet.has(p.set_id)) bySet.set(p.set_id, {})
    bySet.get(p.set_id)[p.lang] = p.missing
  }
  if (!bySet.size) { console.log('Aucun set a mapper — tout est couvert.'); process.exit(0) }
  console.log('Sets a mapper : ' + [...bySet.entries()].map(([k, v]) => k + '(' + Object.entries(v).map(([l, n]) => l + ':' + n).join(',') + ')').join('  '))

  for (const [setId, langs] of bySet) {
    if (quotaDead) break
    const [meta] = await sql`SELECT name, name_fr, series FROM k_sets WHERE id = ${setId}`
    if (!meta) { console.log('\n-- ' + setId + ' : absent de k_sets, saute'); continue }
    console.log('\n== ' + setId + ' — "' + meta.name + '" / "' + (meta.name_fr || '-') + '" (' + Object.keys(langs).join(',') + ')')

    // 2. Candidats de slug par nom (EN pour US, EN+FR pour EU) + prefixes usuels
    const en = slugify(meta.name), fr = slugify(meta.name_fr), serie = slugify(meta.series)
    const candidates = [...new Set([
      en, setId + '-' + en, serie ? serie + '-' + en : null,
      fr, fr ? setId + '-' + fr : null,
    ].filter(Boolean))]

    let usSlug = null, euSlug = null, sample = null
    for (const c of candidates) {
      if (usSlug && euSlug) break
      const m = await marketOf(c)
      if (!m) continue
      if (m.market === 'US' && !usSlug) { usSlug = c; sample = sample || m.sample }
      if (m.market === 'EU' && !euSlug) { euSlug = c; sample = sample || m.sample }
      await sleep(300)
    }

    if (!usSlug && !euSlug) {
      console.log('   INTROUVABLE chez PokeTrace (candidats testes : ' + candidates.join(', ') + ')')
      console.log('   -> normal si le set est tres recent chez eux aussi ; retry au prochain run.')
      continue
    }
    console.log('   slugs -> US: ' + (usSlug || '-') + '  EU: ' + (euSlug || '-'))
    if (sample && !COMMIT) {
      console.log('   ECHANTILLON carte PokeTrace (verifier les champs avant --commit) :')
      console.log('   ' + JSON.stringify(sample).slice(0, 600))
    }

    if (COMMIT) {
      for (const lang of Object.keys(langs)) {
        const kodoSetId = lang + '-' + setId
        await sql`INSERT INTO kodo_set_map (kodo_set_id, kodo_set_name, us_slug, eu_slug, method, confidence, validated, mapped_at)
          VALUES (${kodoSetId}, ${meta.name}, ${usSlug}, ${euSlug}, 'auto-name', 0.9, true, now())
          ON CONFLICT (kodo_set_id) DO UPDATE SET us_slug = COALESCE(kodo_set_map.us_slug, EXCLUDED.us_slug),
            eu_slug = COALESCE(kodo_set_map.eu_slug, EXCLUDED.eu_slug), mapped_at = now()`
      }
      await sql`UPDATE k_sets SET poketrace_us_slug = COALESCE(poketrace_us_slug, ${usSlug}),
        poketrace_eu_slug = COALESCE(poketrace_eu_slug, ${euSlug}) WHERE id = ${setId}`
    }

    // 3. Matching par numero -> source_refs
    for (const [lang, slug] of [['en', usSlug], ['fr', euSlug || usSlug]]) {
      if (!langs[lang] || !slug || quotaDead) continue
      const remote = await fetchSetCards(slug)
      if (!remote.length) { console.log('   ' + lang + ' : fetch vide sur ' + slug); continue }
      if (!COMMIT) {
        console.log('   3 premieres cartes ' + lang + ' : ' + remote.slice(0, 3).map(c => JSON.stringify({ n: c.cardNumber, name: c.name, variant: c.variant })).join(' '))
      }
      const byTok = new Map()
      for (const rc of remote) {
        // '036/120' -> on tok la partie avant le slash
        const t = tok(String(rc.cardNumber || '').split('/')[0])
        if (t && !byTok.has(t)) byTok.set(t, rc)
      }
      const mine = await sql`SELECT id, print_id FROM k_cards kc
        WHERE kc.lang = ${lang} AND regexp_replace(kc.print_id, '-[^-]+$', '') = ${setId}
          AND NOT EXISTS (SELECT 1 FROM source_refs sr WHERE sr.kodo_card_id = kc.id)`
      let matched = 0
      for (const c of mine) {
        const local = c.print_id.slice(setId.length + 1)
        const rc = byTok.get(tok(local))
        if (!rc) continue
        matched++
        if (COMMIT) {
          const usId = lang === 'en' ? rc.id : null
          const euId = lang === 'fr' ? rc.id : null
          await sql`INSERT INTO source_refs (kodo_card_id, poketrace_us_id, poketrace_eu_id, tcgplayer_id, mapped_at, map_method, map_confidence)
            VALUES (${c.id}, ${usId}, ${euId}, ${(rc.refs && rc.refs.tcgplayerId) || null}, now(), 'auto-name-number', 0.9)
            ON CONFLICT (kodo_card_id) DO NOTHING`
        }
      }
      console.log('   ' + lang + ' : ' + matched + '/' + mine.length + ' cartes matchees par numero' + (COMMIT ? ' -> source_refs' : ' (dry)'))
    }
  }
  console.log('\n=== fin — requetes PokeTrace : ' + reqCount + (COMMIT ? '' : ' | relancer avec --commit pour ecrire') + ' ===')
  process.exit(0)
})().catch(e => { console.error('ERREUR', e.message); process.exit(1) })
