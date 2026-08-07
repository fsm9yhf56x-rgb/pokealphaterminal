import Image from 'next/image'
import Link from 'next/link'
import { PortableText, type PortableTextComponents } from '@portabletext/react'
import { urlFor } from '@/lib/sanity/client'

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="mb-5 text-[17px] leading-[1.75] text-[var(--ink)]">{children}</p>
    ),
    h2: ({ children, value }) => (
      <h2
        id={slugify(value)}
        className="mt-12 mb-4 scroll-mt-24 font-[family-name:var(--font-display)] text-[26px] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink)]"
      >
        {children}
      </h2>
    ),
    h3: ({ children, value }) => (
      <h3
        id={slugify(value)}
        className="mt-8 mb-3 scroll-mt-24 font-[family-name:var(--font-display)] text-[19px] font-semibold text-[var(--ink)]"
      >
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-[var(--red)] pl-5 text-[17px] italic leading-relaxed text-[var(--ink-muted)]">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-6 ml-1 space-y-2 text-[17px] leading-[1.7] text-[var(--ink)] [&>li]:relative [&>li]:pl-5">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mb-6 ml-5 list-decimal space-y-2 text-[17px] leading-[1.7] text-[var(--ink)] marker:text-[var(--ink-faint)]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => (
      <li className="before:absolute before:left-0 before:top-[0.7em] before:h-[5px] before:w-[5px] before:rounded-full before:bg-[var(--red)] before:content-['']">
        {children}
      </li>
    ),
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    code: ({ children }) => (
      <code className="rounded bg-[var(--bg)] px-1.5 py-0.5 font-[family-name:var(--font-data)] text-[14px] text-[var(--ink)]">
        {children}
      </code>
    ),
    link: ({ children, value }) => (
      <a
        href={value?.href}
        target="_blank"
        rel={value?.sponsored ? 'sponsored noopener noreferrer' : 'noopener noreferrer'}
        className="text-[var(--red)] underline decoration-[var(--red-border)] underline-offset-2 transition-colors hover:decoration-[var(--red)]"
      >
        {children}
      </a>
    ),
    internalLink: ({ children, value }) => (
      <Link
        href={value?.path || '/'}
        className="text-[var(--red)] underline decoration-[var(--red-border)] underline-offset-2 transition-colors hover:decoration-[var(--red)]"
      >
        {children}
      </Link>
    ),
  },
  types: {
    image: ({ value }) => (
      <figure className="my-10">
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
          <Image
            src={urlFor(value).width(1400).url()}
            alt={value.alt || ''}
            width={1400}
            height={900}
            sizes="(max-width: 768px) 100vw, 720px"
            className="h-auto w-full"
          />
        </div>
        {value.caption ? (
          <figcaption className="mt-2 text-center text-[13px] text-[var(--ink-muted)]">
            {value.caption}
          </figcaption>
        ) : null}
      </figure>
    ),
    callout: ({ value }) => {
      const tone = value.tone || 'info'
      const style =
        tone === 'warning'
          ? 'border-[var(--red-border)] bg-[var(--red-light)]'
          : tone === 'key'
            ? 'border-[var(--green-border)] bg-[var(--green-light)]'
            : 'border-[var(--border)] bg-[var(--bg)]'
      const label = tone === 'warning' ? 'À retenir' : tone === 'key' ? 'Point clé' : 'Info'
      return (
        <aside className={`my-8 rounded-xl border p-5 ${style}`}>
          <div className="mb-1.5 font-[family-name:var(--font-data)] text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            {label}
          </div>
          <p className="text-[16px] leading-relaxed text-[var(--ink)]">{value.text}</p>
        </aside>
      )
    },
  },
}

function slugify(value: { children?: unknown[] }): string {
  // Les enfants d'un bloc ne sont pas tous du texte : une annotation ou un
  // objet personnalise n'a pas de propriete `text`. On ne garde que ce qui en a.
  const text = (value?.children || [])
    .map((c) => (typeof c === 'object' && c !== null && 'text' in c ? String((c as { text?: unknown }).text ?? '') : ''))
    .join(' ')
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function PortableBody({ value }: { value: unknown[] }) {
  return <PortableText value={value as never} components={components} />
}
