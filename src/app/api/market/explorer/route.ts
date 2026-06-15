import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

// Prefixe d'id par langue (en-base1-4, fr-..., jp-...)
const LANG_PREFIX: Record<string, string> = { EN: 'en-', FR: 'fr-', JA: 'jp-', JP: 'jp-' }

// Tri whiteliste -> jamais de colonne brute issue de l'URL (anti-injection)
const SORT_COL: Record<string, string> = {
  top_price: 'ps.fair_value_eur',
  card_name: 'c.name',
  cardmarket_trend: 'ps.fair_value_eur',
  ebay_sales: 'ps.fair_value_eur',
}

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams
    const q = (p.get('q') || '').trim()
    const lang = (p.get('lang') || 'ALL').toUpperCase()
    const set = p.get('set')
    const minPrice = p.get('min') ? Number(p.get('min')) : null
    const maxPrice = p.get('max') ? Number(p.get('max')) : null
    const hasGraded = p.get('graded') === '1'
    const sortField = p.get('sort') || 'top_price'
    const sortDir = (p.get('dir') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC'
    const page = Math.max(0, Number(p.get('p') || 0))

    const where: string[] = ['ps.fair_value_eur IS NOT NULL', 'ps.fair_value_eur > 0']
    const args: any[] = []
    let i = 1

    if (lang !== 'ALL' && LANG_PREFIX[lang]) {
      where.push(`c.id LIKE $${i++}`)
      args.push(LANG_PREFIX[lang] + '%')
    } else if (lang === 'ALL') {
      // Lancement EN-first : par defaut on borne sur EN tant que JP/FR ne sont pas branches.
      where.push(`c.id LIKE $${i++}`)
      args.push('en-%')
    }

    if (q) { where.push(`c.name ILIKE $${i++}`); args.push(`%${q}%`) }
    if (set) { where.push(`c.set_id = $${i++}`); args.push(set) }
    if (minPrice != null) { where.push(`ps.fair_value_eur >= $${i++}`); args.push(minPrice) }
    if (maxPrice != null) { where.push(`ps.fair_value_eur <= $${i++}`); args.push(maxPrice) }
    if (hasGraded) { where.push('ps.grade_ev_psa10_eur IS NOT NULL') }

    const base = `
      FROM tcg_cards c
      LEFT JOIN tcg_sets s ON s.id = c.set_id
      JOIN k_cards kc ON kc.id = c.id
      JOIN price_signals ps ON ps.print_id = kc.print_id
      WHERE ${where.join(' AND ')}
    `

    const countRows = await sql.query(`SELECT COUNT(*)::int AS n ${base}`, args)
    const total = Number(countRows[0]?.n || 0)

    const orderCol = SORT_COL[sortField] || 'ps.fair_value_eur'
    const limitPh = i++
    const offsetPh = i++
    const rows = await sql.query(
      `SELECT c.id AS card_ref, c.name AS card_name, s.name AS set_name,
              c.set_id AS set_slug, c.local_id AS card_number, c.lang AS lang,
              c.rarity_normalized AS rarity, ps.fair_value_eur AS top_price,
              ps.grade_ev_psa10_eur AS grade_ev
       ${base}
       ORDER BY ${orderCol} ${sortDir} NULLS LAST
       LIMIT $${limitPh} OFFSET $${offsetPh}`,
      [...args, PAGE_SIZE, page * PAGE_SIZE],
    )

    const results = (rows as any[]).map(r => ({
      card_ref: r.card_ref,
      card_name: r.card_name || 'Unknown',
      set_name: r.set_name,
      set_slug: r.set_slug,
      tcgdex_set_id: r.set_slug,
      card_number: r.card_number,
      lang: r.lang,
      rarity: r.rarity,
      top_price: Number(r.top_price) || 0,
      cardmarket_trend: null,
      ebay_avg: null,
      ebay_sales: null,
      tcg_avg: null,
      psa10_avg: null,
      has_graded: r.grade_ev != null,
      tier: null,
      variant: 'raw',
    }))

    return NextResponse.json({ results, total, pageSize: PAGE_SIZE })
  } catch (e: any) {
    console.error('[market/explorer]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
