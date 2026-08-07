import Image from 'next/image'
import Link from 'next/link'
import { urlFor } from '@/lib/sanity/client'
import type { PostCard as PostCardType } from '@/lib/sanity/queries'

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function PostCard({ post, priority = false }: { post: PostCardType; priority?: boolean }) {
  return (
    <article className="group">
      <Link href={`/blog/${post.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <Image
            src={urlFor(post.coverImage).width(800).height(500).url()}
            alt={post.coverImage?.alt || post.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            priority={priority}
            className="object-cover transition-opacity duration-300 group-hover:opacity-90"
          />
        </div>
        <div className="mt-4">
          <div className="mb-2 flex items-center gap-2 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            {post.categories?.[0] ? <span className="text-[var(--red)]">{post.categories[0].title}</span> : null}
            <span className="text-[var(--ink-faint)]">·</span>
            <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-[19px] font-semibold leading-snug tracking-[-0.01em] text-[var(--ink)] transition-colors group-hover:text-[var(--red)]">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-[var(--ink-muted)]">
            {post.excerpt}
          </p>
        </div>
      </Link>
    </article>
  )
}
