// =============================================================================
// confidence.ts — Indice de confiance Kodo (0..100 + palier + raisons).
// Fonction PURE, sans dependance externe. Sert l'affichage des fiches ET le
// futur Oracle/API (meme score partout). Repond a : "ce prix est-il fiable ?"
// =============================================================================

import { getSourceMeta, type PriceKind } from './price-sources';

export type ConfidenceTier = 'none' | 'low' | 'medium' | 'high';

export interface ConfidenceInput {
  sources: string[];               // sources techniques (ex ['ebay_fr'])
  sampleSize: number;              // nb ventes/annonces (price_matrix.sale_count)
  concordantSources?: number;      // nb sources independantes concordantes (~+-15%)
  asOf?: string | Date | null;     // fraicheur (price_matrix.as_of)
  low?: number | null;             // dispersion optionnelle
  high?: number | null;
  spot?: number | null;
  now?: Date;                      // date de ref (tests)
}

export interface ConfidenceResult {
  score: number;                   // 0..100
  tier: ConfidenceTier;
  kind: PriceKind;                 // sold / listed / trend (nature dominante)
  reasons: string[];               // explications FR affichables
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  const now = input.now ?? new Date();

  // Pas d'echantillon = pas de confiance. (faux zero -> none, pas "peu fiable")
  if (!input.sampleSize || input.sampleSize <= 0 || input.sources.length === 0) {
    return { score: 0, tier: 'none', kind: 'listed',
             reasons: ['Donnees insuffisantes (aucune vente ni annonce recente).'] };
  }

  const metas = input.sources.map(getSourceMeta);

  // 1) Nature de la source (vente > tendance > annonce). On prend la meilleure.
  const baseTrust = Math.max(...metas.map(m => m.baseTrust));
  const kind: PriceKind =
    metas.some(m => m.kind === 'sold')  ? 'sold'  :
    metas.some(m => m.kind === 'trend') ? 'trend' : 'listed';
  reasons.push(
    kind === 'sold'  ? 'Base sur des ventes reelles.' :
    kind === 'trend' ? 'Base sur une tendance (derivee des ventes).' :
                       'Base sur des annonces en cours (prix demandes, non vendus).'
  );

  // 2) Volume (echelle log : 1 ~0.15, 5 ~0.5, 20 ~0.8, 50+ ~1).
  const vol = clamp01(Math.log10(input.sampleSize + 1) / Math.log10(51));
  if (input.sampleSize >= 20)     reasons.push(`Volume solide (${input.sampleSize}).`);
  else if (input.sampleSize >= 5) reasons.push(`Volume modere (${input.sampleSize}).`);
  else                            reasons.push(`Volume faible (${input.sampleSize}).`);

  // 3) Concordance multi-sources.
  const conc = input.concordantSources ?? 1;
  const concBoost = conc >= 3 ? 1 : conc === 2 ? 0.85 : 0.6;
  if (conc >= 2) reasons.push(`${conc} sources concordantes.`);

  // 4) Recence (0j=1, ~7j 0.94, ~30j 0.75, ~90j 0.25, 120j 0).
  let recency = 1;
  if (input.asOf) {
    const ageDays = (now.getTime() - new Date(input.asOf).getTime()) / 86_400_000;
    recency = clamp01(1 - ageDays / 120);
    if (ageDays > 30)     reasons.push(`Donnee ancienne (${Math.round(ageDays)} j).`);
    else if (ageDays > 7) reasons.push(`Donnee recente (${Math.round(ageDays)} j).`);
  }

  // 5) Dispersion (spread low/high vs spot ; resserre = confiant).
  let tightness = 1;
  if (input.spot && input.low != null && input.high != null && input.spot > 0) {
    const spread = (input.high - input.low) / input.spot;
    tightness = clamp01(1 - spread / 1.5);
    if (spread > 0.6) reasons.push('Prix disperses (faible coherence).');
  }

  const score01 =
      baseTrust * 0.34
    + vol       * 0.26
    + concBoost * 0.14
    + recency   * 0.16
    + tightness * 0.10;

  const score = Math.round(clamp01(score01) * 100);
  const tier: ConfidenceTier =
    score >= 75 ? 'high' : score >= 50 ? 'medium' : score >= 25 ? 'low' : 'none';

  return { score, tier, kind, reasons };
}

export function confidenceTierLabel(t: ConfidenceTier): string {
  return t === 'high'   ? 'Confiance elevee'
       : t === 'medium' ? 'Confiance moyenne'
       : t === 'low'    ? 'Confiance faible'
       :                  'Donnees insuffisantes';
}
