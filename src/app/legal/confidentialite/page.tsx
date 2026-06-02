import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = { title: 'Confidentialité — Kodo Cards', description: 'Politique de confidentialité et traitement des données (RGPD).' }

export default function Page() {
  return (
    <PublicDoc title="Politique de confidentialité" updated="à compléter">
      <p>Document en cours de finalisation. Délégué / contact données : <a href="mailto:contact@kodocards.com">contact@kodocards.com</a>.</p>
      <h2>1. Données collectées</h2>
      <p>[À compléter — email, données de compte, données d’usage.]</p>
      <h2>2. Finalités</h2>
      <p>[À compléter — fourniture du service, mesure d’audience, communication.]</p>
      <h2>3. Vos droits (RGPD)</h2>
      <p>[À compléter — accès, rectification, effacement, portabilité. Exercice via contact@kodocards.com.]</p>
    </PublicDoc>
  )
}
