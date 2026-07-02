// scripts/clean-cardmarket-graded-fr.mjs
// ============================================================================
// GARDE ANTI-ABERRATION VALEUR-DÉPENDANTE + APPRENTISSAGE ITÉRATIF — définitive.
// ----------------------------------------------------------------------------
// Les prix Cardmarket gradés sont des ASKS : gonflés, avec une queue de "prix de
// blocage" (1M E). La prime gradé/raw décroît avec la valeur -> plafond
// valeur-dépendant : prix_gradé <= k_max[grade] * max(raw, PIVOT).
// k_max appris ITÉRATIVEMENT (ré-estimation robuste, dé-contaminée des blocages).
//
// MONOTONIE PAR SOCIÉTÉ (corrige un bug) : on ne compare JAMAIS des notes de
// sociétés différentes (un CGC 9 et un PSA 8 ont des barèmes distincts). La
// monotonie est appliquée par (société x variant).
//
// Filets : MIN_N + raw requis. Source 'cardmarket_fr' (asks nettoyés).
// Source-agnostique : Vinted/futur -> mise en commun par (carte,grade) + médiane/MAD.
// ============================================================================
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const q = async (t, p) => { const r = await sql.query(t, p); return Array.isArray(r) ? r : (r.rows || []); };

const COMMIT = process.argv.includes('--commit');
const MIN_N = 2;
const PIVOT = 50;
const K = Number(process.env.K_PREMIUM || 3);
const ITER = 3;
const MONO_TOL = 1.3;
const MIN_SAMPLES_PER_GRADE = 30;
const MAD_FLOOR_LN = 0.30;

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const madOf = (a, med) => { if (!a.length) return 0; return median(a.map((x) => Math.abs(x - med))); };
const companyOf = (tier) => (tier.match(/^([A-Z]+)_/) || [null, tier])[1];  // PSA_9_5 -> PSA
const gradeRank = (tier) => { const m = tier.match(/^[A-Z]+_(\d+)(?:_(\d+))?(?:_(BLACK|GOLD))?$/); if (!m) return 0; let v = parseFloat(m[2] ? `${m[1]}.${m[2]}` : m[1]); if (m[3]) v += 0.4; return v; };

function iterativeBoundLn(lrs) {
  let a = [...lrs];
  let m = median(a) ?? 0, d = Math.max(madOf(a, m), MAD_FLOOR_LN);
  let bound = m + K * d;
  for (let i = 0; i < ITER; i++) {
    const trimmed = a.filter((x) => x <= bound);
    if (trimmed.length < 8) break;
    a = trimmed;
    m = median(a); d = Math.max(madOf(a, m), MAD_FLOOR_LN);
    bound = m + K * d;
  }
  return bound;
}
function learnK(obs) {
  const byGrade = {}, all = [];
  for (const o of obs) {
    if (!(o.raw >= PIVOT) || o.n < MIN_N) continue;
    const lr = Math.log(o.spot / o.raw);
    (byGrade[o.tier] ||= []).push(lr); all.push(lr);
  }
  const gK = Math.exp(iterativeBoundLn(all));
  const kmax = { __global__: gK };
  for (const [g, lrs] of Object.entries(byGrade))
    kmax[g] = lrs.length >= MIN_SAMPLES_PER_GRADE ? Math.exp(iterativeBoundLn(lrs)) : gK;
  return kmax;
}
const kFor = (kmax, tier) => kmax[tier] ?? kmax.__global__;
const ceilingFor = (kmax, tier, raw) => kFor(kmax, tier) * Math.max(raw, PIVOT);

// ── Chargement : asks Cardmarket gradés FR + raw agrégé de référence ────────────
const rows = await q(`
  SELECT pm.kodo_card_id, pm.tier, COALESCE(pm.variant,'Normal') AS variant,
         pm.spot::float8 AS spot, pm.sale_count::int AS n,
         (SELECT r.spot::float8 FROM price_matrix r
            WHERE r.kodo_card_id = pm.kodo_card_id AND r.tier='AGGREGATED'
              AND r.source='cardmarket' AND r.spot IS NOT NULL
            ORDER BY r.as_of DESC LIMIT 1) AS raw
  FROM price_matrix pm
  WHERE pm.kodo_card_id LIKE 'fr-%' AND pm.market='EU'
    AND pm.source='cardmarket_unsold' AND pm.is_asking = true
    AND pm.tier ~ '^(PSA|BGS|CGC|SGC|TAG|ACE|PCA|CCC|AOG|GSG|PGS)_'
    AND pm.spot IS NOT NULL AND pm.spot > 0`);
const obs = rows.map((r) => ({ ...r, raw: r.raw != null ? Number(r.raw) : null }));

