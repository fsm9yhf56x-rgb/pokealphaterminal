import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Cookies — Kodo Cards', description: 'Politique de cookies de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Politique de cookies" updated="à compléter">
      <p>Document en cours de finalisation.</p>
      <h2>Cookies utilisés</h2>
      <p>[À compléter — cookies essentiels (session, auth), mesure d’audience.]</p>
      <h2>Gestion du consentement</h2>
      <p>[À compléter.]</p>
    </PublicDoc>
  )
}
