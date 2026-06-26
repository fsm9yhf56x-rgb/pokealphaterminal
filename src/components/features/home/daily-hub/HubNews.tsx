'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { newsSlug } from '@/lib/news-slug'

type Item = { title: string; date: string; slug?: string; summary?: string | null; image?: string | null; lang?: 'fr' | 'en' }

const clamp = (n: number) =>
  ({ display: '-webkit-box', WebkitLineClamp: String(n), WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' })

// Renvoie le libellé prêt à afficher (avec ou sans "il y a" selon le cas).
function rel(d: string): string {
  const t = new Date(d).getTime()
  if (!t) return ''
  const diff = Date.now() - t
  const day = 864e5
  if (diff < 0) return "à l'instant"
  if (diff < 36e5) return `il y a ${Math.max(1, Math.round(diff / 6e4))} min`
  if (diff < day) return `il y a ${Math.round(diff / 36e5)} h`
  const dd = Math.round(diff / day)
  if (dd === 1) return 'hier'
  if (dd < 7) return `il y a ${dd} j`
  // au-delà d'une semaine : date absolue, SANS "il y a"
  return `le ${new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
}

/**
 * KODO WIRE — fil de titres TCG (cartes), en français, type terminal.
 * Défilement continu, pause au survol. Chaque carte ouvre /actu (résumé Kodo).
 * Aucune attribution, aucun lien sortant.
 */
export function HubNews({ accent = '#E03020' }: { accent?: string }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<'all' | 'fr' | 'en'>('all')

  useEffect(() => {
    let on = true
    fetch('/api/news', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (on) setItems(Array.isArray(d.items) ? d.items : []) })
      .catch(() => {})
      .finally(() => { if (on) setLoading(false) })
    return () => { on = false }
  }, [])

  if (loading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3].map(i => <div key={i} className="h-[74px] w-[300px] shrink-0 animate-pulse rounded-xl bg-[#F5F5F7]" />)}
      </div>
    )
  }
  if (!items.length) return null

  const shown = lang === 'all' ? items : items.filter(i => (i.lang || 'en') === lang)
  const list = shown.length ? shown : items
  const loop = [...list, ...list]
  const dur = Math.max(36, list.length * 5)
  const hasFr = items.some(i => i.lang === 'fr')
  const hasEn = items.some(i => i.lang === 'en')
  const showFilter = hasFr && hasEn

  return (
    <div>
      <style>{`
        @keyframes knewsScroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        .knews-track { animation: knewsScroll linear infinite; }
        .knews-strip:hover .knews-track { animation-play-state: paused; }
        .knews-card { transition: box-shadow .2s, transform .2s, border-color .2s; }
        .knews-card:hover { box-shadow: 0 8px 22px rgba(0,0,0,0.09); transform: translateY(-2px); }
        @media (prefers-reduced-motion: reduce) {
          .knews-track { animation: none; }
          .knews-strip { overflow-x: auto; }
          .knews-strip::-webkit-scrollbar { display: none; }
        }
      `}</style>

      <div className="mb-2.5 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: accent }} />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: accent }} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1D1D1F]">Actu TCG</span>
        <span className="text-[11px] font-medium text-[#86868B]">en direct</span>
        {showFilter && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#F5F5F7] p-0.5">
            {(['all', 'fr', 'en'] as const).map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors"
                style={{
                  background: lang === l ? '#fff' : 'transparent',
                  color: lang === l ? '#1D1D1F' : '#86868B',
                  boxShadow: lang === l ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {l === 'all' ? 'Tout' : l}
              </button>
            ))}
          </span>
        )}
      </div>

      <div
        className="knews-strip relative overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 44px, #000 calc(100% - 44px), transparent)',
          maskImage: 'linear-gradient(to right, transparent, #000 44px, #000 calc(100% - 44px), transparent)',
        }}
      >
        <div className="knews-track flex w-max gap-3" style={{ animationDuration: `${dur}s` }}>
          {loop.map((it, i) => (
            <Link
              key={i}
              href={`/actu/${it.slug || newsSlug(it.title)}`}
              className="knews-card relative flex h-[74px] w-[320px] shrink-0 items-stretch overflow-hidden rounded-xl border border-[#E5E5EA] bg-white no-underline"
            >
              <span aria-hidden className="absolute left-0 top-0 z-10 h-full w-[3px]" style={{ background: accent }} />
              {it.image ? (
                <span className="relative h-full w-[58px] shrink-0 overflow-hidden bg-[#F5F5F7]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none' }}
                  />
                </span>
              ) : null}
              <span className="flex min-w-0 flex-1 flex-col justify-center py-2 pl-3.5 pr-3">
                <span className="text-[13px] font-semibold leading-snug text-[#1D1D1F]" style={clamp(2)}>
                  {it.title}
                </span>
                <span className="mt-1 text-[10.5px] font-medium text-[#86868B]" style={{ fontFamily: 'var(--font-mono)' }}>
                  {rel(it.date)}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
