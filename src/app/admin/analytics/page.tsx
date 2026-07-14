import { requireAdmin } from '@/lib/auth-admin'
import { getAnalyticsOverview } from '@/lib/analytics-queries'
import AnalyticsDashboard from './AnalyticsDashboard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function AnalyticsPage() {
  await requireAdmin()
  const data = await getAnalyticsOverview()
  return <AnalyticsDashboard data={data} />
}
