// src/app/sitemap-cartes/[chunk]/route.ts
// Les fiches cartes, par tranches de 10 000. Seules celles qui ont une cote ET
// une illustration y figurent — voir sitemap-data.ts pour le raisonnement.

import { getCardUrls, CHUNK_SIZE, SITE, urlEntry, urlset, XML_HEADERS } from '@/lib/seo/sitemap-data'

export const revalidate = 3600

export async function GET(_req: Request, { params }: { params: Promise<{ chunk: string }> }) {
  const { chunk } = await params
  const n = Number(chunk)
  // Un numero de tranche absurde ne doit pas devenir une requete SQL : ce
  // parametre vient de l'URL, donc de n'importe qui.
  if (!Number.isInteger(n) || n < 0 || n > 999) {
    return new Response('Tranche invalide', { status: 404 })
  }

  const rows = await getCardUrls(n * CHUNK_SIZE, CHUNK_SIZE)
  if (!rows.length) return new Response('Tranche vide', { status: 404 })

  const entries = rows.map((r) =>
    urlEntry(`${SITE}/cartes/${encodeURIComponent(r.id)}`, r.lastmod, 'weekly', 0.6)
  )
  return new Response(urlset(entries), { headers: XML_HEADERS })
}
