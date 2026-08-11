// =============================================================================
// fr-card-view.ts — Selecteur unique de la fiche FR (Pokedesk).
// Transforme les lignes brutes (price_signals x2 langues + price_matrix +
// grading_pop) en l'objet EXACT que la fiche affiche. Toute la coherence FR
// est ici : on choisit la bonne ligne lang, le bon champ, on masque l'US,
// le gradé = CCC/PCA only, chaque bloc est etiquete (sold/listed/trend) + confiance.
// Fonction pure -> testable, reutilisable Oracle/API.
// =============================================================================

import { computeConfidence, type ConfidenceResult } from './confidence';
import { parseTier, getSourceMeta, FR_GRADING_COMPANIES,
         type GradingCompany } from './price-sources';

// --- Formes d'entree (sous-ensemble des colonnes DB qu'on utilise) ----------
export interface SignalRow {
  print_id: string;
  lang: string;
  fair_value_eur: number | null;
  fair_value_method: string | null;
  cote_fr_eur: number | null;
  cote_lang: any | null;            // { PAYS: { LANGCARTE: {avg,low,high,saleCount} } }
  liquidity_score: number | null;
  spread_us_eu_pct: number | null;
  grade_ev_psa10_eur: number | null;
  computed_at: string | null;
}
export interface MatrixRow {
  print_id: string; kodo_card_id?: string; market: string; tier: string;
  source: string; spot: number | null; low: number | null; high: number | null;
  sale_count: number | null; is_asking: boolean | null; currency: string | null;
  as_of: string | null;
}
export interface GradingPopRow {
  company: string; card_ref: string; lang: string; tier: string;
  grade_num: number | null; label: string | null; count: number | null;
  pop_total: number | null; source: string | null; fetched_at: string | null;
}

// --- Formes de sortie (ce que la fiche rend) --------------------------------
export interface PriceBlock {
  value: number | null;
  currency: 'EUR';
  kindLabel: string;            // 'Vendu' | 'Annonces' | 'Tendance' | 'Indisponible'
  sourceLabel: string;          // ex 'Cardmarket · tendance'
  confidence: ConfidenceResult; // score + tier + raisons
  asOf: string | null;
  note?: string;
}
export interface CountryCote {
  country: string;              // FR, DE, ES, IT, BE, GB
  cardLang: string;            // FR, EN, DE, ALL...
  avg: number; low: number; high: number; saleCount: number;
}
export interface GradedRow {
  company: GradingCompany;
  grade: number; label: string | null; tierLabel: string;
  pop: number | null; popTotal: number | null;
  price: number | null; priceKind: string | null; priceAsOf: string | null;
}
export interface FrCardView {
  headline: PriceBlock;                 // PRIX DE MARCHE (raw FR)
  liquidity: { score: number | null; label: string; available: boolean };
  cotesParPays: CountryCote[];          // ex-"cote par langue" (corrige)
  cotePrincipaleFr: CountryCote | null; // FR/FR mis en avant
  offresCardmarketFr: PriceBlock | null;// asks NM FR
  graded: GradedRow[];                  // CCC + PCA UNIQUEMENT
  gradedCompaniesAvailable: GradingCompany[];
  dataMarketsExcluded: string[];        // trace ce qu'on a volontairement masque
}

const EUR = 'EUR' as const;
const round2 = (n: number) => Math.round(n * 100) / 100;

// Choisit la ligne signaux FR (fallback: 1ere dispo, mais on ne melange jamais ensuite)
function pickFrSignal(signals: SignalRow[]): SignalRow | null {
  return signals.find(s => s.lang === 'fr')
      ?? signals.find(s => s.lang === 'en')
      ?? signals[0] ?? null;
}

