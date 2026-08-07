// src/app/sitemap.xml/route.ts
// Index des sitemaps. C'est LA seule adresse a declarer dans robots.txt et dans
// Google Search Console : elle liste les autres, qui peuvent apparaitre ou
// disparaitre sans qu'on retouche quoi que ce soit.

import { countIndexableCards, CHUNK_SIZE, SITE, XML_HEADERS, xmlEscape } from '@/lib/seo/sitemap-data'

export const revalidate = 3600

export async function GET() {
  const total = await countIndexableCards()
  const chunks = Math.max(Math.ceil(total / CHUNK_SIZE), 1)

  const maps = [
    `${SITE}/sitemap-pages.xml`,
    `${SITE}/sitemap-scelles.xml`,
    `${SITE}/blog/sitemap.xml`,
    ...Array.from({ length: chunks }, (_, i) => `${SITE}/sitemap-cartes/${i}`),
  ]

  const today = new Date().toISOString().slice(0, 10)
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${maps.map((m) => `  <sitemap>\n    <loc>${xmlEscape(m)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`).join('\n')}
</sitemapindex>`

  return new Response(xml, { headers: XML_HEADERS })
}
