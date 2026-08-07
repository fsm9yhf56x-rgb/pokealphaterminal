import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { sanity, REVALIDATE, urlFor } from '@/lib/sanity/client'
import { POST_QUERY, POST_SLUGS_QUERY, type Post } from '@/lib/sanity/queries'
import PortableBody from '@/components/blog/PortableBody'
import PostCard, { formatDate } from '@/components/blog/PostCard'

export const revalidate = 60

const SITE = 'https://kodocards.com'

async function getPost(slug: string) {
  return sanity.fetch<Post | null>(
    POST_QUERY,
    { slug },
    { next: { revalidate: REVALIDATE, tags: ['post', `post:${slug}`] } },
  )
}

export async function generateStaticParams() {
  const slugs = await sanity.fetch<{ slug: string }[]>(POST_SLUGS_QUERY)
  return slugs.map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Article introuvable — Kodo Cards' }

  const title = post.metaTitle || post.title
  const description = post.metaDescription || post.excerpt
  const image = urlFor(post.coverImage).width(1200).height(630).url()

  return {
    title: `${title} — Kodo Cards`,
    description,
    alternates: { canonical: `${SITE}/blog/${post.slug}` },
    robots: post.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      url: `${SITE}/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author.name] : undefined,
      images: [{ url: image, width: 1200, height: 630, alt: post.coverImage?.alt || title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: [urlFor(post.coverImage).width(1200).height(630).url()],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: post.author
      ? { '@type': 'Person', name: post.author.name, jobTitle: post.author.role }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Kodo Cards',
      url: SITE,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/blog/${post.slug}` },
    inLanguage: 'fr-FR',
  }

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-10 md:px-8 md:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav className="mb-8 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
        <Link href="/blog" className="transition-colors hover:text-[var(--ink)]">
          Blog
        </Link>
        {post.categories?.[0] ? (
          <>
            <span className="mx-2 text-[var(--ink-faint)]">/</span>
            <Link
              href={`/blog/categorie/${post.categories[0].slug}`}
              className="text-[var(--red)] transition-opacity hover:opacity-70"
            >
              {post.categories[0].title}
            </Link>
          </>
        ) : null}
      </nav>

      <article className="mx-auto max-w-[720px]">
        <header className="mb-9">
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--ink)] md:text-[42px]">
            {post.title}
          </h1>
          <p className="mt-4 text-[18px] leading-relaxed text-[var(--ink-muted)]">{post.excerpt}</p>
          <div className="mt-7 flex items-center gap-3 border-t border-[var(--border)] pt-5">
            {post.author?.avatar ? (
              <Image
                src={urlFor(post.author.avatar).width(80).height(80).url()}
                alt={post.author.name}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full border border-[var(--border)] object-cover"
              />
            ) : null}
            <div className="text-[14px] leading-tight">
              {post.author ? (
                <div className="font-medium text-[var(--ink)]">{post.author.name}</div>
              ) : null}
              <div className="text-[var(--ink-muted)]">
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </div>
            </div>
          </div>
        </header>

        <div className="mb-11 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <Image
            src={urlFor(post.coverImage).width(1440).height(900).url()}
            alt={post.coverImage?.alt || post.title}
            width={1440}
            height={900}
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="h-auto w-full"
          />
        </div>

        <div className="pb-4">
          <PortableBody value={post.body} />
        </div>

        {post.categories && post.categories.length > 0 ? (
          <div className="mt-10 flex flex-wrap gap-2 border-t border-[var(--border)] pt-7">
            {post.categories.map((c) => (
              <Link
                key={c.slug}
                href={`/blog/categorie/${c.slug}`}
                className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] text-[var(--ink-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--ink)]"
              >
                {c.title}
              </Link>
            ))}
          </div>
        ) : null}
      </article>

      {post.related?.length > 0 ? (
        <section className="mx-auto mt-16 max-w-[1180px] border-t border-[var(--border)] pt-12">
          <h2 className="mb-8 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            À lire ensuite
          </h2>
          <div className="grid gap-x-7 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
            {post.related.map((p) => (
              <PostCard key={p._id} post={p} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}
