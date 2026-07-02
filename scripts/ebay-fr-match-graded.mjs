// scripts/ebay-fr-match-graded.mjs
// Matcher generalise : {company}_price_raw -> price_matrix (source ebay_fr, is_asking=true).
// Gere plusieurs societes (CCC, PSA, +CGC/PCA a venir).
// Discipline de PRIX (pop NON requise) : seuil n>=2, monotonie, ancrage numero+nom+edition,
// verifie k_cards FR. GARDE-FOU anti-aberration : ratio prix gradé / raw NEAR_MINT.
// Archive dans ebay_fr_ask_history (unifie, colonne company).
// DRY-RUN par defaut. --commit pour ecrire. --company=PSA|CCC (defaut CCC).
// Seuil ratio ajustable : RATIO_MAX=100 (defaut). Mettre 400 pour garder les gold labels limites.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const q = async (t, p) => { const r = await sql.query(t, p); return Array.isArray(r) ? r : (r.rows || []); };

const COMMIT = process.argv.includes('--commit');
const companyArg = (process.argv.find(a => a.startsWith('--company=')) || '--company=CCC').split('=')[1].toUpperCase();
const COMPANY = ['CCC','PSA','CGC','PCA'].includes(companyArg) ? companyArg : 'CCC';
const RAW_TABLE = `ebay_fr_price_raw`;  // table unifiee CCC+PSA (filtree par company)
const MIN_N = 2;                                   // plancher de robustesse : jamais un prix sur une annonce unique
const RATIO_MAX = Number(process.env.RATIO_MAX || 100); // garde-fou : prix gradé / raw > RATIO_MAX = aberration ecartee

// Table d'archivage unifiee (remplace ccc_ask_history)
await sql.query(`CREATE TABLE IF NOT EXISTS ebay_fr_ask_history (
  company text NOT NULL DEFAULT 'CCC',
  card_ref text NOT NULL,
  variety text NOT NULL DEFAULT '',
  tier text NOT NULL,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  median_ask numeric,
  n_annonces integer,
  source text NOT NULL DEFAULT 'ebay_fr',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company, card_ref, variety, tier, as_of_date)
)`);

const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// gradeRank generique : {COMPANY}_{int}[_{demi}][_{BLACK|GOLD}]
const gradeRank = (tier) => {
  const m = tier.match(/^[A-Z]+_(\d+)(?:_(\d+))?(?:_(BLACK|GOLD))?$/);
  if (!m) return 0;
  let v = parseFloat(m[2] ? `${m[1]}.${m[2]}` : m[1]);
  if (m[3]) v += 0.4;
  return v;
};

// -- Catalogue FR -------------------------------------------------------------
const cards = await q(`SELECT id, name_localized FROM k_cards WHERE lang='fr'`);
const parsed = cards.map((c) => { const m = c.id.match(/^fr-(.+?)(-1st)?-(\d+)$/); return m ? { setcode: m[1], is1st: !!m[2], num: String(parseInt(m[3], 10)), root: norm(c.name_localized).split(' ')[0], name: c.name_localized } : null; }).filter(Boolean);

// -- Pop (indice de tie-break UNIQUEMENT, jamais un filtre de prix) ------------
// CCC -> grading_pop ; PSA -> psa_pop_reports. Departage un numero partage entre
// plusieurs sets. Une carte non-documentee reste pricee.
let popRefs = new Set();
if (COMPANY === 'CCC') {
  popRefs = new Set((await q(`SELECT DISTINCT card_ref, variety FROM grading_pop WHERE company='CCC'`)).map((r) => `${r.card_ref}|${r.variety || ''}`));
} else if (COMPANY === 'PSA') {
  popRefs = new Set((await q(`SELECT DISTINCT card_ref FROM psa_pop_reports`)).map((r) => `${r.card_ref}|`));
}

