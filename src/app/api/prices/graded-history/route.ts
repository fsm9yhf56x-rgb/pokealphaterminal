/**
 * GET /api/prices/graded-history
 *
 * Historique gradés + raw multi-condition, depuis graded_prices_ppt
 * (colonnes JSONB grades_history et raw_history pre-calculees par PPT).
 *
 * Query params (memes conventions que /api/prices/graded) :
 *   - set_slug + card_number   (ex: "base-set" + "4")
 *   - OU tcg_card_id           (ex: "en-base1-4") -> resolu via tcg_cards
 *   - mode: 'graded' | 'raw'   (default 'graded')
 *
 * Reponse:
 *   {
 *     currency: 'USD',
 *     dimensions: {
 *       companies: ['PSA','BGS',...],            // mode graded
 *       grades: { PSA: ['10','9',...], ... },    // mode graded
 *       conditions: ['Near Mint',...],           // mode raw
 *       variants: ['Unlimited Holofoil',...],    // mode raw
 *     },
 *     series: { key: '<code|condition>', points: [{date, price}] }[],
 *     _matched: {...}
 *   }
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const revalidate = 300

const sql = neon(process.env.DATABASE_URL!)

// Companies connues -> label propre. Le code PPT colle societe+note (ex "psa10","bgs9.5","cgc10","ace9","tag10","sgc10","cca10")
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
      if (!grade) return null
      return { company: COMPANY_LABEL[p], grade }
    }
  }
  return null
}

function numberVariants(localId: string): string[] {
  // PPT pad le card_number selon la taille du set: "12/64" (2 chiffres) OU "012/102" (3).
  // localId peut arriver deja padde ("012") -> on retire les zeros de tete AVANT de
  // regenerer toutes les variantes, sinon "012" ne produirait jamais "12".
  const raw = String(localId).replace(/\D/g, '').replace(/^0+/, '') || '0'
  const set = new Set<string>([raw, raw.padStart(2, '0'), raw.padStart(3, '0')])
  return Array.from(set)
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const tcgCardId = params.get('tcg_card_id')
  const setSlug = params.get('set_slug')
  const cardNumber = params.get('card_number')
  const mode = (params.get('mode') === 'raw' ? 'raw' : 'graded') as 'raw' | 'graded'

  if (!tcgCardId && !(setSlug && cardNumber)) {
    return NextResponse.json(
      { error: 'Must provide tcg_card_id OR (set_slug + card_number)' },
      { status: 400 },
    )
  }

  try {
    const sqlClient = sql

    // ── Resolution set_name + card_number padded (calque /api/prices/graded) ──
    let resolvedSetName: string | null = null
    let resolvedLocalIdPadded: string | null = null

    if (tcgCardId) {
      // tcgCardId vient du drawer = "{setId}-{localId}" (ex: "base2-12", "base2-1st-12").
      // Le setId peut etre prefixe lang (en-/fr-/jp-) ou non. On strippe le prefixe,
      // on isole localId, puis on resout set_name via tcg_sets (robuste au prefixe).
      const stripped = tcgCardId.replace(/^(en|fr|jp|ja)-/, '')
      const parts = stripped.split('-')
      const localId = parts[parts.length - 1]
      resolvedLocalIdPadded = String(localId).padStart(3, '0')
      const setSlugFromId = parts.slice(0, -1).join('-') // ex: "base2" ou "base2-1st"
      // 1) match exact set_id (prefixe lang + slug), sinon 2) match par slug avec LIKE
      let setRows = await sqlClient`
        SELECT name FROM tcg_sets
        WHERE id = ${'en-' + setSlugFromId} OR id = ${setSlugFromId}
        LIMIT 1
      `
      if (!setRows?.length) {
        setRows = await sqlClient`
          SELECT name FROM tcg_sets
          WHERE id LIKE ${'%' + setSlugFromId.replace(/-/g, '%') + '%'}
          LIMIT 1
        `
      }
      resolvedSetName = setRows?.[0]?.name ?? null
    } else {
      const num = String(cardNumber).split('/')[0].replace(/\D/g, '')
      resolvedLocalIdPadded = String(num).padStart(3, '0')
      const setRows = await sqlClient`
        SELECT name FROM tcg_sets
        WHERE id LIKE ${'%' + (setSlug as string).replace(/-/g, '%') + '%'}
        LIMIT 1
      `
      resolvedSetName = setRows?.[0]?.name ?? null
    }

    if (!resolvedSetName || !resolvedLocalIdPadded) {
      return NextResponse.json({ currency: 'USD', dimensions: {}, series: [], _info: 'set_not_resolved' })
    }

    // Patterns LIKE tolerants au padding PPT (2 ou 3 chiffres selon taille du set)
    const patterns = numberVariants(resolvedLocalIdPadded).map((v) => v + '/%')
    const rows = await sqlClient`
      SELECT card_name, card_number, grades_history, raw_history
      FROM graded_prices_ppt
      WHERE set_name = ${resolvedSetName}
        AND card_number LIKE ANY(${patterns})
      LIMIT 1
    `
    const row = rows?.[0]
    if (!row) {
      return NextResponse.json({ currency: 'USD', dimensions: {}, series: [], _info: 'no_ppt_row' })
    }

    const asObj = (v: any) => {
      if (!v) return null
      if (typeof v === 'string') { try { return JSON.parse(v) } catch { return null } }
      return v
    }

    if (mode === 'graded') {
      const gh = asObj(row.grades_history) || {}
      const companiesSet = new Set<string>()
      const gradesByCompany: Record<string, Set<string>> = {}
      const series: { key: string; company: string; grade: string; points: { date: string; price: number }[] }[] = []

      for (const [code, byDate] of Object.entries(gh)) {
        const parsed = parseGradeCode(code)
        if (!parsed || !byDate || typeof byDate !== 'object') continue
        const points: { date: string; price: number }[] = []
        for (const [date, rec] of Object.entries(byDate as Record<string, any>)) {
          const price = rec?.sevenDayAverage ?? rec?.average ?? null
          if (price != null && isFinite(Number(price))) points.push({ date, price: Number(price) })
        }
        if (points.length === 0) continue
        points.sort((a, b) => (a.date < b.date ? -1 : 1))
        companiesSet.add(parsed.company)
        ;(gradesByCompany[parsed.company] ||= new Set()).add(parsed.grade)
        series.push({ key: code, company: parsed.company, grade: parsed.grade, points })
      }

      const companies = Array.from(companiesSet).sort((a, b) => {
        const order = ['PSA', 'CGC', 'BGS', 'SGC', 'TAG', 'ACE', 'CCA', 'PCA', 'CCC']
        return order.indexOf(a) - order.indexOf(b)
      })
      const grades: Record<string, string[]> = {}
      for (const c of companies) {
        grades[c] = Array.from(gradesByCompany[c]).sort((a, b) => parseFloat(b) - parseFloat(a))
      }

      return NextResponse.json({
        currency: 'USD',
        dimensions: { companies, grades },
        series,
        _matched: { set_name: resolvedSetName, card_number: row.card_number, card_name: row.card_name },
      })
    }

    // ── mode raw ──
    const rh = asObj(row.raw_history) || {}
    const variantsObj = rh.variants || {}
    const variantsSet = new Set<string>()
    const conditionsSet = new Set<string>()
    const series: { key: string; variant: string; condition: string; points: { date: string; price: number }[] }[] = []

    for (const [variant, byCondition] of Object.entries(variantsObj as Record<string, any>)) {
      if (!byCondition || typeof byCondition !== 'object') continue
      variantsSet.add(variant)
      for (const [condition, obj] of Object.entries(byCondition as Record<string, any>)) {
        const hist = (obj as any)?.history
        if (!Array.isArray(hist)) continue
        const points: { date: string; price: number }[] = []
        for (const h of hist) {
          const price = h?.market ?? null
          const date = h?.date ? String(h.date).slice(0, 10) : null
          if (price != null && date && isFinite(Number(price))) points.push({ date, price: Number(price) })
        }
        if (points.length === 0) continue
        points.sort((a, b) => (a.date < b.date ? -1 : 1))
        conditionsSet.add(condition)
        series.push({ key: `${variant}::${condition}`, variant, condition, points })
      }
    }

    const COND_ORDER = ['Near Mint', 'Lightly Played', 'Moderately Played', 'Heavily Played', 'Damaged']
    const conditions = Array.from(conditionsSet).sort((a, b) => {
      const ia = COND_ORDER.indexOf(a), ib = COND_ORDER.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

    return NextResponse.json({
      currency: 'USD',
      dimensions: { variants: Array.from(variantsSet), conditions },
      series,
      _matched: { set_name: resolvedSetName, card_number: row.card_number, card_name: row.card_name },
    })
  } catch (err: any) {
    console.error('[api/prices/graded-history] error:', err)
    return NextResponse.json({ error: err?.message || 'internal error' }, { status: 500 })
  }
}
