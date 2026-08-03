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
  try { await priceCards(sql, { ids: [created.id] }) } catch {}
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== 'string') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }
  await updatePortfolioCard(user.id, body.id, body)
  return NextResponse.json({ ok: true })
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
