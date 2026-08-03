import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/helpers'
import { listSets } from '@/lib/sets/service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const sets = await listSets()
  return NextResponse.json({ sets })
}
