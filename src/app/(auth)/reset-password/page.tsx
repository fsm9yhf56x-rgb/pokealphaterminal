import type { Metadata } from 'next'
import { Suspense } from 'react'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Nouveau mot de passe · Kodo Cards',
  description: 'Choisis un nouveau mot de passe pour ton compte Kodo Cards.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetPasswordClient />
    </Suspense>
  )
}
