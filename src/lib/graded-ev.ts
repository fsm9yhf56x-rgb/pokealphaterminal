// src/lib/graded-ev.ts
// ─────────────────────────────────────────────────────────────────────────────
// MOTEUR GRADED.EV — "Faut-il grader cette carte ?"
//
// Calcul HONNÊTE de l'espérance de valeur (EV) d'une gradation PSA.
//
// Principe : EV nette = Σ(proba_note × prix_note) − frais − prix_raw
//   où proba_note = pop(note) / pop_total  (distribution réelle PSA)
//
// Ce moteur ne promet JAMAIS le meilleur cas (PSA 10). Il montre la
// distribution réelle des notes et le gain ESPÉRÉ, pas le gain maximal.
// Exemple : un Alakazam Unlimited a ~2,4% de chance d'obtenir un PSA 10.
// Afficher "+2000€ si gradée" serait mensonger ; le gain espéré réel est ~71€.
//
// Aucun fallback synthétique : si un prix de grade manque, on l'exclut et on
// renormalise sur les notes couvertes, en exposant le taux de couverture.
// ─────────────────────────────────────────────────────────────────────────────

/** Taux de change USD→EUR. Source de vérité unique pour le moteur gradé.
 *  (aligné sur USD_TO_EUR=0.92 historique du projet) */
export const USD_TO_EUR = 0.92

/** Frais de gradation PSA par défaut, en EUR.
 *  Correspond approximativement au service PSA "Value" en lot (~25 USD) +
 *  une part d'envoi/retour amortie. Paramétrable par l'appelant.
 *  Affiché explicitement à l'utilisateur (jamais caché). */
export const DEFAULT_GRADING_FEE_EUR = 25

/** Les grades PSA que le moteur considère, du meilleur au pire. */
export const PSA_GRADES = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const

// ── Entrées ──────────────────────────────────────────────────────────────────

/** Distribution de population PSA pour UNE variété (depuis psa_pop_reports).
 *  Chaque champ = nombre de cartes ayant obtenu cette note. */
export interface PopByGrade {
  10: number; 9: number; 8: number; 7: number; 6: number
  5: number; 4: number; 3: number; 2: number; 1: number
  /** pop_total tel que fourni par PSA. Gardé pour référence ; le calcul
   *  interne re-somme par sécurité. */
  total: number
}

/** Prix EUR par grade (déjà converti depuis l'USD si besoin).
 *  null/absent = pas de donnée fiable pour ce grade → exclu du calcul. */
export type PriceByGrade = Partial<Record<number, number | null>>

export interface GradedEVInput {
  /** Distribution PSA de la bonne variété (Unlimited / Shadowless / 1st Ed…). */
  pop: PopByGrade
  /** Prix EUR par grade. Notes manquantes (null/absentes) exclues. */
  prices: PriceByGrade
  /** Prix raw de référence (fair_value_eur, le NM). Coût d'opportunité :
   *  ce que vaut déjà la carte non gradée. */
  rawPrice: number
  /** Frais de gradation en EUR (défaut DEFAULT_GRADING_FEE_EUR). */
  gradingFee?: number
}

// ── Sorties ──────────────────────────────────────────────────────────────────

/** Une ligne de la distribution, pour l'affichage et la traçabilité. */
export interface GradeRow {
  grade: number
  /** Population de cette note (pour cette variété). */
  count: number
  /** Probabilité renormalisée sur les notes COUVERTES par un prix [0..1]. */
  proba: number
  /** Prix EUR de cette note. */
  price: number
  /** proba × price = contribution à l'EV brute. */
  contribution: number
  /** Gain net SI on obtient cette note = price − frais − rawPrice.
   *  Negatif = grader pour finir avec cette note ferait perdre de l'argent. */
  net: number
}

export type GradedRecommendation = 'GRADER' | 'MARGINAL' | 'NE_PAS' | 'INSUFFISANT'

export interface GradedEVResult {
  /** Espérance de valeur brute = Σ(proba × prix) sur notes couvertes. */
  evBrute: number
  /** EV nette = evBrute − frais − rawPrice. Le vrai gain espéré de grader. */
  evNette: number
  /** Détail par note (notes couvertes), trié du meilleur grade au pire. */
  rows: GradeRow[]
  /** Rappel des paramètres. */
  rawPrice: number
  gradingFee: number
  /** Taux de PSA 10 (= pop_10 / pop_total brut), en fraction [0..1].
   *  LE chiffre d'honnêteté : empêche la fausse promesse du meilleur cas. */
  gemRate: number
  /** Probabilite que grader soit rentable = Σ proba des notes ou net > 0.
   *  Le chiffre de risque : quelle chance d'au moins rentrer dans ses frais. */
  probaGain: number
  /** Part de la population couverte par un prix [0..1] (transparence). */
  coverage: number
  /** Nombre de notes ayant à la fois pop>0 et un prix. */
  gradesCovered: number
  /** Nombre de notes ayant pop>0 (qu'on ait le prix ou non). */
  gradesWithPop: number
  /** Recommandation honnête. */
  reco: GradedRecommendation
  /** Explication courte de la reco (pour l'UI). */
  recoReason: string
}

// ── Cœur du calcul ───────────────────────────────────────────────────────────

