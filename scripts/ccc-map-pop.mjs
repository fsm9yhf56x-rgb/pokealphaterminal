// scripts/ccc-map-pop.mjs
// Matche ccc_pop_raw -> grading_pop. Resolveur en cascade, defensif.
//   1. ccc_set_map : extension CCC -> setcode Kodo (auto sans-accent + overrides)
//   2. carte : (setcode + numero) verifie dans k_cards FR, sinon skip+log
//   3. editions : Unlimited + 1ere Edition uniquement (les autres -> skip+log)
//   4. notes CCC -> tiers CCC_* ; card_ref aligne psa_pop_reports
// DRY-RUN par defaut. Ecrit dans grading_pop seulement avec --commit.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const q = async (t, p) => { const r = await sql.query(t, p); return Array.isArray(r) ? r : (r.rows || []); };
const COMMIT = process.argv.includes('--commit');

const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, ' ').trim();
const normNum = (n) => { const s = String(n || '').trim(); return /^\d+$/.test(s) ? String(parseInt(s, 10)) : s; };

const NOTE_MAP = {
  '1': ['CCC_1', 1, null], '2': ['CCC_2', 2, null], '3': ['CCC_3', 3, null], '4': ['CCC_4', 4, null],
  '5': ['CCC_5', 5, null], '6': ['CCC_6', 6, null], '7': ['CCC_7', 7, null], '8': ['CCC_8', 8, null],
  '8.5': ['CCC_8_5', 8.5, null], '9': ['CCC_9', 9, null], '9.5': ['CCC_9_5', 9.5, null],
  '10': ['CCC_10', 10, null], '10b': ['CCC_10_BLACK', 10, 'BLACK'], '10g': ['CCC_10_GOLD', 10, 'GOLD'],
};
function edition(specKey) {
  if (specKey === '') return { variety: '', suffix: '' };                 // Unlimited
  if (specKey.split('+').includes('ed-1-pokemon')) return { variety: '1st Edition', suffix: '-1st' };
  return null;                                                            // autre -> skip
}

// ── 1. set_map ───────────────────────────────────────────────────────────────
await sql.query(`CREATE TABLE IF NOT EXISTS ccc_set_map (
  ccc_extension text PRIMARY KEY, kodo_setcode text, auto boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now())`);

const ksets = await q(`SELECT id, name, name_fr FROM k_sets`);
const byNorm = new Map();
for (const s of ksets) { for (const nm of [s.name_fr, s.name]) { const k = norm(nm); if (k && !byNorm.has(k)) byNorm.set(k, s.id); } }
const exts = await q(`SELECT DISTINCT extension FROM ccc_pop_raw WHERE lang='fr' AND extension IS NOT NULL`);
for (const e of exts) {
  const guess = byNorm.get(norm(e.extension)) || null;
  await sql.query(
    `INSERT INTO ccc_set_map (ccc_extension, kodo_setcode, auto) VALUES ($1,$2,$3)
     ON CONFLICT (ccc_extension) DO NOTHING`, [e.extension, guess, guess != null]);
}
const mapRows = await q(`SELECT ccc_extension, kodo_setcode FROM ccc_set_map`);
const setMap = new Map(mapRows.map((r) => [r.ccc_extension, r.kodo_setcode]));
const unresolved = mapRows.filter((r) => !r.kodo_setcode).map((r) => r.ccc_extension);

// ── 2. catalogue FR (existence) ───────────────────────────────────────────────
const frIds = new Set((await q(`SELECT id FROM k_cards WHERE lang='fr'`)).map((r) => r.id));
const cardExists = (setcode, suffix, num) => frIds.has(`fr-${setcode}${suffix}-${num}`);

// ── 3. matching ───────────────────────────────────────────────────────────────
const raw = await q(`SELECT * FROM ccc_pop_raw WHERE lang='fr'`);
const skip = { noSet: 0, variant: 0, noCard: 0 };
const noCardSample = [];
let cardsMatched = 0, rowsPlanned = 0;
const upserts = [];

for (const r of raw) {
  const setcode = setMap.get(r.extension);
  if (!setcode) { skip.noSet++; continue; }
  const ed = edition(r.spec_key);
  if (!ed) { skip.variant++; continue; }
  const num = normNum(r.card_number);
  if (!cardExists(setcode, ed.suffix, num)) {
    skip.noCard++;
    if (noCardSample.length < 15) noCardSample.push(`${r.name} -> fr-${setcode}${ed.suffix}-${num} (CCC #${r.card_number} ${r.extension})`);
    continue;
  }
  cardsMatched++;
  const cardRef = `${setcode}-${num}`;
  const notes = r.notes || {};
  for (const [k, [tier, gnum, label]] of Object.entries(NOTE_MAP)) {
    const c = notes[k] | 0;
    if (c <= 0) continue;
    upserts.push([cardRef, ed.variety, tier, gnum, label, c, r.notes_total | 0, `https://cccgrading.com/api/v2/cards/${r.ccc_group_id}`]);
    rowsPlanned++;
  }
  if ((r.authentication | 0) > 0) {
    upserts.push([cardRef, ed.variety, 'CCC_AUTH', null, 'AUTHENTIC', r.authentication | 0, r.notes_total | 0, `https://cccgrading.com/api/v2/cards/${r.ccc_group_id}`]);
    rowsPlanned++;
  }
}

console.log(`\n=== SET MAP ===`);
console.log(`${setMap.size} extensions, ${setMap.size - unresolved.length} resolues, ${unresolved.length} A MAPPER :`);
for (const u of unresolved) console.log(`   ?? ${u}`);

console.log(`\n=== MATCHING (${COMMIT ? 'COMMIT' : 'DRY-RUN'}) ===`);
console.log(`cartes CCC FR matchees : ${cardsMatched}`);
console.log(`lignes grading_pop ${COMMIT ? 'ecrites' : 'prevues'} : ${rowsPlanned}`);
console.log(`skips -> set non mappe: ${skip.noSet} | variante non geree: ${skip.variant} | carte FR introuvable: ${skip.noCard}`);
if (noCardSample.length) { console.log(`\n  echantillon cartes introuvables :`); for (const s of noCardSample) console.log(`   - ${s}`); }

if (COMMIT) {
  let done = 0;
  for (const u of upserts) {
    await sql.query(
      `INSERT INTO grading_pop (company, card_ref, lang, variety, tier, grade_num, label, count, pop_total, source, source_url, fetched_at)
       VALUES ('CCC',$1,'fr',$2,$3,$4,$5,$6,$7,'ccc_pop',$8, now())
       ON CONFLICT (company, card_ref, lang, variety, tier) DO UPDATE SET
         grade_num=EXCLUDED.grade_num, label=EXCLUDED.label, count=EXCLUDED.count,
         pop_total=EXCLUDED.pop_total, source_url=EXCLUDED.source_url, fetched_at=now()`, u);
    done++;
  }
  console.log(`\ngrading_pop : ${done} lignes upsertees (CCC/fr).`);
} else {
  console.log(`\n(DRY-RUN — rien ecrit. Relance avec --commit quand le set map te convient.)`);
}
