import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'en'
  const r = await fetch(`https://api.tcgdex.net/v2/${lang}/sets`)
  const sets = await r.json()
  return NextResponse.json({ sets: sets.map((s: any) => ({ id: s.id, name: s.name, cardCount: s.cardCount?.total || 0 })) })
}
