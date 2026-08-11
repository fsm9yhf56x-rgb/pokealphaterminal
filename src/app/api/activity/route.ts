/**
 * /api/activity?card_id=xxx&limit=10
 *
 * Returns recent market events for a card from KODO price_history:
 * - PRICE_UPDATE: tier raw (NEAR_MINT, LIGHTLY_PLAYED, AGGREGATED...)
 * - GRADED_DETECTED: tier gradé (PSA_/BGS_/CGC_/SGC_/PCA_/CCC_/TAG_...)
 *
 * Optional: alpha_signals also surfaced when available.
 * Migré de prices_snapshots (legacy) vers price_history (Kodo Engine).
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)

interface ActivityEvent {
  kind: 'PRICE_UPDATE' | 'GRADED_DETECTED' | 'ALPHA_SIGNAL'
  variant?: string
  condition?: string | null
  source?: string
  price?: number
  currency?: string
  ts: string
  meta?: any
}

const GRADED_RE = /^(psa|cgc|bgs|sgc|pca|ccc|tag|ace|gma|hga|rcg)_/i

export async function GET(req: NextRequest) {
  let cardId = req.nextUrl.searchParams.get('card_id')
  const lang = (req.nextUrl.searchParams.get('lang') || 'EN').toUpperCase()
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '15', 10), 30)
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  try {
    // Résolution short ID (ex "base1-4") -> id canonique k_cards avec lang (même logique que spotlight)
    if (!cardId.match(/^(en|fr|jp|aopkm)-/i)) {
      const langOrder = lang === 'FR' ? ['fr', 'en', 'jp']
                      : lang === 'JP' || lang === 'JA' ? ['jp', 'aopkm', 'en', 'fr']
                      : ['en', 'fr', 'jp']
      const candidates = langOrder.map(l => `${l}-${cardId}`)
      const found = await sql`
        SELECT id FROM k_cards WHERE id = ANY(${candidates as any}) LIMIT 5
      ` as Array<{ id: string }>
      if (found.length > 0) {
        for (const prefix of langOrder) {
          const match = found.find(r => r.id.startsWith(prefix + '-'))
          if (match) { cardId = match.id; break }
        }
      }
    }

    // Events récents depuis price_history (Kodo), résolu via k_cards.print_id + lang
    // (jointure sur la langue depuis le 11/08 : sans elle une carte FR remontait
    //  aussi les evenements de ses homologues EN/JP au meme print_id).
    const rows = await sql`
      SELECT ph.tier, ph.source, ph.market, ph.price, ph.sale_count, ph.currency, ph.day
      FROM k_cards kc
      JOIN price_history ph ON ph.print_id = kc.print_id AND ph.lang = kc.lang
      WHERE kc.id = ${cardId}
        AND ph.price IS NOT NULL
        AND ph.price > 0
      ORDER BY ph.day DESC
      LIMIT ${limit}
    ` as Array<any>

    const events: ActivityEvent[] = rows.map(r => {
      const tier = String(r.tier || '')
      const isGraded = GRADED_RE.test(tier)
      return {
        kind: isGraded ? 'GRADED_DETECTED' : 'PRICE_UPDATE',
        variant: isGraded ? tier.toLowerCase() : 'raw',
        condition: isGraded ? null : tier,
        source: r.source,
        price: Number(r.price),
        currency: r.currency,
        ts: new Date(r.day).toISOString(),
        meta: { nb_sales: r.sale_count, market: r.market },
      }
    })

    // Alpha signals (table optionnelle)
    try {
      const alpha = await sql`
        SELECT computed_at, market_target, confidence_pct, ai_reason, tier
        FROM alpha_signals
        WHERE card_ref = ${cardId}
        ORDER BY computed_at DESC
        LIMIT 3
      ` as Array<any>
      for (const a of alpha) {
        events.push({
          kind: 'ALPHA_SIGNAL',
          ts: a.computed_at,
          meta: {
            target: a.market_target ? Number(a.market_target) : null,
            confidence: a.confidence_pct,
            reason: a.ai_reason,
            tier: a.tier,
          },
        })
      }
    } catch { /* alpha_signals optional */ }

    events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    return NextResponse.json({ events: events.slice(0, limit) })
  } catch (e: any) {
    console.error('[activity] error:', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
