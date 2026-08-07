// src/lib/seo/sitemap-data.ts
// Quelles URLs sont declarees a Google, et pourquoi.
//
// REGLE CENTRALE : une fiche sans cote et sans illustration n'a rien a dire.
// C'est le meme raisonnement que insufficient_data -> NULL affiche : on ne
// publie pas une page vide pour faire du volume. Sur 75 144 fiches cartes,
// 45 468 passent le filtre. Les 30 000 autres restent accessibles et
// indexables si un lien externe pointe dessus — on ne les cache pas, on ne les
// propose simplement pas.
//
// Pourquoi ce n'est pas cosmetique : Google n'explore qu'un nombre limite
// d'URLs par site et par jour. Chaque page vide exploree est une page utile
// qui ne l'est pas, et un volume de pages pauvres fait baisser l'evaluation du
// domaine entier.

export const SITE = 'https://kodocards.com'

// 10 000 par fichier alors que la limite est de 50 000 : le catalogue grossit
// chaque nuit, et un sitemap qui deborde en silence est une panne qu'on ne
// voit pas passer.
export const CHUNK_SIZE = 10000

async function db() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.DATABASE_URL as string)
}

/**
 * Le join porte sur print_id ET lang : une carte francaise et son equivalent
 * anglais partagent le meme print mais pas la meme cote. Sans le second
 * critere, une fiche FR sans cote heriterait du prix EN et entrerait a tort.
 */
const CARD_FILTER = `
  FROM k_cards c
  JOIN price_signals s ON s.print_id = c.print_id AND s.lang = c.lang
 WHERE c.has_image = true
   AND s.fair_value_eur IS NOT NULL
`

export async function countIndexableCards(): Promise<number> {
  const sql = await db()
  const r = await sql.query(`SELECT count(*)::int n ${CARD_FILTER}`)
  return r[0] ? Number(r[0].n) : 0
}

export async function getCardUrls(offset: number, limit: number): Promise<{ id: string; lastmod: string | null }[]> {
  const sql = await db()
  // ORDER BY c.id : l'ordre doit etre STABLE entre deux regenerations, sinon
  // une carte change de fichier a chaque passe et Google revoit tout.
  const rows = await sql.query(
    `SELECT c.id, s.computed_at ${CARD_FILTER} ORDER BY c.id LIMIT $1 OFFSET $2`,
    [limit, offset]
  )
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    lastmod: (r.computed_at as string) ?? null,
  }))
}

export async function getSealedUrls(): Promise<{ id: string; lastmod: string | null }[]> {
  const sql = await db()
  const rows = await sql.query(
    `SELECT p.id, sp.last_priced_at
       FROM k_sealed_products p
       LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
      WHERE p.source IN ('ebay_fr','ebay_us')
      ORDER BY p.id`
  )
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    lastmod: (r.last_priced_at as string) ?? null,
  }))
}

/**
 * Pages fixes. Ce qui n'y figure PAS est deliberé :
 *   - /portfolio, /parametres, /abonnement, /parrainage : personnelles. Servies
 *     publiquement mais sans contenu propre — une page vide dupliquee pour
 *     chaque visiteur.
 *   - /admin, /dev-ui, /scan-test : internes.
 *   - (auth) : formulaires. Rien a indexer, et Google n'aime pas les proposer.
 */
export const STATIC_PAGES: { path: string; priority: number; changefreq: string }[] = [
  { path: '/', priority: 1.0, changefreq: 'daily' },
  { path: '/cartes', priority: 0.9, changefreq: 'daily' },
  { path: '/cartes/scelles', priority: 0.9, changefreq: 'daily' },
  { path: '/cartes/jeux', priority: 0.6, changefreq: 'weekly' },
  { path: '/market', priority: 0.8, changefreq: 'daily' },
  { path: '/market/movers', priority: 0.7, changefreq: 'daily' },
  { path: '/market/tendances', priority: 0.7, changefreq: 'daily' },
  { path: '/market/sous-evalues', priority: 0.7, changefreq: 'daily' },
  { path: '/market/spreads', priority: 0.6, changefreq: 'daily' },
  { path: '/releases', priority: 0.8, changefreq: 'weekly' },
  { path: '/culture', priority: 0.7, changefreq: 'weekly' },
  { path: '/culture/artistes', priority: 0.7, changefreq: 'weekly' },
  { path: '/culture/eres', priority: 0.6, changefreq: 'monthly' },
  { path: '/culture/lore', priority: 0.6, changefreq: 'monthly' },
  { path: '/culture/curiosites', priority: 0.6, changefreq: 'monthly' },
  { path: '/blog', priority: 0.8, changefreq: 'daily' },
  { path: '/a-propos', priority: 0.5, changefreq: 'monthly' },
  { path: '/telecharger', priority: 0.5, changefreq: 'monthly' },
  { path: '/legal/cgu', priority: 0.2, changefreq: 'yearly' },
  { path: '/legal/cgv', priority: 0.2, changefreq: 'yearly' },
  { path: '/legal/confidentialite', priority: 0.2, changefreq: 'yearly' },
  { path: '/legal/mentions', priority: 0.2, changefreq: 'yearly' },
  { path: '/legal/cookies', priority: 0.2, changefreq: 'yearly' },
]

export function xmlEscape(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

export function urlEntry(loc: string, lastmod?: string | null, changefreq?: string, priority?: number): string {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority != null ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n')
}

export function urlset(entries: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join('\n')}
</urlset>`
}

export const XML_HEADERS = {
  'Content-Type': 'application/xml; charset=utf-8',
  'Cache-Control': 'public, max-age=3600, s-maxage=3600',
}
