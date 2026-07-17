/**
 * Prix d'une carte GRADEE — LA regle, ecrite une fois.
 *
 * Fonction PURE (zero import, zero DB) : l'appelant charge le jsonb
 * `graded_prices_ppt.grades` et le taux de change, la regle decide.
 * Importable par : pricing immediat (db/query), cron portfolio-prices,
 * routes graded, et demain l'API B2B. Meme contrat que plan/resolve.ts.
 *
 * PRINCIPE KODO : un prix affiche est un prix defendable. En cas de doute,
 * NULL — l'UI montre "—" avec le badge de grade, JAMAIS un rabattement
 * silencieux sur le raw (c'est le mensonge qu'on vient de payer : une
 * PSA 9 a ~250-500 EUR affichee 74 EUR).
 *
 * LES GARDES (chacune a une victime reelle derriere elle) :
 *   G1  median, jamais smartPrice — smartPrice psa9=85$ quand psa5=124$
 *       et que le marche vend 230-600$ : statistique prouvee non fiable.
 *   G2  count >= MIN_SALES — 1 vente n'est pas un marche (ace4: n=1).
 *   G3  monotonie — si la note vaut moins qu'une note INFERIEURE fiable de
 *       la meme societe (marge MONO_TOLERANCE), la donnee est suspecte
 *       (melange de variantes, faux positifs de matching) -> null.
 *       C'est la garde qui aurait bloque le 74 EUR.
 *   G4  demi-grades normalises ("9.5" -> "9_5"), societe inconnue -> null.
 */

export interface GradeStat {
  median?: number | null
  count?: number | null
  confidence?: string | null
  // smartPrice, average, min, max... presents dans le jsonb mais IGNORES.
}

export type PptGrades = Record<string, GradeStat | undefined>

/** Societes couvertes par PPT (marche US/mondial). PCA/CCC = marche FR,
 *  servies par cardmarket_fr — PAS par ce module. */
const PPT_COMPANIES = new Set(['psa', 'bgs', 'cgc', 'sgc', 'ace', 'tag'])

const MIN_SALES = 3
/** Une note peut valoir un peu moins qu'une note inferieure (bruit de
 *  marche, fenetres temporelles differentes) : tolerance 15%. Au-dela,
 *  c'est structurel -> donnee rejetee. */
const MONO_TOLERANCE = 0.85

/** "PSA" + "9.5" -> "psa9_5" (cle du jsonb PPT). Null si non normalisable. */
export function pptGradeKey(company: string | null | undefined, grade: string | number | null | undefined): string | null {
  if (!company || grade == null) return null
  const co = String(company).trim().toLowerCase()
  if (!PPT_COMPANIES.has(co)) return null
  const g = String(grade).trim().replace(',', '.')
  const num = Number(g)
  if (!Number.isFinite(num) || num < 1 || num > 10) return null
  const key = Number.isInteger(num) ? String(num) : String(num).replace('.', '_')
  return co + key
}

function usableMedian(s: GradeStat | undefined): number | null {
  const m = s?.median
  const n = s?.count ?? 0
  if (m == null || !(m > 0)) return null
  if (n < MIN_SALES) return null // G2
  return m
}

/**
 * Prix USD defendable pour (company, grade) dans un jsonb PPT — ou null.
 * L'appelant convertit en EUR avec SON taux (meme fx que le raw us_nm_fx,
 * jamais un taux code en dur ici).
 */
export function gradedPriceUsd(
  grades: PptGrades | null | undefined,
  company: string | null | undefined,
  grade: string | number | null | undefined,
): number | null {
  if (!grades) return null
  const key = pptGradeKey(company, grade) // G4
  if (!key) return null

  const price = usableMedian(grades[key]) // G1 + G2
  if (price == null) return null

  // G3 — monotonie : compare a TOUTES les notes strictement inferieures
  // FIABLES de la meme societe. Si l'une d'elles vaut nettement plus,
  // la donnee de notre note est suspecte.
  const co = String(company).trim().toLowerCase()
  const myGrade = Number(String(grade).trim().replace(',', '.'))
  for (const [k, stat] of Object.entries(grades)) {
    if (!k.startsWith(co)) continue
    const rest = k.slice(co.length).replace('_', '.')
    const g = Number(rest)
    if (!Number.isFinite(g) || g >= myGrade) continue
    const lower = usableMedian(stat)
    if (lower != null && price < lower * MONO_TOLERANCE) return null
  }

  return price
}

const CROSS_FLOOR = 0.3 // G5
const CROSS_MIN_GRADE = 7
const RAW_FLOOR = 0.7 // G6
const RAW_MIN_GRADE = 9

interface UsableTier { tier: string; spot: number; saleCount: number; _grade?: number }

/**
 * Deplie un jsonb PPT en tiers publiables — miroir de
 * scripts/lib/graded-rule.js usableGradeTiers. Une note rejetee n'est pas
 * publiee : son absence devient graded_no_data en aval ("—" affiche).
 *
 * G5 — plancher INTER-societes : G3 est intra-societe, une note orpheline
 * n'a aucune ancre (SGC 10 a 25$ passait avec PSA 7 a 460$). Une note >= 7
 * valant moins de 30% du meilleur prix d'une note strictement inferieure
 * (toutes societes) est absurde par construction.
 */
export function usableGradeTiers(grades: PptGrades | null | undefined, rawUsd?: number | null): Array<{ tier: string; spot: number; saleCount: number }> {
  if (!grades) return []
  const out: UsableTier[] = []
  for (const key of Object.keys(grades)) {
    const m = key.match(/^([a-z]+)(\d+(?:_\d)?)$/)
    if (!m) continue
    const company = m[1]!
    const grade = m[2]!.replace('_', '.')
    const price = gradedPriceUsd(grades, company, grade)
    if (price == null) continue
    out.push({
      tier: company.toUpperCase() + '_' + m[2]!.toUpperCase(),
      spot: price,
      saleCount: grades[key]?.count ?? 0,
      _grade: Number(grade),
    })
  }
  const kept = out.filter((t) => {
    // G6 — plancher raw : note >= 9 sous 70% du raw NM = absurde -> rejet.
    if ((t._grade ?? 0) >= RAW_MIN_GRADE && rawUsd != null && rawUsd > 0 && t.spot < rawUsd * RAW_FLOOR) return false
    if ((t._grade ?? 0) < CROSS_MIN_GRADE) return true
    let bestLower = 0
    for (const o of out) if ((o._grade ?? 0) < (t._grade ?? 0) && o.spot > bestLower) bestLower = o.spot
    return bestLower === 0 || t.spot >= bestLower * CROSS_FLOOR
  })
  for (const t of kept) delete t._grade
  return kept
}
