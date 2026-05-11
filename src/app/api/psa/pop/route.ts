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

  // Determine Pro status (non-blocking — anon users can still see free data)
  let isPro = false
  try {
    const userWithProfile = await getCurrentUserWithProfile()
    isPro = userWithProfile?.isPro === true
  } catch {
    isPro = false
  }

  try {
    const rows = (await sql`
      SELECT * FROM "psa_pop_latest"
      WHERE card_ref = ${cardRef}
      ORDER BY pop_total DESC NULLS LAST
    `) as PsaPopVariant[]

    const allVariants = rows ?? []
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
