import type { Metadata } from 'next'
import { Suspense } from 'react'
import SignupClient from './SignupClient'

export const metadata: Metadata = {
  title: 'Inscription · Kodo Cards',
  description: 'Crée ton compte Kodo Cards et commence à gérer ta collection Pokemon TCG dès aujourd hui. Gratuit, sans engagement.',
  openGraph: {
    title: 'Inscription · Kodo Cards',
    description: 'Rejoins Kodo Cards, le tracker Pokemon TCG en français.',
  },
}

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  return (
    <Suspense fallback={<div />}>
      <SignupClient />
    </Suspense>
  )
}
