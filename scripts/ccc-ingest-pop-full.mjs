// scripts/ccc-ingest-pop-full.mjs
// Balayage COMPLET de la population CCC pour tout le catalogue FR.
// Au lieu de scanner 5 noms de test, extrait toutes les RACINES de noms
// Pokemon FR depuis k_cards, les dedoublonne, et interroge l'API CCC pour
// chacune. Idempotent (ON CONFLICT). Reprise sur erreur. Rate-limite poli.
//
// Source : GET https://cccgrading.com/api/v2/cards/report?name={racine}&page={n}
// Ecrit dans ccc_pop_raw (meme table/schema que ccc-ingest-pop.mjs).
//
// Usage : node scripts/ccc-ingest-pop-full.mjs [--limit N] [--offset N]
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const API = 'https://cccgrading.com/api/v2/cards/report';
const HEADERS = { Accept: 'application/ld+json', 'User-Agent': 'KodoCards-pop-sync/1.0' };
const lastId = (iri) => (iri || '').split('/').filter(Boolean).pop() || '';

const argLimit = (() => { const i = process.argv.indexOf('--limit'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : null; })();
const argOffset = (() => { const i = process.argv.indexOf('--offset'); return i >= 0 ? parseInt(process.argv[i + 1], 10) : 0; })();

// ── Extraction de racine ────────────────────────────────────────────────────
// "Méga-Dracaufeu X-ex" -> "dracaufeu" ; "M-Dardargnan-EX" -> "dardargnan"
// "Roigada de Galar V" -> "roigada" ; "Persian-ex de la Team Rocket" -> "persian"
// "Typhlosion δ" -> "typhlosion" ; "Entei ☆" -> "entei"
// Les noms non-Pokemon (dresseurs/objets) restent tels quels -> CCC renverra 0.
function rootName(raw) {
  let s = (raw || '').trim();
  // retirer suffixes de contexte (set/team/forme regionale)
  s = s.replace(/\s+de\s+la\s+Team\s+\w+.*$/i, '');
  s = s.replace(/\s+de\s+Team\s+\w+.*$/i, '');
  s = s.replace(/\s+de\s+(Galar|Alola|Hisui|Paldea|Kanto)\b.*$/i, '');
  s = s.replace(/[''’]?\s*d['’](Alola|Galar|Hisui|Paldea|Kanto)\b.*$/i, '');  // "Racaillou d'Alola"
  s = s.replace(/[''’]?\s*d['’](Ondine|Pierre|Jasmine|Rosemary|\w+)\b.*$/i, ''); // "Magicarpe d'Ondine"
  s = s.replace(/\s+Niv\.?\s*\d+.*$/i, '');           // "Archéodong Niv. 54"
  // retirer symboles delta/star
  s = s.replace(/[δ☆★]/g, '');
  // retirer suffixes de mecanique (en fin de nom)
  s = s.replace(/[\s-]+(VMAX|VSTAR|GX|EX|V)\b.*$/i, '');
  s = s.replace(/[\s-]+ex\b.*$/i, '');
  // retirer prefixe Mega / M-
  s = s.replace(/^M[ée]ga[\s-]+/i, '');
  s = s.replace(/^M[\s-]+(?=[A-ZÉÈ])/i, '');           // "M-Dracaufeu" mais pas "Mr"
  // garder le premier mot significatif (les Pokemon FR sont mono-mot)
  s = s.trim().split(/\s+/)[0] || '';
  // nettoyage final : trait d'union interne conserve, ponctuation de bord retiree
  s = s.replace(/^[-\s]+|[-\s.]+$/g, '');
  return s.toLowerCase();
}

// ── Schema (idempotent) ──────────────────────────────────────────────────────
await sql.query(`
  CREATE TABLE IF NOT EXISTS ccc_pop_raw (
    ccc_group_id   text NOT NULL,
    spec_key       text NOT NULL DEFAULT '',
    name           text, lang text, year text,
    extension text, extension_code text, card_number text, spec_label text,
    notes jsonb NOT NULL, notes_total integer, authentication integer,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ccc_group_id, spec_key)
  )`);
await sql.query(`CREATE INDEX IF NOT EXISTS ccc_pop_raw_match ON ccc_pop_raw (lang, extension, card_number)`);

// ── Liste des racines a scanner ──────────────────────────────────────────────
const names = await sql`SELECT DISTINCT name_localized FROM k_cards WHERE lang='fr' AND name_localized IS NOT NULL`;
const rootsSet = new Set();
for (const r of names) {
  const root = rootName(r.name_localized);
  if (root && root.length >= 3) rootsSet.add(root);   // >=3 lettres : ecarte le bruit
}
let roots = [...rootsSet].sort();
if (argOffset) roots = roots.slice(argOffset);
if (argLimit) roots = roots.slice(0, argLimit);
console.log(`Racines uniques a scanner : ${roots.length} (sur ${names.length} noms FR distincts)`);

// ── Fetch CCC (copie de la logique eprouvee) ─────────────────────────────────
let rateLimitHits = 0;
async function fetchTerm(name) {
  const groups = [];
  let page = 1;
  for (;;) {
    const url = `${API}?name=${encodeURIComponent(name)}&page=${page}`;
    const res = await fetch(url, { headers: HEADERS });
    if (res.status === 429) {
      rateLimitHits++;
      if (rateLimitHits > 8) throw new Error('CCC_RATE_LIMIT_ABORT');  // garde-fou : CCC sature, on arrete
      await sleep(3000);
      continue;
    }
    if (!res.ok) throw new Error(`CCC ${res.status} (${name} p${page})`);
    const data = await res.json();
    groups.push(...(data['hydra:member'] || []));
    if (!data['hydra:view'] || !data['hydra:view']['hydra:next']) break;
    page++;
    await sleep(350);
  }
  return groups;
}
function variants(group) {
  const out = [];
  for (const c of group.cards || []) {
    const specs = c.specificities || [];
    out.push({
      specKey: specs.map((s) => s.code).sort().join('+'),
      specLabel: specs.map((s) => s.name).join(', '),
      notes: {
        '1': c.note1 | 0, '2': c.note2 | 0, '3': c.note3 | 0, '4': c.note4 | 0,
        '5': c.note5 | 0, '6': c.note6 | 0, '7': c.note7 | 0, '8': c.note8 | 0,
        '8.5': c.note85 | 0, '9': c.note9 | 0, '9.5': c.note95 | 0,
        '10': c.note10 | 0, '10b': c.note10b | 0, '10g': c.note10g | 0,
      },
      notesTotal: c.notesTotal | 0,
      auth: c.authentication | 0,
    });
  }
  return out;
}

// ── Balayage ─────────────────────────────────────────────────────────────────
let groupsSeen = 0, rows = 0, errors = 0, empty = 0, done = 0;
const t0 = Date.now();
for (const name of roots) {
  done++;
  let groups;
  try { groups = await fetchTerm(name); }
  catch (e) {
    if (e && e.message === 'CCC_RATE_LIMIT_ABORT') {
      console.log('::error::CCC rate-limit persistant (>8x 429). Arret propre du balayage.');
      break;
    }
    errors++; console.log(`! ${name}: ${(e && e.message) || e}`); await sleep(500); continue;
  }
  if (groups.length === 0) empty++;
  for (const g of groups) {
    groupsSeen++;
    const gid = lastId(g['@id']);
    const lang = (g.language && g.language.code ? g.language.code : '').toLowerCase();
    const extCode = lastId(g.extensionCode);
    for (const v of variants(g)) {
      try {
        await sql.query(
          `INSERT INTO ccc_pop_raw
             (ccc_group_id, spec_key, name, lang, year, extension, extension_code, card_number, spec_label, notes, notes_total, authentication, fetched_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12, now())
           ON CONFLICT (ccc_group_id, spec_key) DO UPDATE SET
             notes=EXCLUDED.notes, notes_total=EXCLUDED.notes_total,
             authentication=EXCLUDED.authentication, spec_label=EXCLUDED.spec_label,
             card_number=EXCLUDED.card_number, extension=EXCLUDED.extension, fetched_at=now()`,
          [gid, v.specKey, g.name, lang, g.year, g.extension, extCode, g.customExtensionNumber, v.specLabel, JSON.stringify(v.notes), v.notesTotal, v.auth]
        );
        rows++;
      } catch (e) { errors++; }
    }
  }
  if (done % 100 === 0) {
    const el = Math.round((Date.now() - t0) / 1000);
    console.log(`  [${done}/${roots.length}] ${el}s · ${rows} variantes · ${empty} vides · ${errors} err`);
  }
  await sleep(350);
}

// ── Garde-fou : si trop de vides, l'API a peut-etre change ───────────────────
const emptyRate = roots.length ? empty / roots.length : 0;
console.log(`\nCCC pop FULL : ${groupsSeen} groupes, ${rows} variantes upsertees.`);
console.log(`Racines vides : ${empty}/${roots.length} (${Math.round(emptyRate * 100)}%) · erreurs : ${errors}`);
if (emptyRate > 0.85) {
  console.log('::warning::Taux de vides anormalement haut (>85%) — verifier que l API CCC repond toujours.');
}
const total = await sql`SELECT COUNT(DISTINCT ccc_group_id) g FROM ccc_pop_raw`;
console.log(`ccc_pop_raw : ${total[0].g} groupes CCC distincts au total.`);
