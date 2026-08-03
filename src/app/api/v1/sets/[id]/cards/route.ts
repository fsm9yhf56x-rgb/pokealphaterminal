import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { listSetCards } from '@/lib/sets/service'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const lang = searchParams.get('lang') ?? 'fr'
  const cards = await listSetCards(id, lang)
  return NextResponse.json({ cards })
}
