// Synchronise upcoming_sets depuis Bulbapedia (API MediaWiki officielle, JSON).
// Pas de scraping HTML : on lit le wikitext structure des tables d'expansions.
// Faits publics (dates de sortie), licence CC, 1 appel/page/jour, User-Agent
// identifiant -> usage respectueux et defendable (contrairement au scraping de
// prix proprietaires, banni ailleurs dans Kodo).
//
// EN : List_of_Pokémon_Trading_Card_Game_expansions
// JP : List_of_Japanese_Pokémon_Trading_Card_Game_expansions
// Les deux ont la meme structure de table : une cellule "| valeur" par ligne,
// dans l'ordre : code | symbole | logo | {{TCG|Nom}} | type | nb | DATE | code2.

import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

const UA = { 'User-Agent': 'KodoCards/1.0 (calendrier de sorties; contact@kodocards.com)' }
const API = 'https://bulbapedia.bulbagarden.net/w/api.php'
const COMMIT = process.argv.includes('--commit')

const MONTHS = { january:1, february:2, march:3, april:4, may:5, june:6, july:7,
  august:8, september:9, october:10, november:11, december:12 }

// "September 16, 2026" -> "2026-09-16" (null si pas une date ferme, ex "TBA", "Q3")
function parseDate(cell) {
  const m = cell.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/)
  if (!m) return null
  const mo = MONTHS[m[1].toLowerCase()]
  if (!mo) return null
  return `${m[3]}-${String(mo).padStart(2,'0')}-${String(m[2]).padStart(2,'0')}`
}

