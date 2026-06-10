import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { sql } from '@/lib/db/sql'
import type { PsaPopResponse, PsaPopVariant } from '@/lib/psa/types'
import { isMainstreamVariety } from '@/lib/psa/types'

export const dynamic = 'force-dynamic'

/**
 * GET /api/psa/pop?card_ref=base1-4
 *
 * Returns PSA population data for a card, split into:
 *   - variants:        mainstream — visible to all
 *   - premiumVariants: exotic — Pro only
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const cardRef = url.searchParams.get('card_ref')

  if (!cardRef) {
    return NextResponse.json(
      { error: 'Missing card_ref param', code: 'MISSING_PARAMS' },
      { status: 400 },
    )
  }

  // Pop Reports = Pro entier (decision pricing 10/06).
  // isPro garde son role pour le split variantes exotiques (conserve).
  const userWithProfile = await getCurrentUserWithProfile().catch(() => null)
  if (!userWithProfile) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const isPro = userWithProfile.isPro === true
  if (!isPro) {
    return NextResponse.json({ error: 'plan_required', need: 'pro', current: userWithProfile.plan }, { status: 403 })
  }

  try {
    const rows = (await sql`
      SELECT * FROM "psa_pop_latest"
      WHERE card_ref = ${cardRef}
      ORDER BY pop_total DESC NULLS LAST
    `) as any[]

    const allVariants = (rows ?? []).map(coerceNumerics) as PsaPopVariant[]
    const variants = allVariants.filter((v) => isMainstreamVariety(v.variety))
    const exotic = allVariants.filter((v) => !isMainstreamVariety(v.variety))
    const premiumVariants = isPro ? exotic : []
    const visibleForCount = isPro ? allVariants : variants
    const totalGraded = visibleForCount.reduce((s, v) => s + (v.pop_total || 0), 0)

    const response: PsaPopResponse = {
      card_ref: cardRef,
      variants,
      premiumVariants,
      isPro,
      totalGraded,
      hasData: allVariants.length > 0,
    }

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error', code: 'INTERNAL' },
      { status: 500 },
    )
  }
}

function coerceNumerics(row: any): any {
  if (row === null || typeof row !== 'object') return row
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
      const n = Number(v)
      out[k] = Number.isFinite(n) ? n : v
    } else {
      out[k] = v
    }
  }
  return out
}

