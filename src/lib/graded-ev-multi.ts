// src/lib/graded-ev-multi.ts
// ─────────────────────────────────────────────────────────────────────────────
// EXTENSION MULTI-SOCIÉTÉ du moteur Graded.ev.
//
// graded-ev.ts (PSA, notes entières 1-10) reste INTACT — aucune régression.
// Ce module généralise le calcul à toutes les sociétés présentes dans
// price_matrix (PSA/CGC/BGS/PCA/CCC/SGC/ACE/TAG) ET à leurs demi-notes (9.5…),
// que le moteur PSA ne gère pas.
//
// Mêmes principes que le moteur d'origine :
//   • aucun prix inventé : une note sans prix est exclue, on renormalise sur
//     les notes couvertes et on expose le `coverage` ;
//   • `gemRate` brut = part de la meilleure note (≥10) sur la pop totale, comme
//     garde-fou anti fausse-promesse ;
//   • distinction VENTE / ANNONCE : les annonces Cardmarket (asks) sur-cotent,
//     on leur applique la même décote que le raw FR et on signale la base.
// ─────────────────────────────────────────────────────────────────────────────

import {
  DEFAULT_GRADING_FEE_EUR,
  type GradedEVResult,
  type GradeRow,
  type GradedRecommendation,
} from './graded-ev'

const round2 = (n: number): number => Math.round(n * 100) / 100

/** Sociétés reconnues, alignées sur le préfixe de price_matrix.tier. */
export const GRADING_COMPANIES = ['PSA', 'CGC', 'BGS', 'PCA', 'CCC', 'SGC', 'ACE', 'TAG'] as const
export type GradingCompany = (typeof GRADING_COMPANIES)[number]

/** Provenance d'un prix : vente réelle (eBay US) vs annonce (Cardmarket EU/FR). */
export type PriceBasis = 'sale' | 'ask'

/** Décote appliquée aux ANNONCES (asks) pour approcher un prix de vente.
 *  Même logique que le raw FR (eu_nm_ask*0.88) : les annonces sur-cotent. */
export const ASK_DISCOUNT = 0.88

/** Seuils de reco (identiques au moteur PSA). */
const MIN_COVERAGE = 0.5
const MIN_GRADES_COVERED = 3
const STRONG_MARGIN_RATIO = 0.25

/** Une note d'une société : sa population, son prix, sa provenance. */
export interface GradeBucket {
  /** Tier price_matrix : 'CGC_9_5', 'PSA_10', 'PCA_10'… */
  tier: string
  /** Valeur numérique de la note (9.5, 10…) pour tri + gem rate. */
  gradeNum: number
  /** Mention spéciale (PRISTINE|BLACK|GOLD|PLUS…) — transparence, non calculée. */
  label?: string | null
  /** Population de cette note (grading_pop.count). */
  count: number
  /** Prix EUR BRUT de cette note (null/≤0 = exclu du calcul). */
  price: number | null
  /** Base du prix : 'sale' (fiable) | 'ask' (annonce → décotée). */
  basis: PriceBasis
}

export interface GradedEVMultiInput {
  company: GradingCompany
  /** Toutes les notes connues de cette société pour la carte. */
  buckets: GradeBucket[]
  /** Prix raw EUR de référence (fair_value_eur). */
  rawPrice: number
  /** Frais de gradation EUR (défaut DEFAULT_GRADING_FEE_EUR). */
  gradingFee?: number
}

export interface GradedEVMultiResult extends GradedEVResult {
  company: GradingCompany
  /** true si au moins une note retenue vient d'une annonce (décote appliquée). */
  hasAskBasis: boolean
  /** Répartition des bases de prix retenues. */
  basis: { sale: number; ask: number }
}

/**
 * EV de gradation pour UNE société, à partir de ses notes (buckets).
 * Généralise computeGradedEV (graded-ev.ts) aux demi-notes et aux annonces.
 */
