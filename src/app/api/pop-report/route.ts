/**
 * /api/pop-report?card_id=xxx
 *
 * Returns PSA population data for a card.
 * psa_pop_reports.card_ref is unprefixed (e.g. "base1-4"), so we strip lang prefix.
 * Returns multiple psa_spec_ids (Unlimited / 1st Edition / Shadowless variants).
 */

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)

const LANG_PATTERNS = {
  EN: { exclude: /(french|german|italian|spanish|portuguese|japanese|korean|chinese)/i, label: 'English' },
  FR: { match: /french/i, label: 'French' },
  JP: { match: /japanese/i, label: 'Japanese' },
}

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get('card_id')
  const lang = (req.nextUrl.searchParams.get('lang') || 'EN').toUpperCase() as 'EN' | 'FR' | 'JP'
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  // ─── Resolve card_ref according to language ───────────────────────
  // EN/FR : cardId looks like 'en-base1-4' or 'fr-base1-4' → strip prefix → 'base1-4'
  //         (psa_pop_reports stores these unprefixed)
  // JP    : cardId looks like 'aopkm-490-201' → resolve via psa_set_mappings
  //         to get 'jp-SV2A-201' format used by PSA
  let shortRef: string

  if (lang === 'JP') {
    // Per-card resolution: numbering between TCGdex and PSA diverges,
    // so we resolve card by card via psa_card_mappings
    // (built by scripts/match-psa-jp-cards.mjs)
    const mapping = await sql`
      SELECT psa_card_ref FROM psa_card_mappings
      WHERE tcg_card_id = ${cardId}
        AND confidence IN ('verified', 'auto')
      LIMIT 1
    ` as Array<{ psa_card_ref: string }>

    if (mapping.length === 0) {
      // No PSA mapping for this JP card → honest fallback
      return NextResponse.json({ variants: [], shortRef: null, lang, langFallback: true })
    }

    // psa_card_ref is already in 'jp-XXX-NNN' format
    shortRef = mapping[0].psa_card_ref
  } else {
    // EN/FR : strip lang prefix
    shortRef = cardId.replace(/^(en|fr|jp|aopkm)-/i, '')
  }

  try {
    const rows = await sql`
      SELECT psa_spec_id, variety,
             pop_10, pop_9_5, pop_9, pop_8_5, pop_8,
             pop_7_5, pop_7, pop_6_5, pop_6, pop_5_5, pop_5,
             pop_4_5, pop_4, pop_3_5, pop_3,
             pop_2_5, pop_2, pop_1_5, pop_1
      FROM psa_pop_reports
      WHERE card_ref = ${shortRef}
      ORDER BY pop_10 DESC NULLS LAST
    ` as Array<any>

    const allVariants = rows.map(r => {
      const grades: Record<string, number> = {}
      let total = 0
      for (const k of Object.keys(r)) {
        if (k.startsWith('pop_') && r[k] != null) {
          const grade = k.replace('pop_', '').replace('_', '.')
          grades[grade] = Number(r[k])
          total += Number(r[k])
        }
      }
      return {
        psa_spec_id: r.psa_spec_id,
        variety: r.variety || null,
        grades,
        total,
      }
    })

    // Filtrer par langue (sauf pour JP : déjà filtré via le card_ref jp-XXX)
    const pattern = LANG_PATTERNS[lang]
    let variants = allVariants
    let langFallback = false

    if (lang === 'JP') {
      // Pour JP, le card_ref jp-XXX garantit déjà des cartes japonaises
      // Pas de filtre supplémentaire nécessaire
      if (allVariants.length === 0) {
        langFallback = true
      }
    } else if (pattern) {
      if ('match' in pattern && pattern.match) {
        // FR : on garde uniquement les varieties qui matchent
        variants = allVariants.filter(v => v.variety && pattern.match.test(v.variety))
        if (variants.length === 0) {
          variants = []
          langFallback = true
        }
      } else if ('exclude' in pattern && pattern.exclude) {
        // EN : on exclut les varieties marquées avec une langue étrangère
        variants = allVariants.filter(v => !v.variety || !pattern.exclude.test(v.variety))
      }
    }

    return NextResponse.json({ variants, shortRef, lang, langFallback }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e: any) {
    console.error('[pop-report] error:', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
