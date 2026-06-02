import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = {
  title: 'À propos — Kodo Cards',
  description: "La mission de Kodo Cards : l'intelligence du marché Pokémon TCG, pensée pour le marché français.",
}

export default function Page() {
  return (
    <PublicDoc
      title="À propos de Kodo Cards"
      subtitle="L’intelligence du marché Pokémon TCG, enfin pensée pour le marché français."
    >
      <p>Le marché du TCG Pokémon a explosé, mais collectionneurs et investisseurs naviguent encore à l’aveugle : prix éparpillés entre eBay, Cardmarket et PSA, intuition à la place de la donnée.</p>
      <h2>Notre mission</h2>
      <p>Réunir tout le marché dans une seule fenêtre : prix consolidés, cote FR native, suivi de portefeuille et — bientôt — signaux IA et lecture des grands mouvements. Transformer une collection en patrimoine piloté.</p>
      <h2>Pourquoi le marché français</h2>
      <p>La cote d’une carte française n’est pas une conversion du prix US. Nous la traitons pour elle-même, et nous restons neutres face aux certificateurs (PSA, PCA, CCC) pour vous dire lequel offre la meilleure liquidité.</p>
      <p>Une question, une idée ? <a href="mailto:contact@kodocards.com">contact@kodocards.com</a></p>
    </PublicDoc>
  )
}
