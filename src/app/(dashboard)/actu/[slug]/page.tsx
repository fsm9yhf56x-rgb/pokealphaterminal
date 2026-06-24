'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePersona } from '@/lib/usePersona'
import { newsSlug } from '@/lib/news-slug'

type Item = { title: string; date: string; image?: string; slug?: string; summary?: string | null }
const ACCENT = { collector: '#E03020', investor: '#185FA5' } as const

function fmt(d: string): string {
  const t = new Date(d).getTime()
  if (!t) return ''
  const s = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Page actu propriétaire — titre + RÉSUMÉ ORIGINAL Kodo + visuel.
 * Aucune source, aucun lien sortant, aucune reproduction du texte d'origine.
 */
export default function ActuPage() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug
  const { persona } = usePersona()
  const accent = ACCENT[(persona as 'collector' | 'investor')] ?? ACCENT.collector

  const [item, setItem] = useState<Item | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing'>('loading')

  useEffect(() => {
    let on = true
    fetch('/api/news')
      .then(r => r.json())
      .then(d => {
        if (!on) return
        const list: Item[] = Array.isArray(d.items) ? d.items : []
        const found = list.find(x => (x.slug || newsSlug(x.title)) === slug) || null
        setItem(found)
        setStatus(found ? 'ok' : 'missing')
      })
      .catch(() => { if (on) setStatus('missing') })
    return () => { on = false }
  }, [slug])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <Link href="/home" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#6E6E73] no-underline transition-colors hover:text-[#1D1D1F]">
        <span aria-hidden>←</span> Retour au Daily
      </Link>

      {status === 'loading' && (
        <div className="mt-6 space-y-4">
          <div className="h-4 w-40 animate-pulse rounded bg-[#F5F5F7]" />
          <div className="h-8 w-full animate-pulse rounded bg-[#F5F5F7]" />
          <div className="h-8 w-3/4 animate-pulse rounded bg-[#F5F5F7]" />
          <div className="mt-4 h-20 w-full animate-pulse rounded bg-[#F5F5F7]" />
          <div className="aspect-video w-full animate-pulse rounded-2xl bg-[#F5F5F7]" />
        </div>
      )}

      {status === 'missing' && (
        <div className="mt-10 rounded-2xl border border-[#E5E5EA] bg-white p-8 text-center">
          <div className="text-[15px] font-semibold text-[#1D1D1F]">Cette actu n'est plus à l'affiche</div>
          <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-[#6E6E73]">
            Le fil d'actualité se renouvelle en continu. Reviens au Daily pour les dernières nouvelles.
          </p>
          <Link href="/home" className="mt-5 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline" style={{ background: '#1D1D1F' }}>
            Retour au Daily <span aria-hidden>→</span>
          </Link>
        </div>
      )}

      {status === 'ok' && item && (
        <article className="mt-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white" style={{ background: accent }}>
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> En bref
            </span>
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#86868B]">Actu Pokémon</span>
          </div>

          <h1 className="mt-4 text-[clamp(22px,3.4vw,32px)] font-bold leading-tight text-[#1D1D1F]" style={{ fontFamily: 'var(--font-sora)' }}>
            {item.title}
          </h1>

          {item.date && <div className="mt-2 text-[13px] text-[#86868B]">{fmt(item.date)}</div>}

          {item.summary && (
            <p className="mt-5 text-[16px] leading-relaxed text-[#3A3A3C]" style={{ fontFamily: 'var(--font-sora)' }}>
              {item.summary}
            </p>
          )}

          {item.image && (
            <div className="mt-6 flex items-center justify-center overflow-hidden rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7]">
              <img src={item.image} alt="" className="max-h-[380px] w-full object-contain" />
            </div>
          )}

          <div className="mt-8 border-t border-[#E5E5EA] pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/cartes" className="inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white no-underline" style={{ background: accent }}>
                Explorer le catalogue <span aria-hidden>→</span>
              </Link>
              <Link href="/home" className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E5EA] px-5 py-2.5 text-[13.5px] font-semibold text-[#1D1D1F] no-underline transition-colors hover:bg-[#F5F5F7]">
                Retour au Daily
              </Link>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}