// ── PASS 1 : k_max itératif par grade ───────────────────────────────────────────
const kmax = learnK(obs);
console.log(`=== MULTIPLICATEURS APPRIS (itératif ${ITER}x, raw>=${PIVOT}E, K=${K}) ===`);
for (const g of ['PSA_10','PSA_9','PSA_8','CCC_10','CGC_10','BGS_9_5','PCA_10'])
  if (kmax[g]) console.log(`  ${g.padEnd(12)} k_max = ${kmax[g].toFixed(1)}x`);
console.log(`  (global = ${kmax.__global__.toFixed(1)}x)`);

// ── PASS 2 : plafond valeur-dépendant + monotonie PAR SOCIÉTÉ ────────────────────
const byCard = new Map();
for (const o of obs) { if (!byCard.has(o.kodo_card_id)) byCard.set(o.kodo_card_id, []); byCard.get(o.kodo_card_id).push(o); }
const kept = [];
const rej = { minN: 0, noRaw: 0, ceiling: 0, mono: 0 };
for (const [cardId, tiers] of byCard) {
  let cand = [];
  for (const t of tiers) {
    if (t.n < MIN_N) { rej.minN++; continue; }
    if (!(t.raw > 0)) { rej.noRaw++; continue; }
    if (t.spot > ceilingFor(kmax, t.tier, t.raw)) { rej.ceiling++; continue; }
    cand.push({ ...t, rank: gradeRank(t.tier), company: companyOf(t.tier) });
  }
  // Monotonie PAR SOCIÉTÉ x variant (jamais entre sociétés différentes).
  const groups = {};
  for (const t of cand) (groups[`${t.company}|${t.variant}`] ||= []).push(t);
  for (const grp of Object.values(groups)) {
    grp.sort((a, b) => a.rank - b.rank);
    for (let i = 0; i < grp.length; i++) {
      const higher = grp.slice(i + 1).find((h) => h.spot != null);
      if (higher && grp[i].spot > higher.spot * MONO_TOL) { grp[i]._drop = true; rej.mono++; }
    }
    for (const t of grp) if (!t._drop) kept.push({ cardId, tier: t.tier, variant: t.variant, spot: t.spot, n: t.n, raw: t.raw });
  }
}

console.log(`\n=== CLEAN CARDMARKET GRADÉ FR (${COMMIT ? 'COMMIT' : 'DRY-RUN'}, K=${K}) ===`);
console.log(`Cartes FR : ${byCard.size} | lignes candidates : ${rows.length}`);
console.log(`Rejets -> n<${MIN_N}: ${rej.minN} | sans raw: ${rej.noRaw} | plafond: ${rej.ceiling} | monotonie: ${rej.mono}`);
console.log(`Lignes PROPRES : ${kept.length} (${(100*kept.length/rows.length).toFixed(1)}% couverture)`);
kept.sort((a, b) => b.spot - a.spot);
console.log('Top 12 retenues :');
for (const k of kept.slice(0, 12)) console.log(`  ${k.cardId.padEnd(22)} ${k.tier.padEnd(12)} ${Math.round(k.spot)}EUR (raw ${Math.round(k.raw)}, ${(k.spot/k.raw).toFixed(1)}x)`);
const big = kept.filter(k => k.spot > 5000);
console.log(`\nControle : ${big.length} lignes > 5000EUR (vraies cartes chères, ratio faible attendu)`);
const hooh = kept.filter(k => k.cardId === 'fr-bw6-22');
console.log(`\nHo-Oh-EX (fr-bw6-22) lignes retenues : ${hooh.map(k=>k.tier+'='+Math.round(k.spot)).join(', ') || 'AUCUNE'}`);

if (COMMIT) {
  await sql`DELETE FROM price_matrix WHERE source='cardmarket_fr'`;
  let done = 0;
  for (const k of kept) {
    const printId = k.cardId.replace(/^fr-/, '');
    await sql`INSERT INTO price_matrix
      (kodo_card_id, market, tier, source, variant, spot, avg30d, median30d, sale_count, currency, is_asking, as_of, print_id)
      VALUES (${k.cardId},'EU',${k.tier},'cardmarket_fr',${k.variant},${k.spot},${k.spot},${k.spot},${k.n},'EUR',true, now(), ${printId})
      ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
        spot=EXCLUDED.spot, avg30d=EXCLUDED.avg30d, median30d=EXCLUDED.median30d,
        sale_count=EXCLUDED.sale_count, is_asking=true, as_of=now()`;
    done++;
  }
  console.log(`\nprice_matrix : ${done} lignes cardmarket_fr écrites.`);
} else {
  console.log('\n(DRY-RUN -- rien écrit.)');
}
