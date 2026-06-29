// scripts/ccc-ingest-pop.mjs
// Ingestion de la population CCC Grading (pop report officiel, API publique).
// Source : GET https://cccgrading.com/api/v2/cards/report?name={nom}&page={n}
// Ecrit dans ccc_pop_raw (staging brut, 1 ligne par variete CCC).
// Le matching vers grading_pop (card_ref Kodo) est une etape separee.
//
// Usage : node scripts/ccc-ingest-pop.mjs [nom1 nom2 ...]
//   sans argument -> echantillon de test.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const API = 'https://cccgrading.com/api/v2/cards/report';
const HEADERS = { Accept: 'application/ld+json', 'User-Agent': 'KodoCards-pop-sync/1.0' };
const lastId = (iri) => (iri || '').split('/').filter(Boolean).pop() || '';

const NAMES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['dracaufeu', 'pikachu', 'mewtwo', 'leveinard', 'lugia'];

await sql.query(`
  CREATE TABLE IF NOT EXISTS ccc_pop_raw (
    ccc_group_id   text NOT NULL,
    spec_key       text NOT NULL DEFAULT '',
    name           text,
    lang           text,
    year           text,
    extension      text,
    extension_code text,
    card_number    text,
    spec_label     text,
    notes          jsonb NOT NULL,
    notes_total    integer,
    authentication integer,
    fetched_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (ccc_group_id, spec_key)
  )`);
await sql.query(`CREATE INDEX IF NOT EXISTS ccc_pop_raw_match ON ccc_pop_raw (lang, extension, card_number)`);

async function fetchTerm(name) {
  const groups = [];
  let page = 1;
  for (;;) {
    const url = `${API}?name=${encodeURIComponent(name)}&page=${page}`;
    const res = await fetch(url, { headers: HEADERS });
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

let groupsSeen = 0, rows = 0;
for (const name of NAMES) {
  let groups;
  try { groups = await fetchTerm(name); }
  catch (e) { console.log(`! ${name}: ${(e && e.message) || e}`); continue; }
  for (const g of groups) {
    groupsSeen++;
    const gid = lastId(g['@id']);
    const lang = (g.language && g.language.code ? g.language.code : '').toLowerCase();
    const extCode = lastId(g.extensionCode);
    for (const v of variants(g)) {
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
    }
  }
  console.log(`  ${name}: ${groups.length} groupes`);
  await sleep(350);
}
console.log(`\nCCC pop: ${groupsSeen} groupes, ${rows} variantes upsertees.`);

console.log('\n=== Verif: Dracaufeu / Set de base ===');
try {
  const r = await sql.query(
    `SELECT spec_label, card_number, notes_total, notes FROM ccc_pop_raw
     WHERE name ILIKE 'dracaufeu' AND extension ILIKE 'set de base' ORDER BY notes_total DESC`);
  for (const x of r) console.log(` #${x.card_number} [${x.spec_label || 'standard'}] total=${x.notes_total} notes=${JSON.stringify(x.notes)}`);
} catch (e) { console.log('verif skip', (e && e.message) || e); }
