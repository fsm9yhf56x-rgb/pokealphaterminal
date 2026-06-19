import type { Metadata } from 'next'
import PublicDoc from '@/components/layout/PublicDoc'

export const metadata: Metadata = {
  title: 'Blog — Kodo Cards',
  description: 'Tendances FR / EN / JP et guides pour collectionneurs Pokémon.',
}

export default function Page() {
  return (
    <PublicDoc
      title="Le blog arrive bientôt"
      subtitle="Tendances FR / EN / JP et guides pour collectionneurs : cotes, gradation, et tout pour ta collection."
    >
      <p>On prépare nos premiers articles : décryptage des cotes FR, conseils de gradation, et comment suivre la valeur de ta collection.</p>
      <p>En attendant, retrouvez les formules et l’accès anticipé depuis <a href="/#pricing">la page d’accueil</a>.</p>
    </PublicDoc>
  )
}
