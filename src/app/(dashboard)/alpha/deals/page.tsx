'use client'
import { useAuth }    from '@/lib/auth/AuthContext'
import { DealHunter } from '@/components/features/alpha/DealHunter'
import { ProGate }    from '@/components/features/alpha/ProGate'
export default function DealsPage() {
  const { user } = useAuth()
  const isPro    = user?.plan === 'pro'
  if (!isPro) return <ProGate page="deals"><DealHunter isPro={false} /></ProGate>
  return <DealHunter isPro={true} />
}
