import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

const RAW_TIERS = ['NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED', 'MINT']
const COND_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint', LIGHTLY_PLAYED: 'Lightly Played', MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played', DAMAGED: 'Damaged', MINT: 'Mint',
}

type Side = { priceEur: number; source: string; basis: string; sales: number | null; date: string | null } | null

export async function GET(req: NextRequest) {
  try {
    const cardId = (req.nextUrl.searchParams.get('card_id') || '').trim()
    if (!cardId) return NextResponse.json({ us: null, eu: null, gapPct: null, gapEur: null })

    let fx = 0.92
    try {
      const fxRow = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1` as Array<any>
      if (fxRow[0]?.rate) fx = Number(fxRow[0].rate)
    } catch {}
    if (!Number.isFinite(fx) || fx <= 0) fx = 0.92
    const toEur = (v: number, cur: string) => cur === 'USD' ? v * fx : v

    const rows = await sql.query(
      `SELECT pm.market, pm.source, pm.tier, pm.spot, pm.currency, pm.sale_count, pm.is_asking, pm.as_of
       FROM k_cards kc
       JOIN price_matrix pm ON pm.print_id = kc.print_id
         AND split_part(pm.kodo_card_id, '-', 1) = kc.lang
       WHERE kc.id = $1 AND pm.spot IS NOT NULL AND pm.spot > 0`,
      [cardId],
    ) as Array<any>

    const pickSide = (market: string): Side => {
      const inMkt = rows.filter(r => r.market === market)
      // 1) Meilleure reference raw VENDUE (volume max, pas une annonce).
      const sold = inMkt.filter(r =>
        RAW_TIERS.includes(r.tier) && r.is_asking !== true && r.sale_count != null && Number(r.sale_count) > 0,
      )
      if (sold.length > 0) {
        const nm = sold.filter(r => r.tier === 'NEAR_MINT')
        const pool = nm.length > 0 ? nm : sold
        pool.sort((a, b) => Number(b.sale_count) - Number(a.sale_count) || Number(b.spot) - Number(a.spot))
        const r = pool[0]
        return {
          priceEur: Math.round(toEur(Number(r.spot), r.currency) * 100) / 100,
          source: r.source,
          basis: COND_LABEL[r.tier] || r.tier,
          sales: Number(r.sale_count),
          date: r.as_of || null,
        }
      }
      // 2) Fallback : tendance agregee (Cardmarket) si pas de vente raw.
      const agg = inMkt.find(r => r.tier === 'AGGREGATED' && r.is_asking !== true)
      if (agg) {
        return {
          priceEur: Math.round(toEur(Number(agg.spot), agg.currency) * 100) / 100,
          source: agg.source,
          basis: 'Tendance',
          sales: null,
          date: agg.as_of || null,
        }
      }
      return null
    }

    const us = pickSide('US')
    const eu = pickSide('EU')

    let gapPct: number | null = null
    let gapEur: number | null = null
    if (us && eu && eu.priceEur > 0) {
      gapEur = Math.round((us.priceEur - eu.priceEur) * 100) / 100
      gapPct = Math.round(((us.priceEur - eu.priceEur) / eu.priceEur) * 1000) / 10
    }

    return NextResponse.json({ us, eu, gapPct, gapEur })
  } catch (e: any) {
    console.error('[market/arbitrage]', e?.message || e)
    return NextResponse.json({ us: null, eu: null, gapPct: null, gapEur: null })
  }
}
