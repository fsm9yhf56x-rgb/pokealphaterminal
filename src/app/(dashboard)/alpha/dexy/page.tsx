'use client'
import { useAuth } from '@/lib/useAuth'
import { DexyChat } from '@/components/features/alpha/DexyChat'
import { ProGate }  from '@/components/features/alpha/ProGate'
export default function DexyPage() {
  const { isPro } = useAuth()
  
  if (!isPro) return <ProGate page="dexy"><DexyChat isPro={false} /></ProGate>
  return <DexyChat isPro={true} />
}
