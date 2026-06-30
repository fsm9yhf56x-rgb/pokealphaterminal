// =============================================================================
// price-sources.ts — Source de verite unique sur la PROVENANCE des prix.
// Tout l'app (fiches, compute price_signals, futur Oracle/API) passe par ici
// pour savoir : d'ou vient un prix, est-ce une VENTE / une ANNONCE / une
// TENDANCE, sur quel marche, avec quelle confiance de base.
// Regle Kodo : jamais melanger les marches, et TOUJOURS dire a l'utilisateur
// si un prix est "vendu" ou "liste".
// =============================================================================

export type PriceKind = 'sold' | 'listed' | 'trend';
//  sold   = transactions reelles abouties (eBay ventes, TCGplayer market)
//  listed = annonces en cours / asks (Cardmarket lowest ask, eBay actif)
//  trend  = indice derive des ventes (tendance Cardmarket) — ni vente ni ask

export type Market = 'FR' | 'EU' | 'US' | 'JP';

export interface SourceMeta {
  source: string;
  kind: PriceKind;
  market: Market;
  labelFr: string;
  // Confiance de base 0..1 liee a la NATURE de la source (pas au volume).
  // Vente > tendance > annonce. Ajustee ensuite par volume/recence (confidence.ts).
  baseTrust: number;
}

// Registre exhaustif des sources connues. Source absente = inconnue (prudence).
export const SOURCE_REGISTRY: Record<string, SourceMeta> = {
  // --- Ventes US (eBay / TCGplayer) -- A EXCLURE des fiches FR ---------------
  ebay:          { source: 'ebay',          kind: 'sold',   market: 'US', labelFr: 'eBay US · vendu',         baseTrust: 0.90 },
  ppt_ebay:      { source: 'ppt_ebay',      kind: 'sold',   market: 'US', labelFr: 'eBay US · vendu',         baseTrust: 0.90 },
  tcgplayer:     { source: 'tcgplayer',     kind: 'sold',   market: 'US', labelFr: 'TCGplayer · ventes',      baseTrust: 0.80 },
  ppt_tcgplayer: { source: 'ppt_tcgplayer', kind: 'sold',   market: 'US', labelFr: 'TCGplayer · ventes',      baseTrust: 0.80 },

  // --- Cardmarket EU (multilingue) ------------------------------------------
  cardmarket:        { source: 'cardmarket',        kind: 'trend',  market: 'EU', labelFr: 'Cardmarket · tendance', baseTrust: 0.70 },
  cardmarket_unsold: { source: 'cardmarket_unsold', kind: 'listed', market: 'EU', labelFr: 'Cardmarket · annonces', baseTrust: 0.45 },

  // --- Marche FR -------------------------------------------------------------
  // A CONFIRMER : cardmarket_fr = ask le plus bas (listed) ou tendance FR (trend) ?
  // La fiche affiche "des 300 EUR" => ask => 'listed'. Ajuster ici si besoin.
  cardmarket_fr: { source: 'cardmarket_fr', kind: 'listed', market: 'FR', labelFr: 'Cardmarket FR · annonces', baseTrust: 0.55 },
  // CCC : annonces eBay FR actives, decotees (cf. onglet Gradation).
  ebay_fr:       { source: 'ebay_fr',       kind: 'listed', market: 'FR', labelFr: 'eBay FR · annonces',       baseTrust: 0.55 },
};

export function getSourceMeta(source: string | null | undefined): SourceMeta {
  if (source && SOURCE_REGISTRY[source]) return SOURCE_REGISTRY[source];
  return { source: source ?? 'unknown', kind: 'listed', market: 'US', labelFr: 'Source inconnue', baseTrust: 0.20 };
}

// Une fiche FR ne montre QUE le marche francais/europeen pertinent.
export const FR_PAGE_MARKETS: Market[] = ['FR', 'EU'];
export function isAllowedOnFrPage(source: string): boolean {
  return FR_PAGE_MARKETS.includes(getSourceMeta(source).market);
}

// =============================================================================
// SECTION B — Societes de gradation : interpretation des "tier".
// Un tier en base = COMPANY_GRADE[_LABEL], ex: PSA_10, CCC_9_5, CCC_10_GOLD.
// =============================================================================

export type GradingCompany =
  | 'PSA' | 'CGC' | 'BGS' | 'CCC' | 'PCA' | 'ACE' | 'TAG'
  | 'GSG' | 'PGS' | 'AOG' | 'GMA' | 'UNKNOWN';

// Societes ancrees sur le marche FR.
export const FR_GRADING_COMPANIES: GradingCompany[] = ['CCC', 'PCA'];

const RAW_TIERS = new Set([
  'MINT','NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED','AGGREGATED',
]);

const RAW_LABELS: Record<string,string> = {
  MINT: 'Mint', NEAR_MINT: 'Near Mint', LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played', HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged', AGGREGATED: 'Tendance',
};

export interface TierMeta {
  raw: string;
  isGraded: boolean;
  company: GradingCompany | null;
  grade: number | null;
  label: string | null;       // ex 'GOLD'
  frRelevant: boolean;        // brut FR = oui ; grade = oui si CCC/PCA
  labelFr: string;
}

export function parseTier(tier: string): TierMeta {
  const raw = (tier || '').toUpperCase();

  if (RAW_TIERS.has(raw)) {
    return { raw, isGraded: false, company: null, grade: null, label: null,
             frRelevant: true, labelFr: RAW_LABELS[raw] ?? raw };
  }

  // Grade : COMPANY_GRADE[_LABEL]  ex PSA_10, CCC_9_5, CCC_10_GOLD
  const m = raw.match(/^([A-Z]+)_(\d+(?:_\d+)?)(?:_([A-Z]+))?$/);
  if (m) {
    const company = m[1] as GradingCompany;
    const gradeStr = m[2].replace('_', '.');
    const grade = Number(gradeStr);
    const label = m[3] ?? null;
    const frRelevant = FR_GRADING_COMPANIES.includes(company);
    const labelFr = `${company} ${gradeStr}${label ? ' ' + label : ''}`;
    return { raw, isGraded: true, company, grade, label, frRelevant, labelFr };
  }

  return { raw, isGraded: false, company: 'UNKNOWN', grade: null, label: null,
           frRelevant: false, labelFr: raw };
}
