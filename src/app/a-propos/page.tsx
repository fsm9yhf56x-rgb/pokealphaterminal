import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = {
  title: 'À propos — Kodo Cards',
  description: "La mission de Kodo Cards : réunir ta collection Pokémon et sa vraie valeur, pensée pour le marché français.",
}

export default function Page() {
  return (
    <PublicDoc
      title="À propos de Kodo Cards"
      subtitle="Toute ta collection Pokémon et sa vraie valeur, enfin pensées pour le marché français."
    >
      <p>Le marché du TCG Pokémon a explosé, mais suivre sa collection reste un casse-tête : prix éparpillés entre eBay, Cardmarket et les sociétés de gradation, et on finit par collectionner à l’aveugle.</p>
      <h2>Notre mission</h2>
      <p>Réunir toute ta collection dans une seule fenêtre : tes cartes, leur cote du jour, ta progression set par set. Et bientôt, des outils d’analyse pour aller plus loin — toujours au service de ta collection.</p>
      <h2>Pourquoi le marché français</h2>
      <p>La cote d’une carte française n’est pas une conversion du prix US. Nous la traitons pour elle-même, et nous restons neutres face aux certificateurs (PSA, PCA, CCC) pour vous dire lequel offre la meilleure liquidité.</p>
      <p>Une question, une idée ? <a href="mailto:contact@kodocards.com">contact@kodocards.com</a></p>
    </PublicDoc>
  )
}
