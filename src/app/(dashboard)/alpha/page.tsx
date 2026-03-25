import { Signals } from '@/components/features/alpha/Signals'
import { ProGate } from '@/components/features/alpha/ProGate'
export const metadata = { title: 'Signals · Alpha' }
const IS_PRO = false
export default function AlphaPage() {
  if (!IS_PRO) return <ProGate page="signals"><Signals isPro={false} /></ProGate>
  return <Signals isPro={true} />
}
