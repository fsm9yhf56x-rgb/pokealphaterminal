import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { createTarget, deleteTarget } from '@/lib/goals/service'
import type { NewGoalTarget } from '@/lib/goals/types'

export const dynamic = 'force-dynamic'

/** POST /api/v1/goals/targets — crée un objectif. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }

  if (!body || typeof body.metric !== 'string' || body.target_value == null) {
    return NextResponse.json({ error: 'invalid_target' }, { status: 400 })
  }

  const input: NewGoalTarget = {
    metric: body.metric,
    target_value: Number(body.target_value),
    unit: body.unit ?? null,
    label: body.label ?? null,
    deadline: body.deadline ?? null,
  }

  try {
    const target = await createTarget(user.id, input)
    return NextResponse.json(target, { status: 201 })
  } catch (e) {
    console.error('[POST /api/v1/goals/targets]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}

/** DELETE /api/v1/goals/targets?id=... — supprime un objectif (scopé user). */
export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser()
  if (!user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'missing_id' }, { status: 400 })

  try {
    await deleteTarget(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[DELETE /api/v1/goals/targets]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
