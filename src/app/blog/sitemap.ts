import type { MetadataRoute } from 'next'
import { sanity } from '@/lib/sanity/client'
import { POST_SLUGS_QUERY, CATEGORY_SLUGS_QUERY } from '@/lib/sanity/queries'

const SITE = 'https://kodocards.com'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([
    sanity.fetch<{ slug: string; publishedAt: string }[]>(POST_SLUGS_QUERY),
    sanity.fetch<{ slug: string }[]>(CATEGORY_SLUGS_QUERY),
  ])

  return [
    { url: `${SITE}/blog`, changeFrequency: 'daily', priority: 0.8 },
    ...posts.map((p) => ({
      url: `${SITE}/blog/${p.slug}`,
      lastModified: new Date(p.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...categories.map((c) => ({
      url: `${SITE}/blog/categorie/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
  ]
}
