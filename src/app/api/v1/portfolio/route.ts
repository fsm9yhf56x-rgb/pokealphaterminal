/**
 * /api/v1/portfolio — le classeur, contrat mobile.
 * Pattern maison : résout la session → délègue au service → JSON.
 * Zéro logique métier ici (elle vit dans src/lib/portfolio/service.ts).
 */

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import {
  listPortfolio, addPortfolioCard, updatePortfolioCard, deletePortfolioCard,
} from '@/lib/portfolio/service'
import { sql } from '@/lib/db/sql'
import { priceCards } from '@/lib/portfolio-pricing'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const cards = await listPortfolio(user.id)
  return NextResponse.json({ cards })
}

export async function POST(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'invalid_name' }, { status: 400 })
  }
  const created = await addPortfolioCard(user.id, body)
  // Kodo Engine : la carte est cotée immédiatement, comme un ajout web
  let priced: any = null
  try {
    await priceCards(sql, { ids: [created.id] })
    const rows = await sql`
      SELECT current_price, price_basis FROM portfolio_cards WHERE id = ${created.id}`
    priced = rows[0] ?? null
  } catch (e) {
    console.error('[portfolio POST pricing]', (e as any)?.message)
  }
  return NextResponse.json({ ok: true, id: created.id, card: priced }, { status: 201 })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  await updatePortfolioCard(user.id, body.id, body)
  // L'exemplaire a changé (état, gradation…) → sa cote suit immédiatement,
  // et la réponse PORTE la vérité re-pricée : le client l'applique sans course.
  let priced: any = null
  try {
    await priceCards(sql, { ids: [body.id] })
    const rows = await sql`
      SELECT current_price, price_basis, condition, graded, grade_company, grade_value, buy_price, qty
      FROM portfolio_cards WHERE id = ${body.id} AND user_id = ${user.id}`
    priced = rows[0] ?? null
  } catch (e) {
    console.error('[portfolio PATCH pricing]', (e as any)?.message)
    priced = { __pricing_error: String((e as any)?.message ?? e) }
  }
  return NextResponse.json({ ok: true, card: priced })
}

export async function DELETE(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  await deletePortfolioCard(user.id, id)
  return NextResponse.json({ ok: true })
}
