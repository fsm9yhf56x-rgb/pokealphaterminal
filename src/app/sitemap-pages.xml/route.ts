// src/app/sitemap-pages.xml/route.ts
// Pages fixes du site. La liste vit dans src/lib/seo/sitemap-data.ts avec le
// detail de ce qui en est exclu et pourquoi.

import { STATIC_PAGES, SITE, urlEntry, urlset, XML_HEADERS } from '@/lib/seo/sitemap-data'

export const revalidate = 86400

export async function GET() {
  const entries = STATIC_PAGES.map((p) => urlEntry(SITE + p.path, null, p.changefreq, p.priority))
  return new Response(urlset(entries), { headers: XML_HEADERS })
}
