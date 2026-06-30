// scripts/ccc-match-prices.mjs
// ccc_price_raw -> price_matrix (source ebay_fr, tier CCC_X, is_asking=true).
// Durci : seuil n>=2 par bucket, filtre monotonie a l'ingestion, skip sans-numero.
// Ancre numero + nom Pokemon + edition, verifie k_cards FR + pop CCC connue.
// DRY-RUN par defaut. --commit pour ecrire.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const q = async (t, p) => { const r = await sql.query(t, p); return Array.isArray(r) ? r : (r.rows || []); };
const COMMIT = process.argv.includes('--commit');
const MIN_N = 2; // plancher de robustesse : pas de prix sur une annonce unique

await sql.query(`CREATE TABLE IF NOT EXISTS ccc_ask_history (
  card_ref text NOT NULL,
  variety text NOT NULL DEFAULT '',
  tier text NOT NULL,
  as_of_date date NOT NULL DEFAULT CURRENT_DATE,
  median_ask numeric,
  n_annonces integer,
  source text NOT NULL DEFAULT 'ebay_fr',
  fetched_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (card_ref, variety, tier, as_of_date)
)`)

const norm = (s) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const gradeRank = (tier) => { const m = tier.match(/^CCC_(\d+)(?:_(\d+))?(?:_(BLACK|GOLD))?$/); if (!m) return 0; let v = parseFloat(m[2] ? `${m[1]}.${m[2]}` : m[1]); if (m[3]) v += 0.4; return v; };

// ── Catalogue FR ───────────────────────────────────────────────────────────────
const cards = await q(`SELECT id, name_localized FROM k_cards WHERE lang='fr'`);
const parsed = cards.map((c) => { const m = c.id.match(/^fr-(.+?)(-1st)?-(\d+)$/); return m ? { setcode: m[1], is1st: !!m[2], num: String(parseInt(m[3], 10)), root: norm(c.name_localized).split(' ')[0], name: c.name_localized } : null; }).filter(Boolean);

// ── Pop CCC connue (on ne price que ce qu'on documente) ────────────────────────
const popRefs = new Set((await q(`SELECT DISTINCT card_ref, variety FROM grading_pop WHERE company='CCC'`)).map((r) => `${r.card_ref}|${r.variety || ''}`));

// ── Annonces : skip sans-numero EXPLICITE ──────────────────────────────────────
const rows = await q(`SELECT * FROM ccc_price_raw WHERE NOT excluded AND NOT is_lot AND lang='FR' AND grade_num IS NOT NULL`);
const skip = { noNumber: 0, noCardMatch: 0, ambiguous: 0, noPop: 0 };
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
  let chosen = distinctSets.length === 1 ? cands[0] : cands.find((c) => popRefs.has(`${c.setcode}-${c.num}|${variety}`));
  if (!chosen) { skip.ambiguous++; continue; }

  const cardRef = `${chosen.setcode}-${chosen.num}`;
  if (!popRefs.has(`${cardRef}|${variety}`)) { skip.noPop++; continue; }
  const key = `${cardRef}|${variety}|${r.tier}`;
  if (!buckets.has(key)) buckets.set(key, { prices: [], name: chosen.name });
  buckets.get(key).prices.push(Number(r.price));
}

// ── Agregation + seuil n>=2 ────────────────────────────────────────────────────
const byCard = new Map(); // cardRef|variety -> [{tier, rank, med, n}]
for (const [key, b] of buckets) {
  const valid = b.prices.filter((p) => p > 0);
  if (valid.length < MIN_N) continue; // PLANCHER : pas de prix sur < 2 annonces
  const [cardRef, variety, tier] = key.split('|');
  const ck = `${cardRef}|${variety}`;
  if (!byCard.has(ck)) byCard.set(ck, []);
  byCard.get(ck).push({ tier, rank: gradeRank(tier), med: Math.round(median(valid)), n: valid.length, name: b.name });
}

// ── Filtre monotonie A L'INGESTION ─────────────────────────────────────────────
// Au sein d'une meme carte+edition : une note dont le prix depasse la note
// superieure la plus proche retenue = annonce aberrante -> ecartee.
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
  for (const g of keep) {
    if (g._drop) continue;
    out.push({ cardRef, variety, tier: g.tier, variant: variety === '1st Edition' ? '1st_Edition_CCC' : 'CCC', med: g.med, n: g.n, name: g.name });
  }
}
out.sort((a, b) => a.cardRef.localeCompare(b.cardRef) || b.med - a.med);

console.log(`\n=== MATCHING PRIX CCC DURCI (${COMMIT ? 'COMMIT' : 'DRY-RUN'}, seuil n>=${MIN_N}) ===`);
console.log(`annonces traitees : ${rows.length}`);
console.log(`skips -> sans numero: ${skip.noNumber} | aucun match: ${skip.noCardMatch} | ambigu: ${skip.ambiguous} | sans pop CCC: ${skip.noPop}`);
console.log(`outliers monotonie ecartes : ${droppedMono}`);
console.log(`buckets retenus (>=${MIN_N} annonces, price_matrix) : ${out.length}`);
console.log(`\n=== Prix retenus (mediane ask, decote x0.88 au runtime) ===`);
for (const o of out.slice(0, 30)) console.log(` ${o.cardRef.padEnd(14)} [${(o.variety || 'Unl').padEnd(11)}] ${o.tier.padEnd(14)} ${String(o.med).padStart(5)}EUR (n=${o.n}) ${o.name}`);

if (COMMIT) {
  let done = 0;
  for (const o of out) {
    // PK reelle = (kodo_card_id, market, tier, source, variant).
    // On s'aligne sur le keying FR existant : kodo_card_id='fr-{print}', market='EU'.
    // 1ere Ed : resoudre le print suffixe vintage si k_prints le connait.
    let printId = o.cardRef;
    if (o.variety === '1st Edition') {
      const alt = await q(`SELECT id FROM k_prints WHERE id = $1 LIMIT 1`, [o.cardRef.replace(/^(.+)-(\\d+)$/, '$1-shadowless-ns-$2')]);
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
    await sql.query(`INSERT INTO ccc_ask_history
      (card_ref, variety, tier, as_of_date, median_ask, n_annonces, source, fetched_at)
      VALUES ($1,$2,$3,CURRENT_DATE,$4,$5,'ebay_fr', now())
      ON CONFLICT (card_ref, variety, tier, as_of_date) DO UPDATE SET
        median_ask=EXCLUDED.median_ask, n_annonces=EXCLUDED.n_annonces, fetched_at=now()`,
      [o.cardRef, o.variety, o.tier, o.med, o.n]);
    done++;
  }
  console.log(`\\nprice_matrix : ${done} lignes CCC upsertees (source ebay_fr, market EU, is_asking=true).`);
  const hist = await q(`SELECT COUNT(*)::int n, COUNT(DISTINCT as_of_date)::int jours FROM ccc_ask_history`);
  console.log(`ccc_ask_history : snapshot du jour archive. ${hist[0].n} lignes sur ${hist[0].jours} jour(s).`);
} else {
  console.log(`\n(DRY-RUN — rien ecrit. Verifie, puis --commit.)`);
}
