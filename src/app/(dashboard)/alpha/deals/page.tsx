import { DealHunter } from '@/components/features/alpha/DealHunter'
import { ProGate }    from '@/components/features/alpha/ProGate'
export const metadata = { title: 'Deal Hunter · Alpha' }
const IS_PRO = false
export default function DealsPage() {
  if (!IS_PRO) return <ProGate page="deals"><DealHunter isPro={false} /></ProGate>
  return <DealHunter isPro={true} />
}
