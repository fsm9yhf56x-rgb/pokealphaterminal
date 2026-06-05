'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCardsByIllustrator, type TCGCard } from '@/lib/tcgApi'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

function imgSrc(image?: string): string | null {
  if (!image) return null
  // Bug fix : tester l'EXTENSION en fin d'URL, pas un point quelconque
  // (le domaine assets.tcgdex.net contient déjà des points).
  return /\.(webp|png|jpg|jpeg)$/i.test(image) ? image : `${image}/high.webp`
}

export default function IllustrateurPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name[0] : params.name
  const name = decodeURIComponent(raw ?? '')

  const [cards, setCards] = useState<TCGCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    // FR en priorité (marché cible), fallback EN si vide
    fetchCardsByIllustrator('FR', name)
      .then(async (fr) => {
        if (fr.length > 0) return fr
        return fetchCardsByIllustrator('EN', name)
      })
      .then((list) => { if (alive) { setCards(list); setLoading(false) } })
      .catch(() => { if (alive) { setCards([]); setLoading(false) } })
    return () => { alive = false }
  }, [name])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 90px' }}>
      {/* Header */}
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: SNOW.muted, fontSize: 13, fontFamily: FONT.body, padding: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Retour
      </button>

      <div style={{ marginBottom: 28 }}>
        <span style={{
          display: 'inline-block', marginBottom: 10,
          padding: '5px 13px', borderRadius: RADIUS.pill,
          background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)',
          color: '#E03020', fontSize: 10.5, fontWeight: 700,
          fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Illustrateur
        </span>
        <h1 style={{
          fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink,
          letterSpacing: '-0.03em', margin: '0 0 6px', lineHeight: 1.1,
        }}>
          {name}
        </h1>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: 0 }}>
          {loading ? 'Chargement…' : `${cards.length} carte${cards.length !== 1 ? 's' : ''} illustrée${cards.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {/* Grille */}
      {loading ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14,
        }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, background: SNOW.surface, opacity: 0.5 }} />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <div style={{
          ...{}, padding: 48, textAlign: 'center', color: SNOW.muted,
          fontFamily: FONT.body, fontSize: 14,
          background: 'rgba(255,255,255,0.55)', borderRadius: RADIUS.lg,
          border: `1px solid ${SNOW.border}`,
        }}>
          Aucune carte trouvée pour cet illustrateur.
        </div>
      ) : (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14,
        }}>
          {cards.map((c) => {
            const src = imgSrc(c.image)
            return (
              <button
                key={c.id}
                onClick={() => router.push('/cartes?card=' + encodeURIComponent(c.id))}
                title={c.name}
                style={{
                  display: 'block', padding: 0, border: 'none', cursor: 'pointer',
                  background: 'transparent', textAlign: 'left',
                }}
              >
                <div style={{
                  aspectRatio: '63/88', borderRadius: RADIUS.md, overflow: 'hidden',
                  background: SNOW.surface, marginBottom: 7,
                  border: '1px solid rgba(0,0,0,0.05)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)',
                  transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(0,0,0,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)' }}
                >
                  {src ? (
                    <img
                      src={src}
                      alt={c.name}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      onError={e => {
                        const t = e.target as HTMLImageElement
                        if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.webp')
                        else if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.png')
                        else if (t.src.includes('/high.png')) t.src = t.src.replace('/high.png', '/low.png')
                        else { t.style.display = 'none'; const p = t.parentElement; if (p) p.style.opacity = '0.4' }
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: SNOW.mutedExtraLight, fontSize: 11, fontFamily: FONT.body, padding: 8, textAlign: 'center' }}>
                      {c.name}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
                  {c.name}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
