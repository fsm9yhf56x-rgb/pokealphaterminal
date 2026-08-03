/**
 * /api/v1/cards/search?q=drac&lang=fr — l'encyclopédie, contrat mobile.
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { searchCards } from '@/lib/cards/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') ?? '').trim()
  const lang = searchParams.get('lang') ?? undefined
  if (q.length < 2) return NextResponse.json({ cards: [] })
  const { cards, total } = await searchCards(q, lang)
  return NextResponse.json({ cards, total })
}