// "{{TCG|30th Celebration}}" ou "{{TCG|Delta Reign|Mega Evolution—Delta Reign}}"
// -> "30th Celebration" (1er argument = nom d'affichage court)
function parseName(cell) {
  const m = cell.match(/\{\{TCG\|([^|}]+)/i)
  return m ? m[1].trim() : null
}

// "[[File:30th Celebration Logo EN.png|150px]]" -> URL Bulbapedia du fichier.
// On garde le nom de fichier ; l'URL reelle se resout via Special:FilePath.
function parseLogo(cell) {
  const m = cell.match(/\[\[File:([^|\]]+\.png)/i)
  if (!m) return null
  const file = m[1].trim().replace(/ /g, '_')
  return 'https://bulbapedia.bulbagarden.net/wiki/Special:FilePath/' + encodeURIComponent(file)
}

async function wikitext(page) {
  const url = `${API}?action=parse&page=${encodeURIComponent(page)}&format=json&prop=wikitext`
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(page + ' HTTP ' + r.status)
  const j = await r.json()
  return j.parse.wikitext['*']
}

// Parse les lignes d'une table : accumule les cellules "| x" jusqu'au separateur
// de ligne "|-". Une entree valide = a un nom {{TCG|...}} ET une date future.
function parseExpansions(wt, todayIso) {
  const lines = wt.split('\n')
  const out = []
  let cells = []
  const flush = () => {
    if (cells.length) {
      const joined = cells.join('\n')
      const name = cells.map(parseName).find(Boolean)
      const date = cells.map(parseDate).find(Boolean)
      // index de la cellule contenant le nom {{TCG|...}}
      const nameIdx = cells.findIndex(c => /\{\{TCG\|/i.test(c))
      // vrais logos (fichier *Logo*.png) APRES le nom -> le logo suit le nom
      // dans certaines lignes ; on prend donc la fenetre [nameIdx-2, nameIdx+2]
      // et on ne garde que les *Logo*, le plus proche du nom.
      let logo = null
      if (nameIdx >= 0) {
        const lo = Math.max(0, nameIdx - 3), hi = Math.min(cells.length, nameIdx + 3)
        const near = []
        for (let i = lo; i < hi; i++) {
          const u = parseLogo(cells[i])
          if (u && /logo/i.test(u) && !/setsymbol/i.test(u)) near.push({ i, u })
        }
        // le plus proche du nom (distance minimale)
        near.sort((a, b) => Math.abs(a.i - nameIdx) - Math.abs(b.i - nameIdx))
        logo = near.length ? near[0].u : null
      }
      // code = 1re cellule courte alphanumerique (ex '30th', 'ME6', 'me05')
      const code = cells.length ? (cells[0].replace(/^\|\s*/, '').trim() || null) : null
      if (name && date && date > todayIso) out.push({ code, name, date, logo })
    }
    cells = []
  }
  for (const l of lines) {
    if (/^\|-/.test(l) || /^\|\}/.test(l)) { flush(); continue }
    if (/^\|/.test(l)) cells.push(l)
  }
  flush()
  return out
}

// Slug de rapprochement EN<->JP quand une meme sortie mondiale a 2 lignes.
const slug = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]/g,'')

;(async () => {
  const today = new Date().toISOString().slice(0,10)

  let en = [], jp = []
  try { en = parseExpansions(await wikitext('List_of_Pokémon_Trading_Card_Game_expansions'), today) }
  catch (e) { console.warn('EN echec:', e.message) }
  try { jp = parseExpansions(await wikitext('List_of_Japanese_Pokémon_Trading_Card_Game_expansions'), today) }
  catch (e) { console.warn('JP echec:', e.message) }

  // Garde-fou : si le parse ramene 0 alors qu'on a du texte, c'est un changement
  // de structure Bulbapedia, PAS "plus de sorties". On n'ecrit rien (la table
  // garde ses valeurs), on signale.
  if (en.length === 0 && jp.length === 0) {
    console.error('AUCUNE sortie future parsee sur les 2 pages -> structure Bulbapedia changee ? Rien ecrit.')
    process.exit(1)
  }

  // Fusion EN + JP par code (ou nom) : une ligne upcoming_sets par set mondial.
  const byKey = new Map()
  const keyOf = (code, name) => (code && code.length <= 8 ? 'c:' + code.toLowerCase() : 'n:' + slug(name))
  for (const e of en) {
    const k = keyOf(e.code, e.name)
    byKey.set(k, { code: e.code, name_en: e.name, date_en: e.date, logo: e.logo, name_jp: null, date_jp: null })
  }
  for (const j of jp) {
    // rapprochement par nom (les codes EN/JP different) ; sinon nouvelle entree JP
    let matched = null
    for (const v of byKey.values()) if (v.name_en && slug(v.name_en) === slug(j.name)) { matched = v; break }
    if (matched) { matched.name_jp = j.name; matched.date_jp = j.date }
    else byKey.set('n:' + slug(j.name), { code: j.code, name_en: null, date_en: null, logo: j.logo, name_jp: j.name, date_jp: j.date })
  }

  const rows = [...byKey.values()]
  console.log(`Parse : ${en.length} EN + ${jp.length} JP -> ${rows.length} sets futurs fusionnes`)
  for (const r of rows) {
    console.log(`  ${(r.code||'?').padEnd(6)} EN:${r.date_en||'—'} ${r.name_en||''} | JP:${r.date_jp||'—'} ${r.name_jp||''}`)
  }

  if (!COMMIT) { console.log('\n(DRY-RUN — rien ecrit ; --commit pour appliquer)'); return }

  // UPSERT : on met a jour EN/JP + logo, mais on NE TOUCHE PAS name_fr /
  // release_date_fr (remplis a la main ou par un autre process), et on ne
  // remplace jamais une ligne source='manual'.
  let wrote = 0
  for (const r of rows) {
    const code = r.code && r.code.length <= 12 ? r.code : ('BP-' + slug(r.name_en || r.name_jp)).slice(0, 12)
    await sql`
      INSERT INTO upcoming_sets (code, name_en, name_jp, release_date_en, release_date_jp, logo_url, source, updated_at)
      VALUES (${code}, ${r.name_en}, ${r.name_jp}, ${r.date_en}, ${r.date_jp}, ${r.logo}, 'bulbapedia', now())
      ON CONFLICT (code) DO UPDATE SET
        name_en         = COALESCE(EXCLUDED.name_en, upcoming_sets.name_en),
        name_jp         = COALESCE(EXCLUDED.name_jp, upcoming_sets.name_jp),
        release_date_en = COALESCE(EXCLUDED.release_date_en, upcoming_sets.release_date_en),
        release_date_jp = COALESCE(EXCLUDED.release_date_jp, upcoming_sets.release_date_jp),
        logo_url        = COALESCE(upcoming_sets.logo_url, EXCLUDED.logo_url),
        updated_at      = now()
      WHERE upcoming_sets.source <> 'manual'`
    wrote++
  }

  // Purge : retirer les sorties devenues passees (le set est sorti -> il vit
  // desormais dans TCGdex, plus besoin de la table upcoming). Garde 'manual'.
  const del = await sql`
    DELETE FROM upcoming_sets
    WHERE source <> 'manual'
      AND COALESCE(release_date_en, release_date_jp) < ${today}::date
    RETURNING code`
  console.log(`\nEcrit : ${wrote} | purge (sorties passees) : ${del.length}`)
})()
