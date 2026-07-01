// scripts/psa-pop-to-grading-pop.mjs
// Deplie psa_pop_reports (format large) vers grading_pop (format long),
// en repliquant le pattern CCC ET en distinguant les variantes PSA.
//
// Realite PSA (etablie par fouille) :
//  - PSA separe Holo / Reverse Foil / base en specs distinctes (pops differentes)
//  - le suffixe est dans subject_name : "Roitiflam-Reverse Foil", "Reshiram-Holo"
//  - k_cards n'a qu'UNE entree par carte (pas de notion Holo/Reverse)
//  => on stocke la variante dans grading_pop.variety (comme le CCC pour "1st Edition")
//     cle d'unicite : (company, card_ref, lang, variety, tier) -> jamais de collision
//
// Regles Kodo :
//  - langue par egalite stricte sur variety pure (pas de composites bruites)
//  - matching k_cards.id = '{lang}-{card_ref}' (comme CCC)
//  - une note = une ligne, uniquement si count > 0
//  - idempotent : purge source='psa' puis reinsertion
//  - variantes distinguees, jamais sommees (Holo != Reverse)
//
// Usage : DATABASE_URL=... node scripts/psa-pop-to-grading-pop.mjs
//         PSA_DRY_RUN=1 pour compter sans ecrire

import fs from 'fs';
import { neon } from '@neondatabase/serverless';

function envFromFile(p){const o={};try{for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^"/,'').replace(/"$/,'');}}catch{}return o;}
const env = envFromFile('.env.production.local');
const sql = neon(env.DATABASE_URL || process.env.DATABASE_URL);
const DRY = (env.PSA_DRY_RUN || process.env.PSA_DRY_RUN) === '1';

// Colonnes psa_pop_reports -> { tier, grade_num }. PSA n'a ni 9.5 ni 10+.
const NOTE_MAP = [
  ['pop_1','PSA_1',1],['pop_1_5','PSA_1_5',1.5],['pop_2','PSA_2',2],['pop_2_5','PSA_2_5',2.5],
  ['pop_3','PSA_3',3],['pop_3_5','PSA_3_5',3.5],['pop_4','PSA_4',4],['pop_4_5','PSA_4_5',4.5],
  ['pop_5','PSA_5',5],['pop_5_5','PSA_5_5',5.5],['pop_6','PSA_6',6],['pop_6_5','PSA_6_5',6.5],
  ['pop_7','PSA_7',7],['pop_7_5','PSA_7_5',7.5],['pop_8','PSA_8',8],['pop_8_5','PSA_8_5',8.5],
  ['pop_9','PSA_9',9],['pop_10','PSA_10',10],['pop_authentic','PSA_AUTH',0],
];

// Langues pures uniquement (egalite stricte). Les composites (French-Secret...) sont
// des variantes/produits qu'on ne mappe pas ici -> evite tout melange.
const LANG_EXACT = { 'French':'fr', 'German':'de', 'Italian':'it', 'Spanish':'es', 'Portuguese':'pt' };
// EN = variety NULL (l'anglais "de base" n'a pas de marqueur langue)

// Extrait la variante du subject_name : "Roitiflam-Reverse Foil" -> "Reverse Foil"
// "Reshiram-Holo" -> "Holo". "Dracaufeu V" (sans tiret) -> "" (base).
// On normalise vers un jeu de variantes propre pour l'affichage.
function extractVariant(subject){
  const s = (subject || '');
  const low = s.toLowerCase();
  // Reverse sous toutes ses formes PSA : "Reverse Foil", "Rev. Foil", "Rev Foil", "-Reverse", "Reverse Holo"
  if (/reverse foil|rev\.?\s*foil|reverse holo|-\s*reverse\b|\breverse\b/.test(low)) return 'Reverse Foil';
  if (/-holo\b/.test(low) || low.endsWith('-holo') || /\bholo\b/.test(low)) return 'Holo';
  if (low.includes('cosmos')) return 'Cosmos Holo';
  // pas de suffixe variante reconnu -> base
  return '';
}

console.log('=== PSA pop_reports -> grading_pop (variantes distinguees) ===');
console.log(DRY ? '(DRY RUN : aucune ecriture)\n' : '');

const rows = await sql`
  SELECT card_ref, variety, subject_name, source_url,
         pop_1, pop_1_5, pop_2, pop_2_5, pop_3, pop_3_5, pop_4, pop_4_5,
         pop_5, pop_5_5, pop_6, pop_6_5, pop_7, pop_7_5, pop_8, pop_8_5,
         pop_9, pop_10, pop_authentic, pop_total
  FROM psa_pop_reports`;
console.log(`Charge ${rows.length} lignes psa_pop_reports`);

const kcRows = await sql`SELECT id FROM k_cards`;
const kcSet = new Set(kcRows.map(r => r.id));
console.log(`Catalogue k_cards : ${kcSet.size} cartes`);

