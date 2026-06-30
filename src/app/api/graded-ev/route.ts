/**
 * /api/graded-ev?print_id=xxx&lang=EN
 *
 * Moteur Graded.ev — "Faut-il grader cette carte ?"
 * PSA (moteur historique, graded-ev.ts) = inchangé : reco + EV complète.
 * CCC (additif, graded-ev-multi.ts) = pop FR réelle + gem rate, EV seulement
 * quand la couverture prix le permet. Sociétés FR que PSA ne couvre pas.
 *
 * Gating : Premium = résultat complet. Free/Pro = teaser locké.
 * Aucun fallback synthétique. Données partielles → INSUFFISANT, jamais d'invention.
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
import {
  computeGradedEVByCompany,
  type GradeBucket,
  type GradingCompany,
} from '@/lib/graded-ev-multi'

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
  const user = await getCurrentUserWithProfile()
  const isPremium = !!user && (PLAN_LEVEL[user.plan] ?? 0) >= PLAN_LEVEL['premium']

  const printId = req.nextUrl.searchParams.get('print_id')
  const lang = (req.nextUrl.searchParams.get('lang') || 'EN').toUpperCase()
  if (!printId) {
    return NextResponse.json({ error: 'print_id required' }, { status: 400 })
  }

  const printIdNoLang = printId.replace(/^(en|fr|jp|aopkm)-/i, '')
  const cardRef = printIdNoLang
    .replace(/-shadowless-ns(?=-|$)/i, '')
    .replace(/-shadowless(?=-|$)/i, '')
    .replace(/-1st(?=-|$)/i, '')

  try {
    // ═══════════════════════════════════════════════════════════════════════
    // PSA — moteur historique, INCHANGÉ
    // ═══════════════════════════════════════════════════════════════════════
    const wantedVarieties = varietyCandidatesForPrint(printId)

    const popRowsAll = await sql`
      SELECT variety, pop_1, pop_2, pop_3, pop_4, pop_5, pop_6,
             pop_7, pop_8, pop_9, pop_10, pop_total
      FROM psa_pop_reports
      WHERE card_ref = ${cardRef}
      ORDER BY pop_total DESC NULLS LAST
    ` as Array<Record<string, unknown>>
    // RÈGLE LANGUE (stricte) : une fiche n'affiche QUE le gradé de SA langue.
    // PSA encode la langue dans `variety` ("French"/"German"/"Spanish"/"Italian"),
    // le JP est porté par un card_ref prefixe "jp-" (ou variety japonaise).
    // FR -> variety "french" uniquement ; JP -> cartes japonaises ; EN -> tout sauf langues etrangeres + JP.
    const isJpRef = String(cardRef || '').toLowerCase().startsWith('jp-')
    const FOREIGN = /(french|german|spanish|italian|portuguese|korean|chinese)/i
    const popRows = popRowsAll.filter((r) => {
      const v = String(r.variety || '').toLowerCase()
      if (lang === 'FR') return /french/i.test(v)
      if (lang === 'JP') return isJpRef || /japanese/i.test(v)
      return !FOREIGN.test(v) && !isJpRef && !/japanese/i.test(v)
    })

    // Édition demandée par le print (sert PSA ET CCC).
    const want1st = !!wantedVarieties && wantedVarieties.some((w) => /1st/i.test(w))
    const wantShadowless = !!wantedVarieties && wantedVarieties.some((w) => /shadowless/i.test(w))

    // CCC se calcule même si PSA n'a pas de pop : on ne court-circuite plus ici.
    let psaResult: Record<string, unknown> | null = null
    let psaPopTotal = 0
    let psaVariety: string | null = null

    if (popRows.length > 0) {
      const vOf = (r: Record<string, unknown>) => String(r.variety || '').toLowerCase()
      let popRow: Record<string, unknown> | undefined
      if (want1st) {
        popRow = popRows.find((r) => /1st|first/.test(vOf(r)))
      } else if (wantShadowless) {
        popRow = popRows.find((r) => vOf(r).includes('shadowless') && !/1st|first/.test(vOf(r)))
      }
      if (!popRow) {
        const principal = popRows.find((r) => {
          const v = String(r.variety || '').toLowerCase()
          return !v.includes('shadowless') && !v.includes('1st')
        })
        popRow = principal ?? popRows[0]
      }

      const pop = rowToPop(popRow)
      psaPopTotal = pop.total
      const variety = (popRow.variety as string) || null
      psaVariety = variety
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
        if (edition === 'shadowless') return x.includes('shadowless') || x.includes('unlimited')
        return x.includes('unlimited')
      }

      // RÈGLE LANGUE (prix) : price_matrix n'encode PAS la langue du slab vendu
      // (variant = edition seulement). Sur une fiche FR on ne peut donc PAS garantir
      // que ces ventes PSA sont des cartes FR (sources US/EU toutes langues confondues)
      // -> on n'affiche AUCUN prix PSA en FR. La pop PSA-French reste (rareté FR info),
      // l'EV PSA ne se calcule pas, et CCC (explicitement FR) prend le relais plus bas.
      const priceRows = (lang === 'FR' ? [] : await sql`
        SELECT tier, source, variant, spot, avg30d, median30d, sale_count, currency
        FROM price_matrix
        WHERE print_id = ${printIdNoLang} AND is_asking = false AND tier LIKE 'PSA%'
        ORDER BY tier, sale_count DESC NULLS LAST
      `) as Array<Record<string, unknown>>

      const prices: PriceByGrade = {}
      const bestByGrade: Record<number, { sale_count: number }> = {}
      for (const r of priceRows) {
        const tier = String(r.tier || '')
        const m = tier.match(/^PSA_(\d+)$/)
        if (!m) continue
        const grade = Number(m[1])
        if (grade < 1 || grade > 10) continue
        if (!variantMatches(String(r.variant || ''))) continue
        if (Number(r.sale_count ?? 0) < 2) continue
        const saleCount = Number(r.sale_count ?? 0)
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

      if (rawEur > 0) {
        const result = computeGradedEV({
          pop,
          prices,
          rawPrice: rawEur,
          gradingFee: DEFAULT_GRADING_FEE_EUR,
        })
        psaResult = {
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
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CCC — additif : pop FR réelle + gem rate, EV si couverture suffisante
    // ═══════════════════════════════════════════════════════════════════════
    // Édition pour CCC : '1st Edition' si le print l'impose, sinon Unlimited ('').
    const cccVariety = want1st ? '1st Edition' : ''
    // CCC = certificateur FRANCAIS : ne rien chercher hors d'une carte FR.
    // Empeche la collision de card_ref (me01-134 existe en EN et en FR) de
    // faire fuiter la pop CCC francaise sur les cartes anglaises/japonaises.
    const cccRows = (lang === 'FR') ? await sql`
      SELECT gp.tier, gp.grade_num, gp.label, gp.count, gp.pop_total,
             pm.spot AS price, pm.is_asking
      FROM grading_pop gp
      LEFT JOIN price_matrix pm
        ON pm.kodo_card_id = ${'fr-' + cardRef}
       AND pm.source = 'ebay_fr'
       AND pm.tier = gp.tier
      WHERE gp.company = 'CCC'
        AND gp.card_ref = ${cardRef}
        AND gp.lang = 'fr'
        AND gp.variety = ${cccVariety}
        AND gp.grade_num IS NOT NULL
      ORDER BY gp.grade_num DESC NULLS LAST
    ` as Array<Record<string, unknown>> : []

    let cccPayload: Record<string, unknown> | null = null
    if (cccRows.length > 0) {
      const cccPopTotal = cccRows.reduce((s, r) => s + Number(r.count ?? 0), 0)
      const buckets: GradeBucket[] = cccRows.map((r) => ({
        tier: String(r.tier),
        gradeNum: Number(r.grade_num),
        label: (r.label as string) || null,
        count: Number(r.count ?? 0),
        price: r.price != null ? Number(r.price) : null,
        basis: r.is_asking === false ? 'sale' : 'ask',
      }))

      // Raw FR pour l'EV (même source que PSA).
      const cccSig = await sql`
        SELECT fair_value_eur, cote_fr_eur
        FROM price_signals
        WHERE print_id = ${printIdNoLang}
        ORDER BY (lang = 'FR') DESC, computed_at DESC NULLS LAST
        LIMIT 1
      ` as Array<Record<string, unknown>>
      const cccRaw = cccSig.length
        ? Number((cccSig[0].cote_fr_eur ?? cccSig[0].fair_value_eur) ?? 0)
        : 0

      const { chosen } = computeGradedEVByCompany(buckets, cccRaw, 'fr', DEFAULT_GRADING_FEE_EUR)
      const pricedGrades = buckets.filter((b) => b.price != null && b.price > 0).length

      // Distribution toujours renvoyée (le réel qu'on a). EV seulement si exploitable.
      cccPayload = {
        company: 'CCC' as GradingCompany,
        variety: cccVariety || null,
        popTotal: cccPopTotal,
        gemRate: chosen?.gemRate ?? (cccPopTotal > 0
          ? buckets.filter((b) => b.gradeNum >= 10).reduce((s, b) => s + b.count, 0) / cccPopTotal
          : 0),
        pricedGrades,
        // Distribution brute par note (rareté FR — la vraie valeur CCC aujourd'hui).
        distribution: buckets.map((b) => ({
          tier: b.tier,
          grade: b.gradeNum,
          label: b.label,
          count: b.count,
          price: b.price,
          basis: b.basis,
        })),
        // EV uniquement si le moteur a pu calculer (couverture >= 50%, >= 3 notes).
        ev: chosen && chosen.reco !== 'INSUFFISANT'
          ? {
              reco: chosen.reco,
              recoReason: chosen.recoReason,
              evNette: chosen.evNette,
              evBrute: chosen.evBrute,
              rawPrice: chosen.rawPrice,
              gradingFee: chosen.gradingFee,
              probaGain: chosen.probaGain,
              coverage: chosen.coverage,
              hasAskBasis: chosen.hasAskBasis,
              rows: chosen.rows,
            }
          : null,
        // Raison de l'absence d'EV (transparence, pas un écran vide).
        evUnavailableReason: !chosen || chosen.reco === 'INSUFFISANT'
          ? (pricedGrades === 0
              ? 'Population CCC disponible, prix gradés CCC pas encore collectés pour cette carte.'
              : 'Prix CCC encore partiels (trop peu de notes valorisées pour une espérance fiable).')
          : null,
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Réponse + gating
    // ═══════════════════════════════════════════════════════════════════════
    const hasPsa = psaResult != null
    const hasCcc = cccPayload != null

    if (!hasPsa && !hasCcc) {
      return NextResponse.json({
        available: false,
        reason: 'no_data',
        message: 'Aucune donnée de gradation (PSA ou CCC) pour cette carte.',
      })
    }

    if (!isPremium) {
      // Teaser : on annonce ce qui existe sans dévoiler le calcul.
      return NextResponse.json({
        available: true,
        locked: true,
        gradesWithData: (psaResult?.gradesCovered as number) ?? 0,
        popTotal: psaPopTotal || ((cccPayload?.popTotal as number) ?? 0),
        variety: psaVariety ?? (cccPayload?.variety as string | null),
        companies: [...(hasPsa ? ['PSA'] : []), ...(hasCcc ? ['CCC'] : [])],
        plan: user?.plan ?? 'free',
      })
    }

    // Premium : PSA à plat (compat panel existant) + bloc ccc additif.
    return NextResponse.json({
      available: true,
      locked: false,
      ...(psaResult ?? {}),
      // Bloc société additif : le panel l'affiche en complément, PSA reste défaut.
      ccc: cccPayload,
    })
  } catch (err) {
    console.error('[graded-ev] error', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
