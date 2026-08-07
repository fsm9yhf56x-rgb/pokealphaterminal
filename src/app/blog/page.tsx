import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { sanity, REVALIDATE, urlFor } from '@/lib/sanity/client'
import { POSTS_QUERY, type PostCard as PostCardType } from '@/lib/sanity/queries'
import PostCard, { formatDate } from '@/components/blog/PostCard'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Blog — Kodo Cards',
  description:
    'Analyses du marché Pokémon FR, EN et JP : cotes, gradation, produits scellés et suivi de collection.',
  alternates: { canonical: 'https://kodocards.com/blog' },
  openGraph: {
    type: 'website',
    url: 'https://kodocards.com/blog',
    title: 'Blog — Kodo Cards',
    description: 'Analyses du marché Pokémon FR, EN et JP.',
  },
}

export default async function BlogIndex() {
  const posts = await sanity.fetch<PostCardType[]>(
    POSTS_QUERY,
    {},
    { next: { revalidate: REVALIDATE, tags: ['post'] } },
  )

  const [lead, ...rest] = posts

  return (
    <main className="mx-auto w-full max-w-[1180px] px-5 py-12 md:px-8 md:py-16">
      <header className="mb-12 border-b border-[var(--border)] pb-10">
        <div className="mb-3 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.12em] text-[var(--red)]">
          Le blog
        </div>
        <h1 className="max-w-[680px] font-[family-name:var(--font-display)] text-[34px] font-semibold leading-[1.15] tracking-[-0.02em] text-[var(--ink)] md:text-[44px]">
          Comprendre le marché avant de l&apos;acheter
        </h1>
        <p className="mt-4 max-w-[560px] text-[17px] leading-relaxed text-[var(--ink-muted)]">
          Cotes françaises, gradation, scellé, séries à venir. Ce qu&apos;on lit dans les données
          avant que le prix ne bouge.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <p className="text-[17px] text-[var(--ink)]">Les premiers articles arrivent.</p>
          <p className="mt-2 text-[15px] text-[var(--ink-muted)]">
            En attendant, la cote de vos cartes est déjà en ligne.
          </p>
          <Link
            href="/cartes"
            className="mt-6 inline-block rounded-lg bg-[var(--ink)] px-5 py-2.5 text-[15px] font-medium text-white transition-opacity hover:opacity-90"
          >
            Explorer les cartes
          </Link>
        </div>
      ) : (
        <>
          <Link href={`/blog/${lead.slug}`} className="group mb-14 block">
            <div className="grid gap-7 md:grid-cols-[1.15fr_1fr] md:items-center">
              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
                <Image
                  src={urlFor(lead.coverImage).width(1200).height(750).url()}
                  alt={lead.coverImage?.alt || lead.title}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover transition-opacity duration-300 group-hover:opacity-90"
                />
              </div>
              <div>
                <div className="mb-3 flex items-center gap-2 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
                  {lead.categories?.[0] ? (
                    <span className="text-[var(--red)]">{lead.categories[0].title}</span>
                  ) : null}
                  <span className="text-[var(--ink-faint)]">·</span>
                  <time dateTime={lead.publishedAt}>{formatDate(lead.publishedAt)}</time>
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-[27px] font-semibold leading-[1.2] tracking-[-0.015em] text-[var(--ink)] transition-colors group-hover:text-[var(--red)] md:text-[32px]">
                  {lead.title}
                </h2>
                <p className="mt-3 text-[16px] leading-relaxed text-[var(--ink-muted)]">
                  {lead.excerpt}
                </p>
                {lead.author ? (
                  <p className="mt-5 text-[14px] text-[var(--ink-faint)]">Par {lead.author.name}</p>
                ) : null}
              </div>
            </div>
          </Link>

          {rest.length > 0 ? (
            <div className="grid gap-x-7 gap-y-11 border-t border-[var(--border)] pt-12 sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post) => (
                <PostCard key={post._id} post={post} />
              ))}
            </div>
          ) : null}
        </>
      )}
    </main>
  )
}
