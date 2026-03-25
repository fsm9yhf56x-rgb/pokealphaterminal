import { DexyChat } from '@/components/features/alpha/DexyChat'
import { ProGate }  from '@/components/features/alpha/ProGate'
export const metadata = { title: 'Dexy AI · Alpha' }
const IS_PRO = false
export default function DexyPage() {
  if (!IS_PRO) return <ProGate page="dexy"><DexyChat isPro={false} /></ProGate>
  return <DexyChat isPro={true} />
}
