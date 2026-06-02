import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Mentions légales — Kodo Cards', description: 'Mentions légales de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Mentions légales" updated="à compléter">
      <h2>Éditeur</h2>
      <p>Kodo Cards — [Raison sociale / statut / SIRET à compléter]. Contact : <a href="mailto:contact@kodocards.com">contact@kodocards.com</a>.</p>
      <h2>Directeur de la publication</h2>
      <p>[À compléter.]</p>
      <h2>Hébergeur</h2>
      <p>Vercel Inc. — [adresse à compléter].</p>
    </PublicDoc>
  )
}
