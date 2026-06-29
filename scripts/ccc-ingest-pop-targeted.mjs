// scripts/ccc-ingest-pop-targeted.mjs
// Ingere la pop CCC en CIBLANT les cartes qui ont un marche CCC reel.
// Source des noms : racines distinctes de ccc_price_raw (cartes effectivement
// vendues en CCC). L'API CCC etant fulltext, 1 requete/racine ramasse toutes
// les formes (ex/GX/Mega). Throttle 1.5s, pagination hydra:next, cache 7j.
// Ecrit dans ccc_pop_raw (staging). Le matcher ccc-map-pop.mjs fait le reste.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const q = async (t, p) => { const r = await sql.query(t, p); return Array.isArray(r) ? r : (r.rows || []); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMIT = parseInt(process.env.CCC_MAX_NAMES || '0', 10); // 0 = tout

// ── 1. Noms-racines a interroger : tires du marche CCC reel ────────────────────
const titles = await q(`SELECT DISTINCT title FROM ccc_price_raw WHERE NOT is_lot`);
const cardsFr = await q(`SELECT DISTINCT name_localized FROM k_cards WHERE lang='fr' AND name_localized IS NOT NULL`);
const frRoots = new Set(cardsFr.map((c) => c.name_localized.split(/[\s-]/)[0].toLowerCase()));

// Extrait de chaque titre d'annonce le 1er mot qui est un vrai nom de carte FR
const roots = new Set();
for (const t of titles) {
  for (const w of t.title.split(/[\s\-—:]+/)) {
    const lw = w.toLowerCase().replace(/[^a-zàâäéèêëïîôöùûüç]/gi, '');
    if (lw.length >= 3 && frRoots.has(lw)) { roots.add(w.replace(/[^A-Za-zÀ-ÿ-]/g, '')); break; }
  }
}
let names = [...roots].filter(Boolean).sort();
if (LIMIT > 0) names = names.slice(0, LIMIT);
console.log(`Noms-racines cibles (marche CCC reel) : ${names.length}`);

// ── 2. Cache : skip les noms vus < 7j ──────────────────────────────────────────
await sql.query(`CREATE TABLE IF NOT EXISTS ccc_pop_fetch_log (
  query_name text PRIMARY KEY, last_fetched timestamptz NOT NULL DEFAULT now(), cards_found int)`);
const recent = new Set((await q(`SELECT query_name FROM ccc_pop_fetch_log WHERE last_fetched > now() - interval '7 days'`)).map((r) => r.query_name.toLowerCase()));

// ── 3. Table staging (idempotente, identique a ccc-ingest-pop) ──────────────────
await sql.query(`CREATE TABLE IF NOT EXISTS ccc_pop_raw (
  ccc_group_id text, spec_key text, name text, lang text DEFAULT 'fr',
  year text, extension text, extension_code text, card_number text,
  spec_label text, notes jsonb, notes_total int, authentication int,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ccc_group_id, spec_key))`);

const NOTE_KEYS = { note1:'1', note2:'2', note3:'3', note4:'4', note5:'5', note6:'6', note7:'7', note8:'8', note85:'8.5', note9:'9', note95:'9.5', note10:'10', note10b:'10b', note10g:'10g' };

async function fetchReport(name) {
  let page = 1, all = [], guard = 0;
  while (guard++ < 40) {
    const url = `https://cccgrading.com/api/v2/cards/report?name=${encodeURIComponent(name)}&page=${page}`;
    const r = await fetch(url, { headers: { Accept: 'application/ld+json' } });
    if (!r.ok) break;
    const j = await r.json();
    const cards = j['hydra:member'] || j.cards || [];
    all.push(...cards);
    const next = j['hydra:view'] && j['hydra:view']['hydra:next'];
    if (!next || cards.length === 0) break;
    page++;
    await sleep(1500);
  }
  return all;
}

let totalCards = 0, ingested = 0, skipped = 0;
for (const name of names) {
  if (recent.has(name.toLowerCase())) { skipped++; continue; }
  let cards = [];
  try { cards = await fetchReport(name); }
  catch (e) { console.log(` ! ${name} : ${String(e).slice(0, 60)}`); await sleep(1500); continue; }

  for (const c of cards) {
    const gid = String(c.id || c['@id'] || `${name}-${c.cardNumber || ''}-${Math.random()}`);
    const specs = (c.specificities && c.specificities.length) ? c.specificities : [{ code: '', label: '' }];
    for (const sp of specs) {
      const specKey = (sp.code || '').toLowerCase();
      const notes = {}; let tot = 0;
      for (const [api, lbl] of Object.entries(NOTE_KEYS)) { const v = c[api] | 0; if (v > 0) { notes[lbl] = v; tot += v; } }
      const auth = c.authentication | 0;
      await sql.query(`INSERT INTO ccc_pop_raw
        (ccc_group_id, spec_key, name, lang, year, extension, extension_code, card_number, spec_label, notes, notes_total, authentication, fetched_at)
        VALUES ($1,$2,$3,'fr',$4,$5,$6,$7,$8,$9,$10,$11,now())
        ON CONFLICT (ccc_group_id, spec_key) DO UPDATE SET
          notes=EXCLUDED.notes, notes_total=EXCLUDED.notes_total,
          authentication=EXCLUDED.authentication, fetched_at=now()`,
        [gid, specKey, c.name || name, String(c.year || ''), c.extension || '', c.extensionCode || '',
         String(c.cardNumber || ''), sp.label || '', JSON.stringify(notes), tot, auth]);
      ingested++;
    }
    totalCards++;
  }
  await sql.query(`INSERT INTO ccc_pop_fetch_log (query_name, last_fetched, cards_found)
    VALUES ($1, now(), $2) ON CONFLICT (query_name) DO UPDATE SET last_fetched=now(), cards_found=EXCLUDED.cards_found`,
    [name, cards.length]);
  process.stdout.write(`\r  ${name.padEnd(20)} +${cards.length}  (cumul cartes ${totalCards}, lignes ${ingested}, skip ${skipped})    `);
  await sleep(1500);
}

console.log(`\n\n=== Ingestion ciblee terminee ===`);
console.log(`noms interroges : ${names.length - skipped} | caches (skip) : ${skipped}`);
console.log(`cartes CCC ramassees : ${totalCards} | lignes ccc_pop_raw : ${ingested}`);
const t = (await q(`SELECT COUNT(*)::int n, COUNT(DISTINCT ccc_group_id)::int cartes FROM ccc_pop_raw`))[0];
console.log(`total staging ccc_pop_raw : ${t.n} lignes / ${t.cartes} cartes`);
