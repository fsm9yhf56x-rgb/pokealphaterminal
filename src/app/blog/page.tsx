import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = {
  title: 'Blog — Kodo Cards',
  description: 'Analyses, tendances et guides du marché Pokémon TCG.',
}

export default function Page() {
  return (
    <PublicDoc
      title="Le blog arrive bientôt"
      subtitle="Analyses de marché, tendances FR / EN / JP et guides pour collectionneurs et investisseurs."
    >
      <p>On prépare nos premiers articles : décryptage des cotes FR, stratégie de gradation, lecture des cycles de marché.</p>
      <p>En attendant, retrouvez les formules et l’accès anticipé depuis <a href="/#pricing">la page d’accueil</a>.</p>
    </PublicDoc>
  )
}
