import type { Metadata } from 'next'
import { Suspense } from 'react'
import ForgotPasswordClient from './ForgotPasswordClient'

export const metadata: Metadata = {
  title: 'Mot de passe oublié · Kodo Cards',
  description: 'Réinitialise ton mot de passe Kodo Cards en quelques clics.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ForgotPasswordClient />
    </Suspense>
  )
}