export function computeGradedEVMulti(input: GradedEVMultiInput): GradedEVMultiResult {
  const { company, buckets, rawPrice } = input
  const gradingFee = input.gradingFee ?? DEFAULT_GRADING_FEE_EUR

  // Population totale (toutes notes ayant pop>0), pour gem rate + coverage.
  const withPop = buckets.filter((b) => b.count > 0)
  const popTotal = withPop.reduce((s, b) => s + b.count, 0)

  // Gem rate brut = part des notes >= 10 (Gem/Pristine/Black agrégés) / pop totale.
  // Aligné sur PSA (pop_10 / total) : le chiffre d'honnêteté.
  const gemCount = withPop.filter((b) => b.gradeNum >= 10).reduce((s, b) => s + b.count, 0)
  const gemRate = popTotal > 0 ? gemCount / popTotal : 0

  const gradesWithPop = withPop.length

  // Prix effectif d'un bucket : annonce → décotée, vente → brute.
  const effPrice = (b: GradeBucket): number | null => {
    if (b.price == null || b.price <= 0) return null
    return b.basis === 'ask' ? round2(b.price * ASK_DISCOUNT) : round2(b.price)
  }

  // Notes COUVERTES : pop>0 ET prix exploitable, triées du meilleur grade au pire.
  const covered = withPop
    .filter((b) => effPrice(b) != null)
    .sort((a, b) => b.gradeNum - a.gradeNum)

  const popCovered = covered.reduce((s, b) => s + b.count, 0)
  const coverage = popTotal > 0 ? popCovered / popTotal : 0

  const rows: GradeRow[] = covered.map((b) => {
    const price = effPrice(b) as number
    const proba = popCovered > 0 ? b.count / popCovered : 0
    return {
      grade: b.gradeNum,
      count: b.count,
      proba,
      price,
      contribution: round2(proba * price),
      net: round2(price - gradingFee - rawPrice),
    }
  })

  const probaGain = rows.reduce((acc, r) => acc + (r.net > 0 ? r.proba : 0), 0)
  const evBrute = round2(rows.reduce((s, r) => s + r.proba * r.price, 0))
  const evNette = round2(evBrute - gradingFee - rawPrice)

  // Répartition des bases retenues.
  const basis = { sale: 0, ask: 0 }
  for (const b of covered) basis[b.basis] += 1
  const hasAskBasis = basis.ask > 0

  // Recommandation honnête (mêmes seuils que le moteur PSA).
  let reco: GradedRecommendation
  let recoReason: string
  if (coverage < MIN_COVERAGE || covered.length < MIN_GRADES_COVERED) {
    reco = 'INSUFFISANT'
    recoReason = 'Données de prix gradés trop partielles pour une recommandation fiable.'
  } else if (evNette > rawPrice * STRONG_MARGIN_RATIO) {
    reco = 'GRADER'
    recoReason = `Gain espéré net d'environ ${round2(evNette)} € après frais et prix actuel.`
  } else if (evNette > 0) {
    reco = 'MARGINAL'
    recoReason = `Gain espéré faible (~${round2(evNette)} €). À évaluer selon ton goût du risque.`
  } else {
    reco = 'NE_PAS'
    recoReason = `Gradation non rentable en espérance (${round2(evNette)} €) : la carte vaut autant ou plus en l'état.`
  }

  return {
    evBrute,
    evNette,
    rows,
    rawPrice: round2(rawPrice),
    gradingFee: round2(gradingFee),
    gemRate,
    probaGain,
    coverage,
    gradesCovered: covered.length,
    gradesWithPop,
    reco,
    recoReason,
    company,
    hasAskBasis,
    basis,
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Société depuis un tier price_matrix ('CGC_9_5' → 'CGC'). null si inconnue. */
export function companyFromTier(tier: string): GradingCompany | null {
  const c = (tier.split('_')[0] || '').toUpperCase()
  return (GRADING_COMPANIES as readonly string[]).includes(c) ? (c as GradingCompany) : null
}

/** Note numérique depuis un tier ('CGC_9_5' → 9.5, 'PSA_10' → 10). */
export function tierToGradeNum(tier: string): number | null {
  const m = tier.match(/^[A-Za-z]+_(\d+(?:_\d+)?)/)
  if (!m) return null
  return parseFloat(m[1].replace('_', '.'))
}

/** Sociétés préférées par langue de carte (marché), du + pertinent au repli.
 *  FR : sociétés françaises d'abord (PCA/CCC) puis PSA/CGC.
 *  JP/EN : marché gradé dominé PSA puis CGC/BGS. Modifiable. */
export function preferredCompaniesForLang(lang: string): GradingCompany[] {
  switch ((lang || '').toLowerCase()) {
    case 'fr':
      return ['PCA', 'CCC', 'PSA', 'CGC', 'BGS']
    case 'jp':
      return ['PSA', 'CGC', 'BGS']
    default:
      return ['PSA', 'CGC', 'BGS']
  }
}

/**
 * À partir de buckets TOUTES sociétés mélangées (déjà lus depuis grading_pop +
 * price_matrix), calcule l'EV par société et sélectionne la société à afficher
 * selon la préférence de langue ET une couverture suffisante.
 *
 * Retourne le résultat retenu + tous les résultats par société (pour un
 * éventuel comparateur "PSA vs PCA vs CGC" côté UI).
 */
export function computeGradedEVByCompany(
  allBuckets: GradeBucket[],
  rawPrice: number,
  lang: string,
  gradingFee?: number,
): {
  chosen: GradedEVMultiResult | null
  byCompany: Partial<Record<GradingCompany, GradedEVMultiResult>>
} {
  // Regroupe par société.
  const groups: Partial<Record<GradingCompany, GradeBucket[]>> = {}
  for (const b of allBuckets) {
    const co = companyFromTier(b.tier)
    if (!co) continue
    if (!groups[co]) groups[co] = []
    groups[co]!.push(b)
  }

  const byCompany: Partial<Record<GradingCompany, GradedEVMultiResult>> = {}
  for (const co of Object.keys(groups) as GradingCompany[]) {
    const bks = groups[co]
    if (!bks) continue
    byCompany[co] = computeGradedEVMulti({ company: co, buckets: bks, rawPrice, gradingFee })
  }

  // Choix : 1re société préférée pour la langue dont la reco n'est pas INSUFFISANT.
  const order = preferredCompaniesForLang(lang)
  let chosen: GradedEVMultiResult | null = null
  for (const co of order) {
    const r = byCompany[co]
    if (r && r.reco !== 'INSUFFISANT') {
      chosen = r
      break
    }
  }
  // Repli : si aucune préférée n'est exploitable, prendre la meilleure couverture.
  if (!chosen) {
    const all = Object.values(byCompany) as GradedEVMultiResult[]
    chosen = all.sort((a, b) => b.coverage - a.coverage)[0] ?? null
  }

  return { chosen, byCompany }
}
