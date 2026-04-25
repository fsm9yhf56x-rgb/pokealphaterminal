import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { PsaPopResponse, PsaPopVariant } from '@/lib/psa/types'
import { isMainstreamVariety } from '@/lib/psa/types'

/**
 * GET /api/psa/pop?card_ref=base1-4
 *
 * Returns PSA population data for a card, split into:
 *   - variants:        mainstream (Unlimited / 1st Ed / Shadowless) — visible to all
 *   - premiumVariants: exotic (Black Dot Error, etc.) — Pro only, empty for free users
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const cardRef = url.searchParams.get('card_ref')

  if (!cardRef) {
    return NextResponse.json(
      { error: 'Missing card_ref param', code: 'MISSING_PARAMS' },
      { status: 400 }
    )
  }

  // Init Supabase with cookies for auth
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {}, // no-op in route handlers
      },
    }
  )

  // Determine Pro status
  let isPro = false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_pro')
        .eq('id', user.id)
        .single()
      isPro = profile?.is_pro ?? false
    }
  } catch (_) {
    isPro = false
  }

  try {
    const { data, error } = await supabase
      .from('psa_pop_latest')
      .select('*')
      .eq('card_ref', cardRef)
      .order('pop_total', { ascending: false })

    if (error) throw error

    const allVariants = (data || []) as PsaPopVariant[]
    const variants = allVariants.filter(v => isMainstreamVariety(v.variety))
    const exotic = allVariants.filter(v => !isMainstreamVariety(v.variety))

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
      { status: 500 }
    )
  }
}
