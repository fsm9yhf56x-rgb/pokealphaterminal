'use client'

import AlphaSignals from '@/components/features/alpha/AlphaSignals'
import { PersonaGuard } from '@/components/onboarding/PersonaGuard'

export default function AlphaPage() {
  return <PersonaGuard redirectTo="/home"><AlphaSignals /></PersonaGuard>
}
