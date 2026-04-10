'use client'
import { useAuth } from '@/lib/useAuth'
import { DealHunter } from '@/components/features/alpha/DealHunter'
import { ProGate }    from '@/components/features/alpha/ProGate'
export default function DealsPage() {
  const { isPro } = useAuth()
  
  if (!isPro) return <ProGate page="deals"><DealHunter isPro={false} /></ProGate>
  return <DealHunter isPro={true} />
}
