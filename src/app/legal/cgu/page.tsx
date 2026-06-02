import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'CGU — Kodo Cards', description: "Conditions générales d'utilisation de Kodo Cards." }

export default function Page() {
  return (
    <PublicDoc title="Conditions générales d’utilisation" updated="à compléter">
      <p>Document en cours de finalisation avant l’ouverture publique. Pour toute question : <a href="mailto:contact@kodocards.com">contact@kodocards.com</a>.</p>
      <h2>1. Objet</h2>
      <p>[À compléter — description du service, acceptation des conditions.]</p>
      <h2>2. Compte utilisateur</h2>
      <p>[À compléter — inscription, responsabilités, résiliation.]</p>
      <h2>3. Abonnements</h2>
      <p>[À compléter — formules, paiement, droit de rétractation.]</p>
    </PublicDoc>
  )
}
