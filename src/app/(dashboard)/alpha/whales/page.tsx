'use client'
import { useAuth } from '@/lib/auth/AuthContext'
import { Whales }  from '@/components/features/alpha/Whales'
import { ProGate } from '@/components/features/alpha/ProGate'
export default function WhalesPage() {
  const { user } = useAuth()
  const isPro    = user?.plan === 'pro'
  if (!isPro) return <ProGate page="whales"><Whales isPro={false} /></ProGate>
  return <Whales isPro={true} />
}
