/**
 * /api/v1/cards/search?q=drac&lang=fr — l'encyclopédie, contrat mobile.
 */

import { NextResponse } from 'next/server'
import { searchCards } from '@/lib/cards/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Encyclopédie publique : la recherche nourrit l'onboarding avant le compte
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const lang = searchParams.get('lang') ?? undefined
  if (q.length < 2) return NextResponse.json({ cards: [] })
  const { cards, total } = await searchCards(q, lang)
  return NextResponse.json({ cards, total })
}
