'use client'
// Enveloppe cliente minimale. Elle existe pour que page.tsx puisse etre un
// composant SERVEUR (donc porter generateMetadata et le JSON-LD) tout en
// montant CardDetailPage, qui est client et le reste.
//
// L'identifiant n'est plus lu via useParams mais recu en prop : il a deja ete
// decode et valide cote serveur.

import { CardDetailPage } from '@/components/features/card/CardDetailPage'

export default function CardDetailClient({ cardId }: { cardId: string }) {
  return <CardDetailPage cardId={cardId} />
}
