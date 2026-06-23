/**
 * /api/graded-ev/portfolio
 *
 * Tableau de bord Graded.ev : analyse TOUTES les cartes non gradees du portfolio
 * de l'utilisateur en une passe (lectures DB groupees, pas 1 requete par carte).
 *
 * Pour chaque carte : distribution PSA (bonne variete/edition) + prix par grade
 * (variant-matche, monotonie) + raw, passes dans computeGradedEV. Resultats tries
 * par gain espere net decroissant. Premium uniquement.
 *
 * Edition resolue depuis le print_id (k_card_id), pas depuis portfolio_cards.edition
 * qui est peu fiable. card_ref pop = base (sans marqueur d'edition).
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

type Edition = 'first' | 'shadowless' | 'unlimited'

const stripLang = (id: string) => id.replace(/^(en|fr|jp|aopkm)-/i, '')

/** card_ref dans psa_pop_reports = base, sans marqueur d'edition. */
function baseCardRef(printId: string): string {
  return stripLang(printId)
    .replace(/-shadowless-ns(?=-|$)/i, '')
    .replace(/-shadowless(?=-|$)/i, '')
    .replace(/-1st(?=-|$)/i, '')
}

function editionOf(printId: string): Edition {
  const want = varietyCandidatesForPrint(printId)
  if (want && want.some((w) => /1st/i.test(w))) return 'first'
  if (want && want.some((w) => /shadowless/i.test(w))) return 'shadowless'
  return 'unlimited'
}

function editionOfVariety(variety: string): Edition {
  const v = (variety || '').toLowerCase()
  if (/1st|first/.test(v)) return 'first'
  if (v.includes('shadowless')) return 'shadowless'
  return 'unlimited'
}

function rowToPop(r: Record<string, unknown>): PopByGrade {
  const n = (v: unknown) => {
    const x = Number(v ?? 0)
    return Number.isFinite(x) ? x : 0
  }
  return {
    10: n(r.pop_10), 9: n(r.pop_9), 8: n(r.pop_8), 7: n(r.pop_7), 6: n(r.pop_6),
    5: n(r.pop_5), 4: n(r.pop_4), 3: n(r.pop_3), 2: n(r.pop_2), 1: n(r.pop_1),
    total: n(r.pop_total),
  }
}

