'use client'
import { useAuth }   from '@/lib/auth/AuthContext'
import { Signals }   from '@/components/features/alpha/Signals'
import { ProGate }   from '@/components/features/alpha/ProGate'
export default function AlphaPage() {
  const { user } = useAuth()
  const isPro    = user?.plan === 'pro'
  if (!isPro) return <ProGate page="signals"><Signals isPro={false} /></ProGate>
  return <Signals isPro={true} />
}
