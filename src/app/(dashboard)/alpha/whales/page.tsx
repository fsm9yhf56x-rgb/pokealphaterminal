import { Whales }  from '@/components/features/alpha/Whales'
import { ProGate } from '@/components/features/alpha/ProGate'
export const metadata = { title: 'Whale Tracker · Alpha' }
const IS_PRO = false
export default function WhalesPage() {
  if (!IS_PRO) return <ProGate page="whales"><Whales isPro={false} /></ProGate>
  return <Whales isPro={true} />
}