/** On ne donne une reco que si la couverture est suffisante. */
const MIN_COVERAGE = 0.5
const MIN_GRADES_COVERED = 3
/** Seuil de franche rentabilité : gain net > 25% du prix raw → GRADER net. */
const STRONG_MARGIN_RATIO = 0.25

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Calcule l'espérance de valeur d'une gradation PSA à partir de la distribution
 * de population réelle et des prix par grade.
 *
 * Logique :
 *   1. On ne retient que les notes ayant À LA FOIS une population > 0 ET un prix.
 *   2. On renormalise les probabilités sur la population COUVERTE :
 *      proba(note) = pop(note) / Σ pop(notes couvertes).
 *      → Une note sans prix ne fausse pas le calcul, mais on expose le
 *        `coverage` pour que l'utilisateur sache sur quelle base on est.
 *   3. EV brute = Σ(proba × prix).
 *   4. EV nette = brute − frais − raw.
 *   5. Reco nuancée selon EV nette et couverture.
 */
export function computeGradedEV(input: GradedEVInput): GradedEVResult {
  const { pop, prices, rawPrice } = input
  const gradingFee = input.gradingFee ?? DEFAULT_GRADING_FEE_EUR

  // Population par grade (re-sommée par sécurité ; on ne fait pas confiance
  // aveuglément à pop.total qui peut inclure des qualifiers).
  const popByGrade: Record<number, number> = {
    10: pop[10] || 0, 9: pop[9] || 0, 8: pop[8] || 0, 7: pop[7] || 0,
    6: pop[6] || 0, 5: pop[5] || 0, 4: pop[4] || 0, 3: pop[3] || 0,
    2: pop[2] || 0, 1: pop[1] || 0,
  }
  const popTotal = PSA_GRADES.reduce((s, g) => s + popByGrade[g], 0)

  // Gem rate = part de PSA 10 sur la population TOTALE (non renormalisée).
  // C'est le chiffre brut d'honnêteté.
  const gemRate = popTotal > 0 ? popByGrade[10] / popTotal : 0

  // Notes ayant une population > 0.
  const gradesWithPop = PSA_GRADES.filter((g) => popByGrade[g] > 0).length

  // Notes COUVERTES : pop > 0 ET prix fiable (> 0).
  const covered = PSA_GRADES.filter((g) => {
    const price = prices[g]
    return popByGrade[g] > 0 && price != null && price > 0
  })

  // Population couverte (pour renormaliser + coverage).
  const popCovered = covered.reduce((s, g) => s + popByGrade[g], 0)
  const coverage = popTotal > 0 ? popCovered / popTotal : 0

  // Lignes avec probas renormalisées sur la pop couverte.
  const rows: GradeRow[] = covered.map((g) => {
    const count = popByGrade[g]
    const proba = popCovered > 0 ? count / popCovered : 0
    const price = prices[g] as number
    return {
      grade: g,
      count,
      proba,
      price: round2(price),
      contribution: round2(proba * price),
      net: round2(price - gradingFee - rawPrice),
    }
  })

  // Proba que grader soit rentable = somme des probas des notes a gain net positif.
  const probaGain = rows.reduce((acc, r) => acc + (r.net > 0 ? r.proba : 0), 0)

  // EV brute = Σ contributions.
  const evBrute = round2(rows.reduce((s, r) => s + r.proba * r.price, 0))
  const evNette = round2(evBrute - gradingFee - rawPrice)

  // ── Recommandation honnête ──────────────────────────────────────────────────
  let reco: GradedRecommendation
  let recoReason: string

  if (coverage < MIN_COVERAGE || covered.length < MIN_GRADES_COVERED) {
    reco = 'INSUFFISANT'
    recoReason =
      'Données de prix gradés trop partielles pour une recommandation fiable.'
  } else if (evNette > rawPrice * STRONG_MARGIN_RATIO) {
    reco = 'GRADER'
    recoReason = `Gain espéré net d'environ ${round2(evNette)} € après frais et prix actuel.`
  } else if (evNette > 0) {
    reco = 'MARGINAL'
    recoReason = `Gain espéré faible (~${round2(evNette)} €). À évaluer selon ton goût du risque et l'attachement à la carte.`
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
  }
}

// ── Helpers de mapping (depuis les données brutes DB) ────────────────────────

/** Convertit un prix USD en EUR avec le taux du moteur. */
export function usdToEur(usd: number | null | undefined): number | null {
  if (usd == null) return null
  return round2(usd * USD_TO_EUR)
}

/**
 * Choisit la meilleure valeur de prix pour un grade depuis une ligne
 * price_matrix : median30d → avg30d → spot (robustesse aux extrêmes).
 * Convertit en EUR si la devise est USD. Retourne null si rien d'exploitable.
 */
export function pickGradePrice(row: {
  median30d?: number | null
  avg30d?: number | null
  spot?: number | null
  currency?: string | null
}): number | null {
  const raw = row.median30d ?? row.avg30d ?? row.spot ?? null
  if (raw == null) return null
  return (row.currency || 'USD') === 'USD' ? usdToEur(raw) : round2(raw)
}

/**
 * Mappe le print_id d'une carte vers la VARIÉTÉ PSA à utiliser dans
 * psa_pop_reports. Les variétés ont des gem rates très différents
 * (ex Base Set : Unlimited ~2,4% PSA10, Shadowless ~0,8%, 1st Ed ~3,6%),
 * donc le bon matching est essentiel pour l'honnêteté du calcul.
 *
 * Retourne une liste de variétés candidates (du plus spécifique au plus large)
 * à essayer dans l'ordre ; null = pas de contrainte (prendre la principale,
 * càd la ligne de plus grande population).
 */
export function varietyCandidatesForPrint(printId: string): string[] | null {
  const id = printId.toLowerCase()
  // 1st Edition : suffixe -1st, ou shadowless-ns (no symbol = 1st ed WOTC)
  if (id.includes('-1st') || id.includes('shadowless-ns')) {
    return ['1st Edition']
  }
  // Shadowless (sans 1st)
  if (id.includes('shadowless')) {
    return ['Shadowless']
  }
  // Unlimited / standard : variété principale (souvent null/"Base Set …").
  return null
}
