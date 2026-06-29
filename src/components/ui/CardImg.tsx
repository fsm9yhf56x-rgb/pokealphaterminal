'use client'
import { useMemo, useState } from 'react'
import type { CSSProperties, SyntheticEvent } from 'react'
import { cardImageCandidates, getTcgdexFallbackUrl, cleanLegacyUrl, type Lang } from '@/lib/images'

type Variant = 'thumb' | 'full'

export interface CardImgProps {
  setId?: string
  localId?: string
  lang: Lang | string
  image?: string | null
  enImage?: string | null
  name?: string
  number?: string
  variant?: Variant
  fallback?: 'placeholder' | 'hide'
  alt?: string
  imgClassName?: string
  imgStyle?: CSSProperties
  style?: CSSProperties
  rounded?: number
}

const hasExt = (u: string) => /\.(webp|png|jpe?g)(\?|$)/i.test(u)

function buildCandidates(p: CardImgProps): string[] {
  const out: string[] = []
  const push = (u?: string | null) => { if (u && !out.includes(u)) out.push(u) }
  const suffix = p.variant === 'full' ? '/high.webp' : '/low.webp'

  // 1) url already on the card (R2 full, TCGdex path, or legacy)
  if (p.image) {
    const img = cleanLegacyUrl(p.image)
    if (hasExt(img)) push(img)
    else { push(img + suffix); push(img + '/high.webp'); push(img + '/high.png') }
  }
  // 2) R2 by language: requested -> EN -> JP (same artwork)
  if (p.setId && p.localId) {
    for (const u of cardImageCandidates({ lang: p.lang, setId: p.setId, localId: p.localId })) push(u)
  }
  // 3) JP cards sometimes carry an EN image directly
  push(p.enImage || undefined)
  // 4) last resort: TCGdex CDN (webp then png)
  if (p.setId && p.localId) {
    const t = getTcgdexFallbackUrl({ lang: p.lang, setId: p.setId, localId: p.localId })
    if (t) { push(t); push(t.replace('high.webp', 'high.png')) }
  }
  return out
}

export function CardImg(props: CardImgProps) {
  const candidates = useMemo(
    () => buildCandidates(props),
    [props.image, props.enImage, props.setId, props.localId, props.lang, props.variant],
  )
  const sig = candidates.join('|')
  const [state, setState] = useState({ sig, i: 0 })
  const i = state.sig === sig ? state.i : 0
  const src = i < candidates.length ? candidates[i] : null

  if (!src) {
    if (props.fallback === 'hide') return null
    const ph: CSSProperties = {
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 5,
      background: '#F5F5F7', border: '1px solid #E5E5EA',
      borderRadius: props.rounded ?? 0, padding: 8, boxSizing: 'border-box',
      ...props.style,
    }
    const nameSt: CSSProperties = {
      fontSize: 9, lineHeight: 1.2, textAlign: 'center', color: '#86868B',
      fontFamily: 'var(--font-display, sans-serif)', maxWidth: '100%', overflow: 'hidden',
      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
    }
    return (
      <div style={ph}>
        <svg width="22" height="30" viewBox="0 0 22 30" fill="none" aria-hidden="true">
          <rect x="1" y="1" width="20" height="28" rx="3" stroke="#C7C7CC" strokeWidth="1.5" />
          <circle cx="11" cy="10.5" r="3.2" stroke="#C7C7CC" strokeWidth="1.3" />
          <path d="M4 24l4.5-5 3 3 3-3.5 3.5 5.5" stroke="#C7C7CC" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        {props.name ? <div style={nameSt}>{props.name}</div> : null}
        {props.number ? <div style={{ fontSize: 8, color: '#C7C7CC', fontFamily: 'var(--font-mono, monospace)' }}>{props.number}</div> : null}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={props.alt ?? props.name ?? ''}
      loading="lazy"
      decoding="async"
      className={props.imgClassName}
      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', ...props.imgStyle }}
      onLoad={(e: SyntheticEvent<HTMLImageElement>) => { e.currentTarget.classList.add('card-img-loaded') }}
      onError={() => setState({ sig, i: i + 1 })}
    />
  )
}

export default CardImg
