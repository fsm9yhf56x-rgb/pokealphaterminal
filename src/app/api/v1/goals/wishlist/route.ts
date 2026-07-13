import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { createWishItem, deleteWishItem, updateWishItem } from '@/lib/goals/service'
import type { NewWishlistItem } from '@/lib/goals/types'

export const dynamic = 'force-dynamic'

/** POST /api/v1/goals/wishlist — ajoute une carte (verrou plan Gratuit appliqué dans le service). */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  if (!body || !body.card_name || String(body.card_name).trim() === '') {
    return NextResponse.json({ error: 'invalid_wish' }, { status: 400 })
  }

  const input: NewWishlistItem = {
    card_name: String(body.card_name).trim(),
    set_id: body.set_id ?? null,
    set_name: body.set_name ?? null,
    card_number: body.card_number ?? null,
    lang: body.lang ?? null,
    rarity: body.rarity ?? null,
    priority: (Number(body.priority) as 1 | 2 | 3) || 2,
    target_price: body.target_price == null ? null : Number(body.target_price),
    notes: body.notes ?? null,
  }

  try {
    const res = await createWishItem(user.id, input)
    if ('error' in res) {
      // Verrou 3-max atteint (plan Gratuit)
      return NextResponse.json(res, { status: 403 })
    }
    return NextResponse.json(res, { status: 201 })
  } catch (e) {
    console.error('[POST /api/v1/goals/wishlist]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/** DELETE /api/v1/goals/wishlist?id=... — supprime (scopé user). */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  try {
    await deleteWishItem(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/v1/goals/wishlist]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/** PATCH /api/v1/goals/wishlist — met à jour acquired / target_price / priority (body: { id, ... }). */
export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  if (!body?.id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  const patch: { acquired?: boolean; target_price?: number | null; priority?: 1 | 2 | 3 } = {}
  if (typeof body.acquired === 'boolean') patch.acquired = body.acquired
  if (body.target_price !== undefined) patch.target_price = body.target_price == null ? null : Number(body.target_price)
  if (body.priority !== undefined) patch.priority = (Number(body.priority) as 1 | 2 | 3) || 2
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  try {
    const updated = await updateWishItem(user.id, String(body.id), patch)
    if (!updated) return NextResponse.json({ error: 'not_found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (e) {
    console.error('[PATCH /api/v1/goals/wishlist]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