// DEDUPLICATION : PSA a des doublons de traduction (Chaneira=Chansey) et de typo
// (Profesor=Professor) -> plusieurs specs pour la MEME carte physique, l'une reelle
// (gros pop_total) l'autre parasite (1-5 ex). On ne garde que la spec dominante
// par cle (card_ref, lang, variant). Fidele : une vraie carte, pas ses artefacts PSA.
const bestByKey = new Map(); // key -> { row, lang, variant, total }
let skipComposite0 = 0;
for (const r of rows) {
  let lang;
  if (r.variety == null) lang = 'en';
  else if (LANG_EXACT[r.variety]) lang = LANG_EXACT[r.variety];
  else { skipComposite0++; continue; }
  if (!kcSet.has(`${lang}-${r.card_ref}`)) continue;
  const variant = extractVariant(r.subject_name);
  const key = `${lang}|${r.card_ref}|${variant}`;
  const total = Number(r.pop_total ?? 0);
  const prev = bestByKey.get(key);
  if (!prev || total > prev.total) bestByKey.set(key, { row: r, lang, variant, total });
}
const dedupedRows = [...bestByKey.values()];
console.log(`Apres dedup (specs dominantes par cle) : ${dedupedRows.length} entrees`);

const out = [];
let skipNoMatch = 0, skipComposite = skipComposite0;

for (const entry of dedupedRows) {
  const r = entry.row;
  const lang = entry.lang;
  const variant = entry.variant;
  const popTotal = entry.total;

  for (const [col, tier, grade] of NOTE_MAP) {
    const count = Number(r[col] ?? 0);
    if (count > 0) {
      out.push({
        company: 'PSA', card_ref: r.card_ref, lang, variety: variant || '',
        tier, grade_num: grade, label: null, count, pop_total: popTotal,
        source: 'psa', source_url: r.source_url || null,
      });
    }
  }
}

console.log(`\nLignes grading_pop a inserer : ${out.length}`);
console.log(`Ignorees hors catalogue : ${skipNoMatch}`);
console.log(`Ignorees composites/produits : ${skipComposite}`);

const byLang = {}; for (const o of out) byLang[o.lang] = (byLang[o.lang]||0)+1;
console.log('Par langue :', JSON.stringify(byLang));
const byVar = {}; for (const o of out) { const v=o.variety||'(base)'; byVar[v]=(byVar[v]||0)+1; }
console.log('Par variante :', JSON.stringify(byVar));

// Controle collision : (card_ref, lang, variety, tier) doit etre unique
const seen = new Set(); let collisions = 0;
for (const o of out) {
  const k = `${o.card_ref}|${o.lang}|${o.variety}|${o.tier}`;
  if (seen.has(k)) collisions++; else seen.add(k);
}
console.log(`Collisions (card_ref+lang+variety+tier) : ${collisions} ${collisions===0?'(propre)':'(!! A CORRIGER)'}`);

if (DRY) { console.log('\nDRY RUN termine.'); process.exit(0); }
if (collisions > 0) { console.log('\nARRET : collisions detectees, on ne veut pas de pop melangee.'); process.exit(1); }

await sql`DELETE FROM grading_pop WHERE source = 'psa'`;
console.log('\nPurge grading_pop source=psa : OK');

const BATCH = 1000; let inserted = 0;
for (let i = 0; i < out.length; i += BATCH) {
  const c = out.slice(i, i+BATCH);
  await sql`
    INSERT INTO grading_pop
      (company, card_ref, lang, variety, tier, grade_num, label, count, pop_total, source, source_url, fetched_at)
    SELECT * FROM UNNEST(
      ${c.map(o=>o.company)}::text[], ${c.map(o=>o.card_ref)}::text[], ${c.map(o=>o.lang)}::text[],
      ${c.map(o=>o.variety)}::text[], ${c.map(o=>o.tier)}::text[], ${c.map(o=>o.grade_num)}::numeric[],
      ${c.map(o=>o.label)}::text[], ${c.map(o=>o.count)}::int[], ${c.map(o=>o.pop_total)}::int[],
      ${c.map(o=>o.source)}::text[], ${c.map(o=>o.source_url)}::text[]
    ) AS t(company, card_ref, lang, variety, tier, grade_num, label, count, pop_total, source, source_url),
    LATERAL (SELECT now() AS fetched_at) f`;
  inserted += c.length;
  process.stdout.write(`\r  Insere ${inserted}/${out.length}`);
}
console.log(`\n\nOK : ${inserted} lignes PSA inserees.`);

const check = await sql`
  SELECT lang, COUNT(*) n, COUNT(DISTINCT card_ref) cartes
  FROM grading_pop WHERE source='psa' GROUP BY lang ORDER BY n DESC`;
console.log('\nControle final grading_pop source=psa :');
check.forEach(c => console.log(`  ${c.lang} : ${c.n} lignes · ${c.cartes} cartes`));
