'use client'
import { useAuth } from '@/lib/useAuth'
import { Whales }  from '@/components/features/alpha/Whales'
import { ProGate } from '@/components/features/alpha/ProGate'
export default function WhalesPage() {
  const { isPro } = useAuth()
  
  if (!isPro) return <ProGate page="whales"><Whales isPro={false} /></ProGate>
  return <Whales isPro={true} />
}
