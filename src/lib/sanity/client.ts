import { createClient } from '@sanity/client'
import imageUrlBuilder from '@sanity/image-url'
import type { SanityImageSource } from '@sanity/image-url'

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production'

// Figée volontairement : une date d'API mouvante fait bouger les résultats
// sans qu'on ait touché au code.
export const apiVersion = '2026-01-01'

/**
 * useCdn: false est délibéré. Les requêtes contiennent now() pour masquer les
 * articles planifiés ; le CDN Sanity servirait une réponse figée et un article
 * programmé sortirait en retard. Le cache ISR de Next fait le travail à sa
 * place : une requête toutes les REVALIDATE secondes, pas une par visiteur.
 *
 * On passe par @sanity/client et non next-sanity : ce dernier exige React 19
 * alors que l'app est en React 18. next-sanity n'apportait que defineLive
 * (qu'on n'utilise pas, il fait exploser le quota en Next 16), la balise groq
 * et un helper de webhook — les deux derniers sont repris ailleurs sans
 * dépendance à React.
 */
export const sanity = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: false,
  perspective: 'published',
})

export const REVALIDATE = 60

const builder = imageUrlBuilder({ projectId, dataset })

export function urlFor(source: SanityImageSource) {
  return builder.image(source).auto('format').fit('max')
}
