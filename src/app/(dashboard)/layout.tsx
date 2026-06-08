'use client'
import dynamic from 'next/dynamic'
import { useAuth } from '@/lib/useAuth'

const AppShell = dynamic(
  () => import('@/components/layout/AppShell').then(m => ({ default: m.AppShell })),
  { ssr: false, loading: () => <div style={{ minHeight: '100vh', background: '#fff' }} /> }
)
const PersonaOnboarding = dynamic(
  () => import('@/components/onboarding/PersonaOnboarding').then(m => ({ default: m.PersonaOnboarding })),
  { ssr: false }
)

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Gate anti-flash : on attend que le profil soit reellement charge (profileReady),
  // pas seulement `loading`. Au 1er render, user peut exister (session en cache) alors
  // que le fetch profil n a pas demarre => loading=false a tort => flash mode collector.
  const { user, profileReady } = useAuth()

  if (user && !profileReady) {
    return <div style={{ minHeight: '100vh', background: '#fff' }} />
  }

  return (
    <>
      <AppShell>{children}</AppShell>
      <PersonaOnboarding />
    </>
  )
}