export async function GET(_req: NextRequest) {
  const user = await getCurrentUserWithProfile()
  if (!user) return NextResponse.json({ locked: true, reason: 'auth' })
  const isPremium = (PLAN_LEVEL[user.plan] ?? 0) >= PLAN_LEVEL['premium']
  if (!isPremium) return NextResponse.json({ locked: true, plan: user.plan })

  try {
    const cards = (await sql`
      SELECT id, name, set_name, set_id, card_number, lang, k_card_id, image_url, current_price
      FROM portfolio_cards
      WHERE user_id = ${user.id} AND graded = false AND qty > 0 AND k_card_id IS NOT NULL
    `) as Array<Record<string, any>>

    if (!cards.length) {
      return NextResponse.json({ locked: false, count: 0, skipped: 0, items: [] })
    }

    // Dedup par print_id (un user peut avoir plusieurs exemplaires de la meme carte).
    const seen = new Set<string>()
    const items = [] as Array<{ card: Record<string, any>; printId: string; baseRef: string; edition: Edition }>
    for (const c of cards) {
      const printId = stripLang(String(c.k_card_id))
      if (seen.has(printId)) continue
      seen.add(printId)
      items.push({ card: c, printId, baseRef: baseCardRef(String(c.k_card_id)), edition: editionOf(String(c.k_card_id)) })
    }

    const printIds = [...new Set(items.map((i) => i.printId))]
    const baseRefs = [...new Set(items.map((i) => i.baseRef))]

    const popRows = (await sql`
      SELECT card_ref, variety, pop_1, pop_2, pop_3, pop_4, pop_5, pop_6, pop_7, pop_8, pop_9, pop_10, pop_total
      FROM psa_pop_reports WHERE card_ref = ANY(${baseRefs as any})
    `) as Array<Record<string, any>>
    const matrixRows = (await sql`
      SELECT print_id, tier, variant, spot, currency, sale_count
      FROM price_matrix WHERE print_id = ANY(${printIds as any}) AND is_asking = false AND tier LIKE 'PSA%'
    `) as Array<Record<string, any>>
    const sigRows = (await sql`
      SELECT print_id, fair_value_eur, cote_fr_eur, lang
      FROM price_signals WHERE print_id = ANY(${printIds as any})
    `) as Array<Record<string, any>>
    const fxRow = (await sql`
      SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1
    `) as Array<Record<string, any>>
    const usdEur = Number(fxRow[0]?.rate || 0.92)

    const popByRef = new Map<string, Array<Record<string, any>>>()
    for (const r of popRows) { const a = popByRef.get(r.card_ref) ?? []; a.push(r); popByRef.set(r.card_ref, a) }
    const mxByPrint = new Map<string, Array<Record<string, any>>>()
    for (const r of matrixRows) { const a = mxByPrint.get(r.print_id) ?? []; a.push(r); mxByPrint.set(r.print_id, a) }
    const sigByPrint = new Map<string, Array<Record<string, any>>>()
    for (const r of sigRows) { const a = sigByPrint.get(r.print_id) ?? []; a.push(r); sigByPrint.set(r.print_id, a) }

    const results: Array<Record<string, any>> = []
    let skipped = 0

    for (const it of items) {
      const pops = popByRef.get(it.baseRef) || []
      if (!pops.length) { skipped++; continue }

      // Variete = edition de la carte (par inclusion), sinon principale (plus gros pop).
      let popRow: Record<string, any> | undefined
      if (it.edition === 'first') popRow = pops.find((r) => editionOfVariety(String(r.variety || '')) === 'first')
      else if (it.edition === 'shadowless') popRow = pops.find((r) => editionOfVariety(String(r.variety || '')) === 'shadowless')
      if (!popRow) {
        popRow = pops.find((r) => editionOfVariety(String(r.variety || '')) === 'unlimited')
          ?? [...pops].sort((a, b) => (Number(b.pop_total) || 0) - (Number(a.pop_total) || 0))[0]
      }
      const pop = rowToPop(popRow)

      // Prix par grade, variant-matche a l'edition si la carte a plusieurs editions.
      const editionsInPop = new Set(pops.map((r) => editionOfVariety(String(r.variety || ''))))
      const multiEdition = editionsInPop.size > 1
      const variantMatches = (variant: string): boolean => {
        if (!multiEdition) return true
        const x = (variant || '').toLowerCase()
        if (it.edition === 'first') return /1st|first/.test(x)
        if (it.edition === 'shadowless') return x.includes('shadowless') || x.includes('unlimited')
        return x.includes('unlimited')
      }

      const mx = mxByPrint.get(it.printId) || []
      const prices: PriceByGrade = {}
      const best: Record<number, { n: number }> = {}
      for (const r of mx) {
        const m = String(r.tier || '').match(/^PSA_(\d+)$/)
        if (!m) continue
        const g = Number(m[1])
        if (g < 1 || g > 10) continue
        if (!variantMatches(String(r.variant || ''))) continue
        const n = Number(r.sale_count ?? 0)
        if (n < 2) continue
        if (best[g] && n <= best[g].n) continue
        const p = pickGradePrice({ spot: r.spot as number | null, currency: r.currency as string | null, median30d: null, avg30d: null })
        if (p != null && p > 0) { prices[g] = p; best[g] = { n } }
      }
      // Monotonie : note basse > 1.3x la note superieure la plus proche = aberrant.
      const kept = Object.keys(prices).map(Number).sort((a, b) => a - b)
      for (let i = 0; i < kept.length; i++) {
        const g = kept[i]
        if (prices[g] == null) continue
        const h = kept.slice(i + 1).find((x) => prices[x] != null)
        if (h != null && (prices[g] as number) > (prices[h] as number) * 1.3) delete prices[g]
      }
      if (!Object.keys(prices).length) { skipped++; continue }

      // Raw (price_signals, langue-aware) ; fallback current_price du portfolio.
      const sigs = sigByPrint.get(it.printId) || []
      const sig = sigs.find((s) => String(s.lang).toUpperCase() === String(it.card.lang).toUpperCase()) || sigs[0]
      let raw = 0
      if (sig) {
        raw = Number(((String(it.card.lang).toUpperCase() === 'FR' && sig.cote_fr_eur != null) ? sig.cote_fr_eur : sig.fair_value_eur) ?? 0)
      }
      if ((!raw || raw <= 0) && it.card.current_price != null) raw = Number(it.card.current_price)
      if (!raw || raw <= 0) { skipped++; continue }

      const r = computeGradedEV({ pop, prices, rawPrice: raw, gradingFee: DEFAULT_GRADING_FEE_EUR })
      if (r.reco === 'INSUFFISANT') { skipped++; continue }

      results.push({
        id: it.card.id,
        cardId: it.card.k_card_id,
        name: it.card.name,
        setName: it.card.set_name,
        image: it.card.image_url,
        lang: it.card.lang,
        edition: popRow.variety || null,
        reco: r.reco,
        evNette: r.evNette,
        probaGain: r.probaGain,
        gemRate: r.gemRate,
        rawPrice: r.rawPrice,
        popTotal: pop.total,
      })
    }

    results.sort((a, b) => b.evNette - a.evNette)
    return NextResponse.json({ locked: false, count: results.length, skipped, items: results })
  } catch (e: any) {
    console.error('[graded-ev/portfolio] error', e)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
