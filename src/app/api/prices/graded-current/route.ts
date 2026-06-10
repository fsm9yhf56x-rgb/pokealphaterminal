/**
 * GET /api/prices/graded-current
 * Prix ACTUELS (raw par condition + gradé) depuis graded_prices_ppt.
 * Source: colonnes prices_by_condition (raw TCGplayer) et grades (eBay sold, smartPrice).
 * Devise convertie USD -> EUR.
 */
import { NextResponse } from 'next/server'
import { requirePlan } from '@/lib/plan'
import { neon } from '@neondatabase/serverless'

// Gate par plan => pas de cache ISR (une reponse cachee servirait le Premium aux Free)
export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)

const USD_TO_EUR = 0.92

const CONDITION_ORDER: { key: string; label: string }[] = [
  { key: 'NM', label: 'Near Mint' },
  { key: 'LP', label: 'Lightly Played' },
  { key: 'MP', label: 'Moderately Played' },
  { key: 'HP', label: 'Heavily Played' },
  { key: 'DMG', label: 'Damaged' },
]

const COMPANY_PREFIXES = ['psa', 'bgs', 'cgc', 'sgc', 'ace', 'tag', 'cca', 'pca', 'ccc'] as const
const COMPANY_LABEL: Record<string, string> = {
  psa: 'PSA', bgs: 'BGS', cgc: 'CGC', sgc: 'SGC',
  ace: 'ACE', tag: 'TAG', cca: 'CCA', pca: 'PCA', ccc: 'CCC',
}
function parseGradeCode(code: string): { company: string; grade: string } | null {
  const lc = code.toLowerCase()
  for (const p of COMPANY_PREFIXES) {
    if (lc.startsWith(p)) {
      const grade = lc.slice(p.length)
      if (grade) return { company: COMPANY_LABEL[p], grade }
    }
  }
  return null
}

function numberVariants(localId: string): string[] {
  const raw = String(localId).replace(/\D/g, '').replace(/^0+/, '') || '0'
  return [raw, raw.padStart(2, '0'), raw.padStart(3, '0')]
    .filter((v, i, a) => a.indexOf(v) === i)
}

const num = (x: unknown): number | null => {
  if (x == null) return null
  const n = Number(x)
  return isFinite(n) ? n : null
}
const toEur = (usd: number | null): number | null =>
  usd == null ? null : Math.round(usd * USD_TO_EUR * 100) / 100

