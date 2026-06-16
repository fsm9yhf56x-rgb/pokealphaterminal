import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

const LANG_PREFIX: Record<string, string> = { EN: 'en-', FR: 'fr-', JA: 'jp-', JP: 'jp-' }

// Tri sur les colonnes de sortie (alias) -> jamais de colonne brute issue de l'URL.
const SORT_COL: Record<string, string> = {
  top_price: 'top_price',
  card_name: 'card_name',
  cardmarket_trend: 'top_price',
  ebay_sales: 'top_sales',
  grade_ev: 'grade_ev',
  spread_pct: 'spread_pct',
}

// Prix raw au plus gros volume, toutes sources confondues (exclut le grade et le trend Cardmarket).
const LATERAL_VOL = `
  LEFT JOIN LATERAL (
    SELECT pm.source, pm.tier, pm.spot, pm.sale_count, pm.currency
    FROM price_matrix pm
    WHERE pm.print_id = kc.print_id
      AND pm.spot IS NOT NULL AND pm.spot > 0
      AND pm.sale_count IS NOT NULL AND pm.sale_count > 0
      AND pm.tier !~ '^(PSA|BGS|CGC|SGC|ACE|TAG)_'
      AND pm.tier <> 'AGGREGATED'
      AND (pm.is_asking IS NOT TRUE OR pm.source = 'cardmarket')
    ORDER BY (CASE WHEN pm.tier = 'NEAR_MINT' THEN 0 ELSE 1 END), pm.sale_count DESC, pm.spot DESC
    LIMIT 1
  ) vol ON true
`

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

    // Taux FX (meme source que la fiche spotlight). Injecte comme litteral (donnee non-user).
    let fx = 0.92
    try {
      const fxRow = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1` as Array<any>
      if (fxRow[0]?.rate) fx = Number(fxRow[0].rate)
    } catch {}
    if (!Number.isFinite(fx) || fx <= 0) fx = 0.92

    // fx est un nombre que nous controlons -> interpolation sure, pas de bind param.
    const PRICE_EXPR = `COALESCE(CASE WHEN vol.currency = 'USD' THEN vol.spot * ${fx} ELSE vol.spot END, ps.fair_value_eur)`

    const args: any[] = []
    let i = 1

    const whereCore: string[] = ['ps.fair_value_eur IS NOT NULL', 'ps.fair_value_eur > 0']
    if (lang !== 'ALL' && LANG_PREFIX[lang]) {
      whereCore.push(`c.id LIKE $${i++}`); args.push(LANG_PREFIX[lang] + '%')
    } else if (lang === 'ALL') {
      whereCore.push(`c.id LIKE $${i++}`); args.push('en-%')
    }
    if (q) { whereCore.push(`c.name ILIKE $${i++}`); args.push(`%${q}%`) }
    if (set) { whereCore.push(`c.set_id = $${i++}`); args.push(set) }
    if (hasGraded) { whereCore.push('ps.grade_ev_psa10_eur IS NOT NULL') }

    // Filtres prix -> sur le prix AFFICHE (volume), via le LATERAL.
    const priceWhere: string[] = []
    const priceArgs: any[] = []
    if (minPrice != null) { priceWhere.push(`${PRICE_EXPR} >= $${i++}`); priceArgs.push(minPrice) }
    if (maxPrice != null) { priceWhere.push(`${PRICE_EXPR} <= $${i++}`); priceArgs.push(maxPrice) }
    const hasPriceFilter = priceWhere.length > 0

    const fromCore = `
      FROM k_cards_export c
      LEFT JOIN k_sets_export s ON s.id = c.set_id
      JOIN k_cards kc ON kc.id = c.id
      JOIN price_signals ps ON ps.print_id = kc.print_id
    `
    const fromFull = fromCore + LATERAL_VOL
    const coreWhere = whereCore.join(' AND ')
    const allWhere = [...whereCore, ...priceWhere].join(' AND ')

    // COUNT : sans filtre prix on evite le LATERAL (rapide). Avec filtre, on l'inclut.
    let total = 0
    if (hasPriceFilter) {
      const cRows = await sql.query(`SELECT COUNT(*)::int AS n ${fromFull} WHERE ${allWhere}`, [...args, ...priceArgs])
      total = Number(cRows[0]?.n || 0)
    } else {
      const cRows = await sql.query(`SELECT COUNT(*)::int AS n ${fromCore} WHERE ${coreWhere}`, args)
      total = Number(cRows[0]?.n || 0)
    }

    const orderCol = SORT_COL[sortField] || 'top_price'
    const limitPh = i++
    const offsetPh = i++
    const rows = await sql.query(
      `SELECT c.id AS card_ref, c.name AS card_name, s.name AS set_name,
              c.set_id AS set_slug, c.local_id AS card_number, c.lang AS lang,
              c.rarity_normalized AS rarity,
              ${PRICE_EXPR} AS top_price,
              vol.source AS top_source_raw, vol.tier AS top_condition, vol.sale_count AS top_sales,
              ps.fair_value_method AS fv_method,
              ps.grade_ev_psa10_eur AS grade_ev,
              ps.spread_us_eu_pct AS spread_pct,
              ps.liquidity_score AS liquidity
       ${fromFull}
       WHERE ${allWhere}
       ORDER BY ${orderCol} ${sortDir} NULLS LAST
       LIMIT $${limitPh} OFFSET $${offsetPh}`,
      [...args, ...priceArgs, PAGE_SIZE, page * PAGE_SIZE],
    )

    const normSrc = (s: string | null) =>
      s === 'ppt_tcgplayer' ? 'tcgplayer' : s === 'ppt_ebay' ? 'ebay' : (s || null)

    const results = (rows as any[]).map(r => {
      const sales = r.top_sales != null ? Number(r.top_sales) : null
      return {
        card_ref: r.card_ref,
        card_name: r.card_name || 'Unknown',
        set_name: r.set_name,
        set_slug: r.set_slug,
        tcgdex_set_id: r.set_slug,
        card_number: r.card_number,
        lang: r.lang,
        rarity: r.rarity,
        top_price: Number(r.top_price) || 0,
        top_source: sales != null ? normSrc(r.top_source_raw) : null,
        top_sales: sales,
        top_condition: sales != null ? r.top_condition : null,
        fv_method: r.fv_method || null,
        grade_ev: r.grade_ev != null ? Number(r.grade_ev) : null,
        spread_pct: r.spread_pct != null ? Number(r.spread_pct) : null,
        liquidity: r.liquidity != null ? Number(r.liquidity) : null,
        cardmarket_trend: null,
        ebay_avg: null,
        ebay_sales: sales,
        tcg_avg: null,
        psa10_avg: null,
        has_graded: r.grade_ev != null,
        tier: null,
        variant: 'raw',
      }
    })

    return NextResponse.json({ results, total, pageSize: PAGE_SIZE })
  } catch (e: any) {
    console.error('[market/explorer]', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
