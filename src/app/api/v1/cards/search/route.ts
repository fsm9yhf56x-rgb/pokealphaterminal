/**
 * /api/v1/cards/search?q=drac&lang=fr — l'encyclopédie, contrat mobile.
 */

import { NextResponse } from 'next/server'
import { searchCards } from '@/lib/cards/service'

export const dynamic = 'force-dynamic'

// Rate-limit léger par IP (mémoire d'instance) : décourage le scraping massif
const hits = new Map<string, { n: number; t: number }>()
function limited(ip: string): boolean {
  const now = Date.now()
  const e = hits.get(ip)
  if (!e || now - e.t > 60_000) { hits.set(ip, { n: 1, t: now }); return false }
  e.n++
  return e.n > 40 // 40 recherches/min/IP : large pour un humain, court pour un bot
}

export async function GET(req: Request) {
  // Encyclopédie publique : la recherche nourrit l'onboarding avant le compte
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon'
  if (limited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const lang = searchParams.get('lang') ?? undefined
  if (q.length < 2) return NextResponse.json({ cards: [], total: 0 })

  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    const result = await Promise.race([
      searchCards(q, lang, searchParams.get('prices') !== '0'),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('search_timeout')), 8_000)
      }),
    ])
    const response = NextResponse.json(result)
    // Recherche publique et deterministe : le CDN absorbe les requetes
    // identiques. Le catalogue sans prix peut rester chaud plus longtemps ;
    // les prix gardent une fraicheur d'une minute.
    response.headers.set(
      'Cache-Control',
      searchParams.get('prices') === '0'
        ? 'public, s-maxage=600, stale-while-revalidate=3600'
        : 'public, s-maxage=60, stale-while-revalidate=300',
    )
    return response
  } catch (error) {
    console.error('[cards search] unavailable', error)
    return NextResponse.json(
      { error: 'search_unavailable', cards: [], total: 0 },
      { status: 503 },
    )
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}
