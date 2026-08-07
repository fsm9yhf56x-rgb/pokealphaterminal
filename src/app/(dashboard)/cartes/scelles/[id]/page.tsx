// Fiche produit scelle, adressable et indexable : /cartes/scelles/fr-sm12-display
//
// Pourquoi une route et non plus ?p=xxx : Google traite un parametre de requete
// comme une variante de la page mere et n'en explore qu'une fraction. Les 617
// produits du catalogue etaient donc des pages fantomes — alors que ce sont les
// seules du site qui portent des liens sortants monetisables.
//
// Le rendu est SERVEUR : le prix, le nom et la serie sont dans le HTML initial.
// Une fiche dont le prix n'apparait qu'apres un fetch client est, pour un
// robot, une fiche sans prix.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSealedById, getAllSealedIds } from '@/lib/sealed/catalog'
import SealedDetail from '@/components/features/cartes/SealedDetail'

const SITE = 'https://kodocards.com'

// Les cotes bougent chaque nuit : une heure de cache suffit, et evite de
// reconstruire 617 pages a chaque passage du pipeline.
export const revalidate = 3600

export async function generateStaticParams() {
  const ids = await getAllSealedIds()
  return ids.map((r) => ({ id: r.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const item = await getSealedById(id)
  if (!item) return { title: 'Produit introuvable — Kodo Cards' }

  const nom = item.shortName || item.name
  const serie = item.setName ? ' — ' + item.setName : ''
  const langue = item.lang === 'FR' ? 'français' : item.lang === 'EN' ? 'anglais' : 'japonais'

  // La description porte le prix quand il existe : c'est ce qui fait cliquer
  // depuis une page de resultats. Sans cote, on ne bluffe pas.
  const desc = item.price && item.price.value > 0
    ? `${nom}${serie} en ${langue} : ${item.price.isAsking ? 'à partir de ' : ''}${Math.round(item.price.value)} €. Annonces en cours, cote et suivi de valeur sur Kodo Cards.`
    : `${nom}${serie} en ${langue}. Suivez sa cote et les annonces en cours sur Kodo Cards.`

  return {
    title: `${nom}${serie} — prix et cote | Kodo Cards`,
    description: desc,
    alternates: { canonical: `${SITE}/cartes/scelles/${item.id}` },
    openGraph: {
      type: 'website',
      url: `${SITE}/cartes/scelles/${item.id}`,
      title: `${nom}${serie}`,
      description: desc,
      images: item.image ? [{ url: item.image, alt: nom }] : undefined,
    },
  }
}

export default async function SealedProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = await getSealedById(id)
  if (!item) notFound()

  const nom = item.shortName || item.name

  // JSON-LD Product : ce qui permet a Google d'afficher le prix directement
  // dans les resultats. L'offre n'est declaree QUE si le prix existe — annoncer
  // une offre sans prix fait rejeter le balisage entier.
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: item.name,
    description: [item.skuLabel, item.content?.label, item.setName].filter(Boolean).join(' · '),
    category: 'Cartes à collectionner Pokémon',
    inLanguage: item.lang === 'FR' ? 'fr-FR' : item.lang === 'EN' ? 'en-US' : 'ja-JP',
    url: `${SITE}/cartes/scelles/${item.id}`,
    ...(item.image ? { image: [item.image] } : {}),
    ...(item.setName ? { isPartOf: { '@type': 'CreativeWorkSeries', name: item.setName } } : {}),
    ...(item.price && item.price.value > 0 && item.price.method !== 'insufficient_data'
      ? {
          offers: {
            '@type': 'AggregateOffer',
            priceCurrency: 'EUR',
            lowPrice: Math.round(item.price.value * 100) / 100,
            offerCount: item.price.sampleSize ?? item.price.sellers ?? 1,
            availability: 'https://schema.org/InStock',
          },
        }
      : {}),
  }

  return (
    <main style={{ maxWidth: 1160, margin: '0 auto', width: '100%', padding: '28px 24px 72px' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#86868B', fontFamily: 'var(--font-display)', marginBottom: 22 }}>
        <Link href="/cartes/scelles" style={{ color: '#86868B', textDecoration: 'none' }}>
          Produits scellés
        </Link>
        {item.setName ? (
          <>
            <span style={{ margin: '0 8px', color: '#C7C7CC' }}>/</span>
            <Link
              href={`/cartes/scelles?set=${encodeURIComponent(item.setId || '')}`}
              style={{ color: '#E03020', textDecoration: 'none' }}
            >
              {item.setName}
            </Link>
          </>
        ) : null}
      </nav>

      <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <SealedDetail item={item} variant="page" />

        <div style={{ flex: 1, minWidth: 280, maxWidth: 520 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', fontFamily: 'var(--font-display)', margin: '0 0 12px' }}>
            Ce que vous regardez
          </h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#6E6E73', margin: '0 0 14px' }}>
            Un {item.skuLabel.toLowerCase()}
            {item.setName ? ` de la série ${item.setName}` : ''}
            {item.lang === 'FR' ? ', en français' : item.lang === 'EN' ? ', en anglais' : ', en japonais'}
            {item.boosters ? `, contenant ${item.boosters} boosters` : item.content ? `, contenant ${item.content.label}` : ''}.
          </p>
          <p style={{ fontSize: 14.5, lineHeight: 1.65, color: '#6E6E73', margin: '0 0 14px' }}>
            {item.lang === 'FR'
              ? 'La cote affichée provient des annonces relevées sur le marché français. Ce sont des prix demandés, pas des ventes conclues : ils indiquent où se situe l’offre, pas ce qu’un acheteur a réellement payé.'
              : 'La cote affichée provient du marché américain, convertie en euros. Un même produit peut se négocier différemment en Europe.'}
          </p>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: '#86868B', margin: 0 }}>
            Les produits scellés ne se comparent qu’à format égal : un display et
            un demi-display portent le même nom de série mais pas la même
            quantité. C’est pourquoi chaque format a sa propre fiche.
          </p>
        </div>
      </div>
    </main>
  )
}
