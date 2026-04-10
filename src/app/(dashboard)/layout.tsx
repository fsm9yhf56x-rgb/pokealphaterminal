'use client'

import dynamic from 'next/dynamic'

const AppShell = dynamic(
  () => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })),
  { ssr: false, loading: () => <div style={{ minHeight:'100vh', background:'#fff' }} /> }
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>
}
