'use client'
import { useAuth }  from '@/lib/auth/AuthContext'
import { DexyChat } from '@/components/features/alpha/DexyChat'
import { ProGate }  from '@/components/features/alpha/ProGate'
export default function DexyPage() {
  const { user } = useAuth()
  const isPro    = user?.plan === 'pro'
  if (!isPro) return <ProGate page="dexy"><DexyChat isPro={false} /></ProGate>
  return <DexyChat isPro={true} />
}