// -- Annonces matchables ------------------------------------------------------
const rows = await q(`SELECT * FROM ${RAW_TABLE} WHERE company='${COMPANY}' AND NOT excluded AND NOT is_lot AND lang='FR' AND grade_num IS NOT NULL`);
const skip = { noNumber: 0, noCardMatch: 0, ambiguous: 0 };
const buckets = new Map();

for (const r of rows) {
  if (!r.card_number) { skip.noNumber++; continue; }
  const num = String(parseInt(r.card_number, 10));
  const is1st = r.edition_hint === '1st';
  const variety = is1st ? '1st Edition' : '';
  const titleN = norm(r.title);

  const cands = parsed.filter((c) => c.num === num && c.is1st === is1st && c.root && titleN.includes(c.root));
  if (cands.length === 0) { skip.noCardMatch++; continue; }
  const distinctSets = [...new Set(cands.map((c) => c.setcode))];
  let chosen = distinctSets.length === 1
    ? cands[0]
    : (cands.find((c) => popRefs.has(`${c.setcode}-${c.num}|${variety}`) || popRefs.has(`${c.setcode}-${c.num}|`)) || cands[0]);
  if (!chosen) { skip.ambiguous++; continue; }

  const cardRef = `${chosen.setcode}-${chosen.num}`;
  const key = `${cardRef}|${variety}|${r.tier}`;
  if (!buckets.has(key)) buckets.set(key, { prices: [], name: chosen.name });
  buckets.get(key).prices.push(Number(r.price));
}

// -- Agregation + seuil n>=2 --------------------------------------------------
const byCard = new Map();
for (const [key, b] of buckets) {
  const valid = b.prices.filter((p) => p > 0);
  if (valid.length < MIN_N) continue;
  const [cardRef, variety, tier] = key.split('|');
  const ck = `${cardRef}|${variety}`;
  if (!byCard.has(ck)) byCard.set(ck, []);
  byCard.get(ck).push({ tier, rank: gradeRank(tier), med: Math.round(median(valid)), n: valid.length, name: b.name });
}

// -- Filtre monotonie a l'ingestion -------------------------------------------
const MONO_TOL = 1.3;
let droppedMono = 0;
const out = [];
for (const [ck, list] of byCard) {
  list.sort((a, b) => a.rank - b.rank);
  const keep = [...list];
  for (let i = 0; i < keep.length; i++) {
    const higher = keep.slice(i + 1).find((h) => h.med != null);
    if (higher && keep[i].med > higher.med * MONO_TOL) { keep[i]._drop = true; droppedMono++; }
  }
  const [cardRef, variety] = ck.split('|');
  const vSuffix = variety === '1st Edition' ? `1st_Edition_${COMPANY}` : COMPANY;
  for (const g of keep) {
    if (g._drop) continue;
    out.push({ cardRef, variety, tier: g.tier, variant: vSuffix, med: g.med, n: g.n, name: g.name });
  }
}

// -- GARDE-FOU anti-aberration : ratio prix gradé / raw NEAR_MINT --------------
// Une carte dresseur a ~0.20€ en raw ne peut valoir 6000€ en PSA 10 (ratio > 30000x).
// Une vraie chase card (Lugia V alt) a un raw eleve -> ratio faible (~9x). On ecarte
// tout ce qui depasse RATIO_MAX. Cartes SANS raw connu : conservees (pas d'ancre pour juger).
const refs = [...new Set(out.map((o) => o.cardRef))];
const rawMap = new Map();
if (refs.length) {
  const rawRows = await q(
    `SELECT DISTINCT ON (print_id) print_id, spot
       FROM price_matrix
      WHERE print_id = ANY($1) AND tier='NEAR_MINT' AND spot IS NOT NULL AND spot > 0
      ORDER BY print_id, sale_count DESC NULLS LAST`,
    [refs]
  );
  for (const r of rawRows) rawMap.set(r.print_id, Number(r.spot));
}
const aberrations = [];
const clean = [];
for (const o of out) {
  const raw = rawMap.get(o.cardRef);
  const ratio = raw ? o.med / raw : null;
  if (ratio !== null && ratio > RATIO_MAX) aberrations.push({ ...o, raw, ratio: Math.round(ratio) });
  else clean.push(o);
}
clean.sort((a, b) => a.cardRef.localeCompare(b.cardRef) || b.med - a.med);

