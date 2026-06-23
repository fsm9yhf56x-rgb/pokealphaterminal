/**
 * /api/graded-ev?print_id=xxx&lang=EN
 *
 * Moteur Graded.ev — "Faut-il grader cette carte ?"
 * Calcule l'esperance de valeur honnête d'une gradation PSA :
 *   - distribution reelle des notes (psa_pop_reports, la bonne variete)
 *   - prix par grade (price_matrix, tier PSA_X, meilleure source par volume)
 *   - prix raw de reference (price_signals.fair_value_eur)
 *   - EV nette = Σ(proba × prix) − frais − raw
 *
 * Gating : Premium = resultat complet. Free/Pro = teaser locke (gemRate +
 * evNette masquee, juste l'accroche), comme /api/pop-report.
 *
 * Aucun fallback synthetique. Si donnees trop partielles → reco INSUFFISANT.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { neon } from '@neondatabase/serverless'
import {
  computeGradedEV,
  pickGradePrice,
  varietyCandidatesForPrint,
  DEFAULT_GRADING_FEE_EUR,
  type PopByGrade,
  type PriceByGrade,
} from '@/lib/graded-ev'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
const PLAN_LEVEL: Record<string, number> = { free: 0, pro: 1, premium: 2 }

/** Transforme une ligne psa_pop_reports en PopByGrade. */
function rowToPop(r: Record<string, unknown>): PopByGrade {
  const n = (v: unknown): number => {
    const x = Number(v ?? 0)
    return Number.isFinite(x) ? x : 0
  }
  return {
    10: n(r.pop_10),
    9: n(r.pop_9),
    8: n(r.pop_8),
    7: n(r.pop_7),
    6: n(r.pop_6),
    5: n(r.pop_5),
    4: n(r.pop_4),
    3: n(r.pop_3),
    2: n(r.pop_2),
    1: n(r.pop_1),
    total: n(r.pop_total),
  }
}

