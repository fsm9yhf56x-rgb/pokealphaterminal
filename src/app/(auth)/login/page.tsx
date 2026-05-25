import type { Metadata } from 'next'
import { Suspense } from 'react'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Connexion · Kodo Cards',
  description: 'Connecte-toi à Kodo Cards pour gérer ta collection Pokemon TCG, suivre la valeur de tes cartes et compléter tes Master Sets.',
  openGraph: {
    title: 'Connexion · Kodo Cards',
    description: 'Le tracker que ta collection Pokemon TCG mérite.',
  },
}

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginClient />
    </Suspense>
  )
}