console.log(`=== MATCHING PRIX ${COMPANY} (${COMMIT ? 'COMMIT' : 'DRY-RUN'}, seuil n>=${MIN_N}, ratio_max=${RATIO_MAX}x) ===`);
console.log(`table raw : ${RAW_TABLE} | annonces traitees : ${rows.length}`);
console.log(`skips -> sans numero: ${skip.noNumber} | aucun match: ${skip.noCardMatch} | ambigu: ${skip.ambiguous}`);
console.log(`outliers monotonie ecartes : ${droppedMono}`);
console.log(`ABERRATIONS ecartees (ratio > ${RATIO_MAX}x) : ${aberrations.length}`);
for (const a of aberrations) console.log(`   ✗ ${a.cardRef.padEnd(14)} ${a.tier.padEnd(13)} ${String(a.med).padStart(5)}EUR / raw ${a.raw}EUR = ${a.ratio}x  ${a.name}`);
console.log(`buckets retenus (propres, >=${MIN_N} annonces) : ${clean.length}`);
console.log(`=== Prix retenus (mediane ask, decote x0.88 au runtime) ===`);
for (const o of clean.slice(0, 30)) console.log(` ${o.cardRef.padEnd(14)} [${(o.variety || 'Unl').padEnd(11)}] ${o.tier.padEnd(14)} ${String(o.med).padStart(5)}EUR (n=${o.n}) ${o.name}`);

if (COMMIT) {
  let done = 0;
  for (const o of clean) {
    let printId = o.cardRef;
    if (o.variety === '1st Edition') {
      const alt = await q(`SELECT id FROM k_prints WHERE id = $1 LIMIT 1`, [o.cardRef.replace(/^(.+)-(\d+)$/, '$1-shadowless-ns-$2')]);
      if (alt.length) printId = alt[0].id;
    }
    const kodoCardId = `fr-${printId}`;
    await sql.query(`INSERT INTO price_matrix
      (kodo_card_id, market, tier, source, variant, spot, avg30d, median30d, sale_count, currency, is_asking, as_of, print_id)
      VALUES ($1,'EU',$2,'ebay_fr',$3,$4,$4,$4,$5,'EUR',true, now(), $6)
      ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
        spot=EXCLUDED.spot, avg30d=EXCLUDED.avg30d, median30d=EXCLUDED.median30d,
        sale_count=EXCLUDED.sale_count, is_asking=true, as_of=now()`,
      [kodoCardId, o.tier, o.variant, o.med, o.n, printId]);
    await sql.query(`INSERT INTO ebay_fr_ask_history
      (company, card_ref, variety, tier, as_of_date, median_ask, n_annonces, source, fetched_at)
      VALUES ($1,$2,$3,$4,CURRENT_DATE,$5,$6,'ebay_fr', now())
      ON CONFLICT (company, card_ref, variety, tier, as_of_date) DO UPDATE SET
        median_ask=EXCLUDED.median_ask, n_annonces=EXCLUDED.n_annonces, fetched_at=now()`,
      [COMPANY, o.cardRef, o.variety, o.tier, o.med, o.n]);
    done++;
  }
  console.log(`price_matrix : ${done} lignes ${COMPANY} upsertees (source ebay_fr, market EU, is_asking=true).`);
  const hist = await q(`SELECT COUNT(*)::int n, COUNT(DISTINCT as_of_date)::int jours FROM ebay_fr_ask_history WHERE company='${COMPANY}'`);
  console.log(`ebay_fr_ask_history[${COMPANY}] : ${hist[0].n} lignes sur ${hist[0].jours} jour(s).`);
} else {
  console.log(`(DRY-RUN -- rien ecrit. Verifie, puis --commit.)`);
}
