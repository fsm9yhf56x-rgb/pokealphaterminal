// Fiche carte. La page est un composant SERVEUR qui porte le titre, la
// description et le balisage produit ; l'affichage reste assure par
// CardDetailPage, inchange, monte via un petit composant client.
//
// Pourquoi : CardDetailPage est un composant client. Un robot qui n'execute pas
// de JavaScript — c'est le cas de tous les robots d'assistants — ne voyait rien
// des 45 468 fiches, qui annoncaient toutes le titre "Kodo Cards". Le corps
// reste client ; ce qui compte pour etre trouve et cite entre desormais dans le
// HTML initial.
//
// Rendu A LA DEMANDE avec cache, et non au build : pre-generer 45 468 pages
// allongerait chaque deploiement de plusieurs minutes sans rien apporter.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getCardSeo, getCardAlternates, cardTitle, cardDescription, SITE } from '@/lib/cards/card-seo'
import CardDetailClient from './CardDetailClient'

// Les cotes sont recalculees chaque nuit : une heure de cache suffit.
export const revalidate = 3600
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const card = await getCardSeo(decodeURIComponent(id))
  if (!card) return { title: 'Carte introuvable' }

  const title = cardTitle(card)
  const description = cardDescription(card)
  const languages = await getCardAlternates(card.printId, card.lang)

  return {
    title: `${title} — prix et cote`,
    description,
    alternates: {
      canonical: `${SITE}/cartes/${encodeURIComponent(card.id)}`,
      // Vide quand la carte n'a pas de jumelle indexable : Next n'emet alors
      // aucune balise, ce qui est l'etat correct.
      ...(Object.keys(languages).length ? { languages } : {}),
    },
    openGraph: {
      type: 'website',
      url: `${SITE}/cartes/${encodeURIComponent(card.id)}`,
      title,
      description,
      ...(card.imageUrl ? { images: [{ url: card.imageUrl, alt: card.name }] } : {}),
    },
    twitter: {
      card: card.imageUrl ? 'summary_large_image' : 'summary',
      title,
      description,
    },
  }
}

export default async function CardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cardId = decodeURIComponent(id)
  const card = await getCardSeo(cardId)
  if (!card) notFound()

  const langTag = card.lang === 'fr' ? 'fr-FR' : card.lang === 'jp' ? 'ja-JP' : 'en-US'

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: cardTitle(card),
    description: cardDescription(card),
    category: 'Cartes à collectionner Pokémon',
    inLanguage: langTag,
    url: `${SITE}/cartes/${encodeURIComponent(card.id)}`,
    ...(card.imageUrl ? { image: [card.imageUrl] } : {}),
    ...(card.setName ? { isPartOf: { '@type': 'CreativeWorkSeries', name: card.setName } } : {}),
    ...(card.rarity ? { additionalProperty: [{ '@type': 'PropertyValue', name: 'Rareté', value: card.rarity }] } : {}),
    ...(card.price != null && card.price > 0
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'EUR',
            lowPrice: Math.round(card.price * 100) / 100,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Identite de la carte dans le HTML initial. Visuellement masquee — la
          mise en page reste celle de CardDetailPage — mais lisible par tout ce
          qui n'execute pas de JavaScript. Ce n'est pas du texte cache au sens
          penalise : c'est exactement ce que la page affiche une fois montee. */}
      <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        <h1>{cardTitle(card)}</h1>
        <p>{cardDescription(card)}</p>
      </div>

      <CardDetailClient cardId={cardId} />
    </>
  )
}
