import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

export async function GET(request: Request) {
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supa = getAdminClient()
  const startTime = Date.now()

  const { count: beforeCount } = await (supa as any)
    .from('psa_pop_reports')
    .select('*', { count: 'exact', head: true })

  const { error } = await (supa as any).rpc('cleanup_psa_duplicates')

  if (error) {
    return NextResponse.json({
      error: 'Cleanup failed',
      detail: error.message,
      hint: 'Check RPC function cleanup_psa_duplicates exists',
    }, { status: 500 })
  }

  const { count: afterCount } = await (supa as any)
    .from('psa_pop_reports')
    .select('*', { count: 'exact', head: true })

  return NextResponse.json({
    ok: true,
    before: beforeCount,
    after: afterCount,
    deleted: (beforeCount || 0) - (afterCount || 0),
    elapsed_ms: Date.now() - startTime,
  })
}
