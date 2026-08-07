import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sanity, REVALIDATE } from '@/lib/sanity/client'
import { CATEGORY_QUERY, CATEGORY_SLUGS_QUERY, type PostCard as PostCardType } from '@/lib/sanity/queries'
import PostCard from '@/components/blog/PostCard'

export const revalidate = 60

const SITE = 'https://kodocards.com'

type CategoryResult = {
  category: { title: string; description?: string; slug: string } | null
  posts: PostCardType[]
}

async function getCategory(slug: string) {
  return sanity.fetch<CategoryResult>(
    CATEGORY_QUERY,
    { slug },
    { next: { revalidate: REVALIDATE, tags: ['post', 'category'] } },
  )
}

export async function generateStaticParams() {
  const slugs = await sanity.fetch<{ slug: string }[]>(CATEGORY_SLUGS_QUERY)
  return slugs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const { category } = await getCategory(slug)
  if (!category) return { title: 'Catégorie introuvable — Kodo Cards' }

  return {
    title: `${category.title} — Blog Kodo Cards`,
    description: category.description || `Nos articles sur ${category.title.toLowerCase()}.`,
    alternates: { canonical: `${SITE}/blog/categorie/${category.slug}` },
  }
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { category, posts } = await getCategory(slug)
  if (!category) notFound()

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
      <header className="mb-12 border-b border-[var(--border)] pb-9">
        <Link
          href="/blog"
          className="font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
        >
          Blog
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)] md:text-[40px]">
          {category.title}
        </h1>
        {category.description ? (
          <p className="mt-3 max-w-[560px] text-[17px] leading-relaxed text-[var(--ink-muted)]">
            {category.description}
          </p>
        ) : null}
      </header>

      {posts.length === 0 ? (
        <p className="text-[16px] text-[var(--ink-muted)]">
          Aucun article dans cette catégorie pour le moment.
        </p>
      ) : (
        <div className="grid gap-x-7 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <PostCard key={post._id} post={post} priority={i < 3} />
          ))}
        </div>
      )}
    </main>
  )
}
