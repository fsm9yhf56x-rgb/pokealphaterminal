// src/app/sitemap-scelles.xml/route.ts
// Les 617 fiches produits scelles. Elles tiennent dans un seul fichier et
// portent les liens sortants monetisables : ce sont les pages du site qui ont
// le plus a gagner a etre trouvees.

import { getSealedUrls, SITE, urlEntry, urlset, XML_HEADERS } from '@/lib/seo/sitemap-data'

export const revalidate = 3600

export async function GET() {
  const rows = await getSealedUrls()
  const entries = rows.map((r) =>
    urlEntry(`${SITE}/cartes/scelles/${r.id}`, r.lastmod, 'weekly', 0.7)
  )
  return new Response(urlset(entries), { headers: XML_HEADERS })
}