export async function GET(req: Request) {
  const gate = await requirePlan('premium')
  if (!gate.ok) return gate.res

  try {
    const { searchParams } = new URL(req.url)
    const tcgCardId = searchParams.get('tcg_card_id')
    let setSlug = searchParams.get('set_slug')
    const cardNumber = searchParams.get('card_number')
    const isJp = !!(tcgCardId && /^(jp|ja)-/.test(tcgCardId)) || !!(setSlug && /^jp-/.test(setSlug))

    let resolvedSetName: string | null = null
    let localIdForNumber: string | null = null
    let edition: 'unlimited' | 'shadowless' | '1st' = 'unlimited'

    // ── Branche JP: id = jp-{tcgPlayerId}, pas de slug dans l'id ──
    // On resout set_name + numero via tcg_cards (qui contient set_id JP + local_id).
    if (tcgCardId && /^(jp|ja)-/.test(tcgCardId)) {
      const jpCard = await sql`
        SELECT ts.name AS set_name, c.local_id
        FROM tcg_cards c
        JOIN tcg_sets ts ON ts.id = c.set_id
        WHERE c.id = ${tcgCardId} AND c.lang = 'JP'
        LIMIT 1
      `
      if (jpCard.length) {
        resolvedSetName = jpCard[0].set_name
        localIdForNumber = jpCard[0].local_id
      }
    } else if (tcgCardId) {
      const stripped = tcgCardId.replace(/^(en|fr|jp|ja)-/, '')
      const parts = stripped.split('-')
      localIdForNumber = parts[parts.length - 1]
      let setSlugFromId = parts.slice(0, -1).join('-')

      if (/-?shadowless(-ns)?$/.test(setSlugFromId)) {
        edition = 'shadowless'
        setSlugFromId = setSlugFromId.replace(/-?shadowless(-ns)?$/, '')
      } else if (/-?1st$/.test(setSlugFromId)) {
        edition = '1st'
        setSlugFromId = setSlugFromId.replace(/-?1st$/, '')
      }

      const exact = await sql`
        SELECT name FROM tcg_sets WHERE id = ${'en-' + setSlugFromId} OR id = ${setSlugFromId} LIMIT 1
      `
      if (exact.length) {
        resolvedSetName = exact[0].name
      } else {
        const fuzzy = await sql`
          SELECT name FROM tcg_sets
          WHERE id LIKE ${'%' + setSlugFromId.replace(/-/g, '%') + '%'}
          LIMIT 1
        `
        if (fuzzy.length) resolvedSetName = fuzzy[0].name
      }
    } else if (setSlug && cardNumber) {
      if (/-?shadowless(-ns)?$/.test(setSlug)) {
        edition = 'shadowless'
        setSlug = setSlug.replace(/-?shadowless(-ns)?$/, '')
      } else if (/-?1st$/.test(setSlug)) {
        edition = '1st'
        setSlug = setSlug.replace(/-?1st$/, '')
      }
      localIdForNumber = cardNumber
      const fuzzy = await sql`
        SELECT name FROM tcg_sets
        WHERE id LIKE ${'%' + setSlug.replace(/-/g, '%') + '%'}
        LIMIT 1
      `
      if (fuzzy.length) resolvedSetName = fuzzy[0].name
    } else {
      return NextResponse.json({ error: 'Provide tcg_card_id OR (set_slug + card_number)' }, { status: 400 })
    }

    if (!resolvedSetName || !localIdForNumber) {
      return NextResponse.json({ error: 'card not resolved', _debug: { resolvedSetName, localIdForNumber } }, { status: 404 })
    }

    const candidateSetNames: string[] = []
    if (edition === 'shadowless') {
      candidateSetNames.push(`${resolvedSetName} (Shadowless)`)
    }
    candidateSetNames.push(resolvedSetName)

    const patterns = numberVariants(localIdForNumber).map((v) => v + '/%')
    const [p1, p2, p3] = [patterns[0] || '___', patterns[1] || '___', patterns[2] || '___']

    let row: Record<string, unknown> | null = null
    let matchedSetName = resolvedSetName
    for (const sn of candidateSetNames) {
      const rows = await sql`
        SELECT set_name, card_name, card_number, prices_by_condition, grades, graded_updated_at
        FROM graded_prices_ppt
        WHERE set_name = ${sn}
          AND (card_number LIKE ${p1} OR card_number LIKE ${p2} OR card_number LIKE ${p3})
        ORDER BY language = ${isJp ? 'japanese' : 'english'} DESC
        LIMIT 1
      `
      if (rows.length) { row = rows[0]; matchedSetName = sn; break }
    }

    if (!row) {
      return NextResponse.json({
        currency: 'EUR', market: null, conditions: [], graded: [],
        _matched: null,
        _debug: { triedSetNames: candidateSetNames, patterns },
      })
    }

    const pbc = (typeof row.prices_by_condition === 'string'
      ? JSON.parse(row.prices_by_condition)
      : row.prices_by_condition) || {}

    const conditionsRaw = CONDITION_ORDER
      .map((c) => ({ code: c.key, label: c.label, priceUsd: num((pbc as Record<string, unknown>)[c.key]) }))
      .filter((c) => c.priceUsd != null)

    const nmPrice = conditionsRaw.find((c) => c.code === 'NM')?.priceUsd ?? null
    const conditions = conditionsRaw.map((c) => {
      let incoherent = false
      if (c.code !== 'NM' && nmPrice != null && c.priceUsd != null && c.priceUsd > nmPrice * 1.02) {
        incoherent = true
      }
      return { code: c.code, label: c.label, price: toEur(c.priceUsd), incoherent }
    })

    const market = toEur(nmPrice ?? (conditionsRaw[0]?.priceUsd ?? null))

    const gr = (typeof row.grades === 'string' ? JSON.parse(row.grades) : row.grades) || {}
    const graded: {
      company: string; grade: string; smartPrice: number | null; median: number | null
      count: number | null; confidence: string | null; trend: string | null
    }[] = []
    for (const [code, val] of Object.entries(gr as Record<string, Record<string, unknown>>)) {
      const parsed = parseGradeCode(code)
      if (!parsed) continue
      const sp = num(val.smartPrice)
      if (sp == null) continue
      graded.push({
        company: parsed.company,
        grade: parsed.grade,
        smartPrice: toEur(sp),
        median: toEur(num(val.median)),
        count: num(val.count),
        confidence: typeof val.confidence === 'string' ? val.confidence : null,
        trend: typeof val.marketTrend === 'string' ? val.marketTrend : null,
      })
    }
    const companyRank = (c: string) => (c === 'PSA' ? 0 : c === 'CGC' ? 1 : c === 'BGS' ? 2 : 3)
    graded.sort((a, b) => {
      const cr = companyRank(a.company) - companyRank(b.company)
      if (cr !== 0) return cr
      return parseFloat(b.grade) - parseFloat(a.grade)
    })

    return NextResponse.json({
      currency: 'EUR',
      market,
      conditions,
      graded,
      gradedUpdatedAt: row.graded_updated_at ?? null,
      _matched: {
        set_name: matchedSetName,
        card_number: row.card_number,
        card_name: row.card_name,
        edition,
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: 'internal', message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