export async function GET(req: NextRequest) {
  // On NE bloque PAS : on lit le plan pour decider resultat complet (premium)
  // ou teaser locke (free/pro).
  const user = await getCurrentUserWithProfile()
  const isPremium = !!user && (PLAN_LEVEL[user.plan] ?? 0) >= PLAN_LEVEL['premium']

  const printId = req.nextUrl.searchParams.get('print_id')
  const lang = (req.nextUrl.searchParams.get('lang') || 'EN').toUpperCase()
  if (!printId) {
    return NextResponse.json({ error: 'print_id required' }, { status: 400 })
  }

  // card_ref dans psa_pop_reports est non-prefixe (ex 'base1-1').
  // print_id peut arriver prefixe (en-base1-1) ou non. On strip le prefixe langue.
  const printIdNoLang = printId.replace(/^(en|fr|jp|aopkm)-/i, '')
  // card_ref pour psa_pop_reports = BASE (edition dans variety). Sans ca,
  // les 1st Ed / Shadowless (print_id suffixe) ne matchent jamais la pop.
  const cardRef = printIdNoLang
    .replace(/-shadowless-ns(?=-|$)/i, '')
    .replace(/-shadowless(?=-|$)/i, '')
    .replace(/-1st(?=-|$)/i, '')

  try {
    // ─── 1. Distribution PSA (la bonne variete selon le print) ────────────────
    const wantedVarieties = varietyCandidatesForPrint(printId)

    const popRows = await sql`
      SELECT variety, pop_1, pop_2, pop_3, pop_4, pop_5, pop_6,
             pop_7, pop_8, pop_9, pop_10, pop_total
      FROM psa_pop_reports
      WHERE card_ref = ${cardRef}
      ORDER BY pop_total DESC NULLS LAST
    ` as Array<Record<string, unknown>>

    if (popRows.length === 0) {
      return NextResponse.json({
        available: false,
        reason: 'no_pop_data',
        message: 'Aucune donnée de population PSA pour cette carte.',
      })
    }

    // Selection de la variete :
    //  - si le print impose une variete (1st Edition / Shadowless) → on la cherche
    //  - sinon → la ligne de plus grande population (la principale = Unlimited)
    const want1st = !!wantedVarieties && wantedVarieties.some((w) => /1st/i.test(w))
    const wantShadowless = !!wantedVarieties && wantedVarieties.some((w) => /shadowless/i.test(w))
    const vOf = (r: Record<string, unknown>) => String(r.variety || '').toLowerCase()
    let popRow: Record<string, unknown> | undefined
    if (want1st) {
      popRow = popRows.find((r) => /1st|first/.test(vOf(r)))
    } else if (wantShadowless) {
      popRow = popRows.find((r) => vOf(r).includes('shadowless') && !/1st|first/.test(vOf(r)))
    }
    // Fallback : variete principale (plus grande pop). Pour l'Unlimited, on
    // fusionne aussi "Base Set 1999-2000" si c'est la principale — mais la ligne
    // de plus gros pop_total fait deja le bon choix dans la quasi-totalite des cas.
    if (!popRow) {
      // Pour les prints "standard" (sans variete imposee), on ecarte les lignes
      // explicitement Shadowless / 1st Edition pour ne pas melanger les gem rates.
      const principal = popRows.find((r) => {
        const v = String(r.variety || '').toLowerCase()
        return !v.includes('shadowless') && !v.includes('1st')
      })
      popRow = principal ?? popRows[0]
    }

    const pop = rowToPop(popRow)
    const variety = (popRow.variety as string) || null
    const vSel = String(variety || '').toLowerCase()
    const edition: 'first' | 'shadowless' | 'unlimited' =
      /1st|first/.test(vSel) ? 'first' : vSel.includes('shadowless') ? 'shadowless' : 'unlimited'
    const editionsInPop = new Set(
      popRows.map((r) => {
        const v = String(r.variety || '').toLowerCase()
        return /1st|first/.test(v) ? 'first' : v.includes('shadowless') ? 'shadowless' : 'unlimited'
      }),
    )
    const multiEdition = editionsInPop.size > 1
    const variantMatches = (variant: string): boolean => {
      if (!multiEdition) return true
      const x = (variant || '').toLowerCase()
      if (edition === 'first') return /1st|first/.test(x)
      if (edition === 'shadowless') return x.includes('shadowless')
      return x.includes('unlimited')
    }

    // ─── 2. Prix par grade (price_matrix, tier PSA_X) ─────────────────────────
    // On garde, pour chaque grade, la source au plus gros volume de ventes.
    const priceRows = await sql`
      SELECT tier, source, variant, spot, avg30d, median30d, sale_count, currency
      FROM price_matrix
      WHERE print_id = ${printIdNoLang} AND is_asking = false AND tier LIKE 'PSA%'
      ORDER BY tier, sale_count DESC NULLS LAST
    ` as Array<Record<string, unknown>>

    const prices: PriceByGrade = {}
    const bestByGrade: Record<number, { sale_count: number }> = {}
    for (const r of priceRows) {
      const tier = String(r.tier || '')
      const m = tier.match(/^PSA_(\d+)$/) // on ignore les demi-grades (PSA_8_5)
      if (!m) continue
      const grade = Number(m[1])
      if (grade < 1 || grade > 10) continue
        if (!variantMatches(String(r.variant || ''))) continue
        if (Number(r.sale_count ?? 0) < 2) continue
      const saleCount = Number(r.sale_count ?? 0)
      // Garder la source au plus gros volume pour ce grade.
      if (bestByGrade[grade] && saleCount <= bestByGrade[grade].sale_count) continue
      const price = pickGradePrice({
        median30d: r.median30d as number | null,
        avg30d: r.avg30d as number | null,
        spot: r.spot as number | null,
        currency: r.currency as string | null,
      })
      if (price != null && price > 0) {
        prices[grade] = price
        bestByGrade[grade] = { sale_count: saleCount }
      }
    }

      // Garde-fou monotonie: une note basse dont le prix depasse 1.3x la note
      // superieure la plus proche encore retenue = agregat eBay aberrant -> retiree.
      {
        const MONO_TOL = 1.3
        const kept = Object.keys(prices).map(Number).sort((a, b) => a - b)
        for (let i = 0; i < kept.length; i++) {
          const g = kept[i]
          const pg = prices[g]
          if (pg == null) continue
          const higher = kept.slice(i + 1).find((h) => prices[h] != null)
          if (higher != null && (pg as number) > (prices[higher] as number) * MONO_TOL) {
            delete prices[g]
            delete bestByGrade[g]
          }
        }
      }

    // ─── 3. Prix raw de reference (price_signals.fair_value_eur) ───────────────
    const sigRows = await sql`
      SELECT fair_value_eur, cote_fr_eur, fair_value_method
      FROM price_signals
      WHERE print_id = ${printIdNoLang}
      ORDER BY (lang = ${lang}) DESC, computed_at DESC NULLS LAST
      LIMIT 1
    ` as Array<Record<string, unknown>>

    const rawEur = sigRows.length
      ? Number(
          (lang === 'FR' && sigRows[0].cote_fr_eur != null
            ? sigRows[0].cote_fr_eur
            : sigRows[0].fair_value_eur) ?? 0,
        )
      : 0

    if (!rawEur || rawEur <= 0) {
      return NextResponse.json({
        available: false,
        reason: 'no_raw_price',
        message: 'Prix de référence (carte non gradée) indisponible.',
      })
    }

    // ─── 4. Calcul ────────────────────────────────────────────────────────────
    const result = computeGradedEV({
      pop,
      prices,
      rawPrice: rawEur,
      gradingFee: DEFAULT_GRADING_FEE_EUR,
    })

    // ─── 5. Gating : Premium = complet, free/pro = teaser ─────────────────────
    if (!isPremium) {
      return NextResponse.json({
        available: true,
        locked: true,
        // Accroche honnête sans devoiler le calcul : on dit qu'il existe et
        // combien d'exemplaires PSA, mais pas l'EV ni la reco.
        gradesWithData: result.gradesCovered,
        popTotal: pop.total,
        variety,
        plan: user?.plan ?? 'free',
      })
    }

    return NextResponse.json({
      available: true,
      locked: false,
      variety,
      gradingFee: result.gradingFee,
      rawPrice: result.rawPrice,
      gemRate: result.gemRate,
      probaGain: result.probaGain,
      coverage: result.coverage,
      gradesCovered: result.gradesCovered,
      gradesWithPop: result.gradesWithPop,
      evBrute: result.evBrute,
      evNette: result.evNette,
      reco: result.reco,
      recoReason: result.recoReason,
      rows: result.rows,
      popTotal: pop.total,
    })
  } catch (err) {
    console.error('[graded-ev] error', err)
    return NextResponse.json(
      { error: 'internal_error' },
      { status: 500 },
    )
  }
}
