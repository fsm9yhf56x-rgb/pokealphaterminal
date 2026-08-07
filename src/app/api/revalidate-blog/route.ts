import { revalidateTag } from 'next/cache'
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook'
import type { NextRequest } from 'next/server'

/**
 * Appelé par Sanity à chaque publication. La signature est vérifiée avec
 * SANITY_REVALIDATE_SECRET : sans elle, n'importe qui pourrait vider le cache
 * en boucle et faire grimper la facture Vercel.
 *
 * Note : un article planifié ne déclenche pas de webhook à l'heure dite. C'est
 * le revalidate de 60 s des pages qui le fait apparaître, avec au pire une
 * minute de décalage.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) {
    return new Response('SANITY_REVALIDATE_SECRET absent', { status: 500 })
  }

  const signature = req.headers.get(SIGNATURE_HEADER_NAME)
  if (!signature) {
    return new Response('Signature absente', { status: 401 })
  }

  // Le corps brut est indispensable : la signature porte sur les octets reçus,
  // pas sur l'objet reconstruit après JSON.parse.
  const raw = await req.text()
  if (!(await isValidSignature(raw, signature, secret))) {
    return new Response('Signature invalide', { status: 401 })
  }

  let body: { _type?: string; slug?: { current?: string } }
  try {
    body = JSON.parse(raw)
  } catch {
    return new Response('Corps de requête illisible', { status: 400 })
  }

  if (!body?._type) {
    return new Response('Corps de requête incomplet', { status: 400 })
  }

  revalidateTag(body._type, 'max')
  if (body._type === 'post' && body.slug?.current) {
    revalidateTag(`post:${body.slug.current}`, 'max')
  }

  return Response.json({ revalidated: true, type: body._type, at: Date.now() })
}
