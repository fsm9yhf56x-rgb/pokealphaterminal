'use client'
import { Performance } from '@/components/features/portfolio/performance/Performance'
import { PersonaGuard } from '@/components/onboarding/PersonaGuard'

export default function PerformancePage() {
  return <PersonaGuard redirectTo="/portfolio"><Performance /></PersonaGuard>
}