export function buildFrCardView(
  signals: SignalRow[],
  matrix: MatrixRow[],
  pop: GradingPopRow[],
  opts: { now?: Date } = {}
): FrCardView {
  const now = opts.now ?? new Date();
  const sig = pickFrSignal(signals);

  // On ne garde QUE le marche FR/EU dans la matrice (jamais US/JP sur fiche FR).
  const frEu = matrix.filter(m => m.market === 'FR' || m.market === 'EU');
  const excluded = Array.from(new Set(
    matrix.filter(m => m.market === 'US' || m.market === 'JP').map(m => m.market)));

  // ---------- HEADLINE : raw FR (tendance Cardmarket de la ligne FR) ----------
  const headlineVal = sig?.cote_fr_eur ?? sig?.fair_value_eur ?? null;
  // eu_aggregate = agregat Cardmarket EU (repli des communes/peu communes FR
  // sans vente francaise). C'est une moyenne de marche, pas une annonce en
  // cours : meme nature que cardmarket_trend. Le classer 'listed' laissait
  // croire a une offre reelle qu'on pourrait aller cliquer.
  const headlineKind =
    sig?.fair_value_method === 'cardmarket_trend' ? 'trend' :
    sig?.fair_value_method === 'eu_aggregate'     ? 'trend' :
    sig?.fair_value_method === 'eu_asking_decote' ? 'listed' :
    sig?.fair_value_method === 'us_nm_fx'         ? 'sold'   : 'listed';
  // Echantillon FR pour la confiance : ventes FR reelles si dispo
  const frFromCote = sig?.cote_lang?.FR?.FR;
  const headlineSample = frFromCote?.saleCount ?? 0;
  const headlineSource = headlineKind === 'trend' ? 'cardmarket'
                       : headlineKind === 'sold'  ? 'ebay' : 'cardmarket_unsold';
  const headline: PriceBlock = headlineVal == null
    ? { value: null, currency: EUR, kindLabel: 'Indisponible', sourceLabel: '—',
        confidence: computeConfidence({ sources: [], sampleSize: 0, now }),
        asOf: sig?.computed_at ?? null, note: 'Pas de cote FR exploitable.' }
    : {
        value: round2(headlineVal), currency: EUR,
        kindLabel: headlineKind === 'sold' ? 'Vendu' : headlineKind === 'trend' ? 'Tendance' : 'Annonces',
        sourceLabel: getSourceMeta(headlineSource).labelFr,
        confidence: computeConfidence({
          sources: [headlineSource], sampleSize: headlineSample || 1,
          concordantSources: 1, asOf: sig?.computed_at, now,
          spot: headlineVal, low: frFromCote?.low ?? null, high: frFromCote?.high ?? null }),
        asOf: sig?.computed_at ?? null,
        note: headlineKind === 'trend' ? 'Tendance Cardmarket (derivee des ventes).' : undefined,
      };

  // ---------- LIQUIDITE : NULL -> "donnees insuffisantes" ----------
  const liqScore = sig?.liquidity_score ?? null;
  const liquidity = liqScore == null
    ? { score: null, label: 'Donnees insuffisantes', available: false }
    : { score: liqScore,
        label: liqScore >= 66 ? 'Liquide' : liqScore >= 33 ? 'Moderement liquide' : 'Peu liquide',
        available: true };

  // ---------- COTES PAR PAYS (corrige : c'est par PAYS, pas par langue) ----------
  const cotesParPays: CountryCote[] = [];
  const cl = sig?.cote_lang ?? {};
  for (const country of Object.keys(cl)) {
    const byLang = cl[country] ?? {};
    // On prefere la langue de carte = langue du pays, sinon ALL, sinon 1ere.
    const preferred = byLang[country] ?? byLang.ALL ?? byLang[Object.keys(byLang)[0]];
    if (!preferred || preferred.avg == null) continue;
    cotesParPays.push({
      country, cardLang: byLang[country] ? country : (byLang.ALL ? 'ALL' : Object.keys(byLang)[0]),
      avg: round2(preferred.avg), low: round2(preferred.low ?? preferred.avg),
      high: round2(preferred.high ?? preferred.avg), saleCount: preferred.saleCount ?? 0,
    });
  }
  // Tri : FR d'abord, puis par volume.
  cotesParPays.sort((a, b) =>
    (a.country === 'FR' ? -1 : b.country === 'FR' ? 1 : 0) || b.saleCount - a.saleCount);
  const cotePrincipaleFr = cl?.FR?.FR
    ? { country: 'FR', cardLang: 'FR', avg: round2(cl.FR.FR.avg),
        low: round2(cl.FR.FR.low ?? cl.FR.FR.avg), high: round2(cl.FR.FR.high ?? cl.FR.FR.avg),
        saleCount: cl.FR.FR.saleCount ?? 0 }
    : null;

  // ---------- OFFRES CARDMARKET FR (asks NM) ----------
  const nmAsk = frEu.find(m => m.tier === 'NEAR_MINT' && m.source === 'cardmarket_unsold');
  const offresCardmarketFr: PriceBlock | null = nmAsk?.spot == null ? null : {
    value: round2(nmAsk.spot), currency: EUR, kindLabel: 'Annonces',
    sourceLabel: getSourceMeta('cardmarket_unsold').labelFr,
    confidence: computeConfidence({
      sources: ['cardmarket_unsold'], sampleSize: nmAsk.sale_count ?? 0,
      asOf: nmAsk.as_of, now, spot: nmAsk.spot, low: nmAsk.low, high: nmAsk.high }),
    asOf: nmAsk.as_of, note: 'Prix demandes (annonces en cours), non vendus.',
  };

  // ---------- GRADE : CCC + PCA UNIQUEMENT (aligne onglet Gradation) ----------
  // Pop officielle depuis grading_pop (lang fr). Prix gradé depuis matrice FR/EU,
  // societe FR seulement, et seulement si la donnee existe (sinon NULL, jamais fallback).
  const graded: GradedRow[] = [];
  const companiesSeen = new Set<GradingCompany>();
  for (const p of pop.filter(x => (x.lang || '').toLowerCase() === 'fr')) {
    const company = (p.company || '').toUpperCase() as GradingCompany;
    if (!FR_GRADING_COMPANIES.includes(company)) continue; // CCC/PCA only
    companiesSeen.add(company);
    // prix : on cherche un tier matrice FR/EU correspondant a cette societe+grade
    const wantTier = p.tier?.toUpperCase();
    const priceRow = frEu.find(m => m.tier?.toUpperCase() === wantTier && m.spot != null);
    graded.push({
      company, grade: Number(p.grade_num), label: p.label,
      tierLabel: parseTier(p.tier).labelFr,
      pop: p.count, popTotal: p.pop_total,
      price: priceRow?.spot != null ? round2(priceRow.spot) : null,
      priceKind: priceRow ? getSourceMeta(priceRow.source).labelFr : null,
      priceAsOf: priceRow?.as_of ?? null,
    });
  }
  // tri par grade desc, GOLD en tete de son palier
  graded.sort((a, b) => b.grade - a.grade || (a.label === 'GOLD' ? -1 : b.label === 'GOLD' ? 1 : 0));

  return {
    headline, liquidity, cotesParPays, cotePrincipaleFr, offresCardmarketFr,
    graded, gradedCompaniesAvailable: Array.from(companiesSeen),
    dataMarketsExcluded: excluded,
  };
}
