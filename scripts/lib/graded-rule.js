/**
 * Prix d'une carte GRADEE — LA regle, version scripts cron.
 *
 * MIROIR EXACT de src/lib/pricing/graded.ts (app TS). Les crons node
 * n'importent pas le TS de l'app -> la regle vit en double, mais les DEUX
 * fichiers portent ce commentaire et toute modification se fait DANS LES
 * DEUX. Les 18 tests de reference vivent cote app (test/graded.test.ts).
 *
 * PRINCIPE KODO : un prix affiche est un prix defendable. En cas de doute,
 * null — jamais un chiffre invente. Le 74,56 EUR affiche pour une PSA 9
 * qui en vaut 250-500 venait du smartPrice PPT ecrit sans garde.
 *
 * LES GARDES :
 *   G1  median, jamais smartPrice (statistique prouvee non fiable)
 *   G2  count >= MIN_SALES (1 vente n'est pas un marche)
 *   G3  monotonie : une note qui vaut nettement moins qu'une note
 *       INFERIEURE fiable de la meme societe = donnee suspecte -> null
 *   G4  demi-grades normalises, societe hors PPT -> null
 */

const PPT_COMPANIES = new Set(['psa', 'bgs', 'cgc', 'sgc', 'ace', 'tag']);
const MIN_SALES = 3;
const MONO_TOLERANCE = 0.85;

/** "PSA" + "9.5" -> "psa9_5" (cle du jsonb PPT). Null si non normalisable. */
function pptGradeKey(company, grade) {
  if (!company || grade == null) return null;
  const co = String(company).trim().toLowerCase();
  if (!PPT_COMPANIES.has(co)) return null;
  const g = String(grade).trim().replace(',', '.');
  const num = Number(g);
  if (!Number.isFinite(num) || num < 1 || num > 10) return null;
  const key = Number.isInteger(num) ? String(num) : String(num).replace('.', '_');
  return co + key;
}

function usableMedian(s) {
  const m = s && s.median;
  const n = (s && s.count) || 0;
  if (m == null || !(m > 0)) return null;
  if (n < MIN_SALES) return null; // G2
  return m;
}

/**
 * Prix USD defendable pour (company, grade) dans un jsonb PPT — ou null.
 * L'appelant convertit avec SON taux de change.
 */
function gradedPriceUsd(grades, company, grade) {
  if (!grades) return null;
  const key = pptGradeKey(company, grade); // G4
  if (!key) return null;

  const price = usableMedian(grades[key]); // G1 + G2
  if (price == null) return null;

  // G3 — monotonie contre toutes les notes strictement inferieures fiables
  // de la meme societe.
  const co = String(company).trim().toLowerCase();
  const myGrade = Number(String(grade).trim().replace(',', '.'));
  for (const k of Object.keys(grades)) {
    if (!k.startsWith(co)) continue;
    const g = Number(k.slice(co.length).replace('_', '.'));
    if (!Number.isFinite(g) || g >= myGrade) continue;
    const lower = usableMedian(grades[k]);
    if (lower != null && price < lower * MONO_TOLERANCE) return null;
  }
  return price;
}

/**
 * Deplie un jsonb PPT en lignes de tiers exploitables pour price_matrix :
 * [{ tier: 'PSA_9', spot: 172.9, saleCount: 429 }, ...] — UNIQUEMENT les
 * notes qui passent les gardes. Une note rejetee n'est pas ecrite : son
 * absence produira graded_no_data en aval (= "—" affiche), jamais un faux prix.
 */
const CROSS_FLOOR = 0.3; // G5
const CROSS_MIN_GRADE = 7;
const RAW_FLOOR = 0.7;      // G6
const RAW_MIN_GRADE = 9;

function usableGradeTiers(grades, rawUsd) {
  if (!grades) return [];
  const out = [];
  for (const key of Object.keys(grades)) {
    const m = key.match(/^([a-z]+)(\d+(?:_\d)?)$/);
    if (!m) continue;
    const company = m[1];
    const grade = m[2].replace('_', '.');
    const price = gradedPriceUsd(grades, company, grade);
    if (price == null) continue;
    out.push({
      tier: company.toUpperCase() + '_' + m[2].toUpperCase(),
      spot: price,
      saleCount: (grades[key] && grades[key].count) || 0,
      _grade: Number(grade),
    });
  }
  // G5 — plancher INTER-societes : G3 est intra-societe, donc une note
  // orpheline (seule de sa societe) n'a aucune ancre — un SGC 10 a 25$
  // passait pendant que la PSA 7 valait 460$. Une note >= 7 qui vaut moins
  // de 30% du meilleur prix d'une note STRICTEMENT INFERIEURE (toutes
  // societes) est absurde par construction. Seuil lache expres : les ecarts
  // legitimes entre societes passent, seul l'absurde tombe.
  const kept = out.filter((t) => {
    // G6 — plancher RAW : une note >= 9 qui vaut moins de 70% du raw NM
    // de la MEME carte est absurde (personne ne vend une 9 sous le raw
    // qu'elle contient). Limite aux 9-10 expres : une 8 moderne sous le
    // NM est un vrai fait de marche. Ancre = raw_market_usd PPT (sain).
    if (t._grade >= RAW_MIN_GRADE && rawUsd > 0 && t.spot < rawUsd * RAW_FLOOR) return false;
    if (t._grade < CROSS_MIN_GRADE) return true;
    let bestLower = 0;
    for (const o of out) if (o._grade < t._grade && o.spot > bestLower) bestLower = o.spot;
    return bestLower === 0 || t.spot >= bestLower * CROSS_FLOOR;
  });
  for (const t of kept) delete t._grade;
  return kept;
}

module.exports = { pptGradeKey, gradedPriceUsd, usableGradeTiers };
