export const dynamic = 'force-dynamic'

import { AppShell } from '@/components/layout/AppShell'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}