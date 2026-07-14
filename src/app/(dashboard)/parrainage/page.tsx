import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/helpers'
import { getReferralOverview, getLeaderboard } from '@/lib/referral/service'
import ReferralDashboard from './ReferralDashboard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kodocards.com'

export default async function ParrainagePage() {
  const user = await getCurrentUser().catch(() => null)
  if (!user?.id) redirect('/login?redirect=/parrainage')

  const [overview, leaderboard] = await Promise.all([
    getReferralOverview(user.id),
    getLeaderboard(20),
  ])

  return (
    <ReferralDashboard
      code={overview.code}
      link={`${APP_URL}?ref=${overview.code}`}
      counts={overview.counts}
      filleuls={overview.filleuls}
      premiumUntil={overview.premiumUntil}
      leaderboard={leaderboard.map(r => ({ name: r.name, total: r.total, rewarded: r.rewarded, isMe: r.referrer_id === user.id }))}
    />
  )
}
