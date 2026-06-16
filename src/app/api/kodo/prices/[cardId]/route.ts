import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  try {
    const { cardId } = await params
    const cards = await sql.query(
      `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kp.set_id, kp.number, kp.name_en
       FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id WHERE kc.id = $1`, [cardId])
    const card = cards[0]
    if (!card) return NextResponse.json({ error: 'card_not_found' }, { status: 404 })

    const [matrix, signals] = await Promise.all([
      sql.query(
        `SELECT market, tier, source, spot, low, high, avg7d, avg30d, median7d, median30d,
                sale_count, is_asking, currency, country_breakdown, as_of
         FROM price_matrix WHERE print_id = $1 ORDER BY market, source, tier`, [card.print_id]),
      sql.query(`SELECT * FROM price_signals WHERE print_id = $1 AND lang = $2`, [card.print_id, String(card.lang || 'en').toLowerCase()]),
    ])

    const sig = signals[0] || null
    const lang = String(card.lang || 'en').toUpperCase()

    // Cote specifique a la langue de LA carte demandee (depuis cote_lang JSONB)
    let coteLang: any = null
    if (sig && sig.cote_lang) {
      const cl = sig.cote_lang as Record<string, any>
      for (const country of Object.keys(cl)) {
        const entry = cl[country]?.[lang]
        if (entry?.avg != null) { coteLang = { country, lang, ...entry }; break }
      }
      // Fallback: cote du pays de la langue (toutes langues confondues)
      if (!coteLang) {
        const home: Record<string, string> = { FR: 'FR', EN: 'GB', DE: 'DE', IT: 'IT', ES: 'ES' }
        const c = home[lang]
        const entry = c ? cl[c]?.ALL : null
        if (entry?.avg != null) coteLang = { country: c, lang: 'ALL', ...entry }
      }
    }

    return NextResponse.json({
      card: { id: card.id, printId: card.print_id, lang: card.lang, name: card.name_localized || card.name_en, setId: card.set_id, number: card.number },
      fairValueEur: sig ? Number(sig.fair_value_eur ?? 0) || null : null,
      fairValueMethod: sig?.fair_value_method ?? null,
      coteFrEur: sig ? Number(sig.cote_fr_eur ?? 0) || null : null,
      coteLang,
      liquidityScore: sig?.liquidity_score ?? null,
      spreadUsEuPct: sig?.spread_us_eu_pct ?? null,
      gradeEvPsa10Eur: sig ? Number(sig.grade_ev_psa10_eur ?? 0) || null : null,
      matrix: matrix.map((r: any) => {
        const out: any = { ...r }
        for (const k of ['spot','low','high','avg7d','avg30d','median7d','median30d']) out[k] = r[k] != null ? Number(r[k]) : null
        return out
      }),
      asOf: matrix[0]?.as_of ?? null,
      engine: 'kodo-v1',
    })
  } catch (e: any) {
    console.error('[kodo/prices]', e.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
