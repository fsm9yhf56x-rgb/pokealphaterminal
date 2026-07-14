import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Cookies — Kodo Cards', description: 'Politique de cookies de Kodo Cards.' }

export default function Page() {
  return (
    <PublicDoc title="Politique de cookies" updated="13/07/2026">
      <p>Notre site utilise des cookies pour améliorer votre expérience de navigation et mesurer l'audience. Lors de votre première visite, un bandeau vous informe de la présence de ces cookies et vous permet de les accepter ou de les refuser globalement ou au cas par cas.</p>
      <p>La politique de cookies fait partie intégrante de notre <a href="/legal/confidentialite">Politique de confidentialité</a>, que nous vous invitons à consulter pour l’ensemble des informations relatives au traitement de vos données personnelles.</p>
    </PublicDoc>
  )
}
