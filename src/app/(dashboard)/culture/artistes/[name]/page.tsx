'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchCardsByIllustrator, fetchCardDetail, type TCGCard, type TCGCardFull } from '@/lib/tcgApi'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

function imgSrc(image?: string, q: 'high' | 'low' = 'low'): string | null {
  if (!image) return null
  return /\.(webp|png|jpg|jpeg)$/i.test(image) ? image : `${image}/${q}.webp`
}

export default function IllustrateurPage() {
  const params = useParams()
  const router = useRouter()
  const raw = Array.isArray(params.name) ? params.name[0] : params.name
  const name = decodeURIComponent(raw ?? '')

  const [cards, setCards] = useState<TCGCard[]>([])
  const [loading, setLoading] = useState(true)
  const [lang, setLang] = useState<'FR' | 'EN'>('FR')

  // drawer carte
  const [selId, setSelId] = useState<string | null>(null)
  const [detail, setDetail] = useState<TCGCardFull | null>(null)
  const [detLoading, setDetLoading] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchCardsByIllustrator('FR', name)
      .then(async (fr) => { if (fr.length > 0) { setLang('FR'); return fr } setLang('EN'); return fetchCardsByIllustrator('EN', name) })
      .then((list) => { if (alive) { setCards(list); setLoading(false) } })
      .catch(() => { if (alive) { setCards([]); setLoading(false) } })
    return () => { alive = false }
  }, [name])

  async function openCard(id: string) {
    setSelId(id); setDetail(null); setDetLoading(true)
    try {
      let d = await fetchCardDetail(lang, id)
      setDetail(d)
    } catch { setDetail(null) }
    setDetLoading(false)
  }
  function closeCard() { setSelId(null); setDetail(null) }

  const withImg = cards.filter(c => c.image)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px 90px' }}>
      <button onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 18, background: 'transparent', border: 'none', cursor: 'pointer', color: SNOW.muted, fontSize: 13, fontFamily: FONT.body, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Retour
      </button>

      <div style={{ marginBottom: 28 }}>
        <span style={{ display: 'inline-block', marginBottom: 10, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Illustrateur</span>
        <h1 style={{ fontFamily: FONT.display, fontSize: 32, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', margin: '0 0 6px', lineHeight: 1.1 }}>{name}</h1>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted, margin: 0 }}>
          {loading ? 'Chargement…' : `${cards.length} carte${cards.length !== 1 ? 's' : ''} illustrée${cards.length !== 1 ? 's' : ''}`}
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
          {Array.from({ length: 14 }).map((_, i) => <div key={i} style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, background: SNOW.surface, opacity: 0.5 }} />)}
        </div>
      ) : withImg.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: SNOW.muted, fontFamily: FONT.body, fontSize: 14, background: 'rgba(255,255,255,0.55)', borderRadius: RADIUS.lg, border: `1px solid ${SNOW.border}` }}>Aucune carte avec illustration disponible.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 14 }}>
          {withImg.map((c) => {
            const src = imgSrc(c.image, 'low')
            return (
              <button key={c.id} onClick={() => openCard(c.id)} title={c.name} style={{ display: 'block', padding: 0, border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left' }}>
                <div style={{ aspectRatio: '63/88', borderRadius: RADIUS.md, overflow: 'hidden', background: SNOW.surface, marginBottom: 7, border: '1px solid rgba(0,0,0,0.05)', boxShadow: '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)', transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(0,0,0,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)' }}>
                  <img src={src ?? ''} alt={c.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.png'); else { t.style.display = 'none' } }} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{c.name}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Drawer carte — autonome, glass v7 */}
      {selId && (
        <div onClick={closeCard} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(20,20,30,0.42)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(40px) saturate(180%)', WebkitBackdropFilter: 'blur(40px) saturate(180%)', borderRadius: 22, border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 24px 80px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9)', padding: 22 }}>
            {detLoading || !detail ? (
              <div style={{ padding: 40, textAlign: 'center', color: SNOW.muted, fontFamily: FONT.body, fontSize: 14 }}>Chargement…</div>
            ) : (
              <>
                {imgSrc(detail.image, 'high') && (
                  <img src={imgSrc(detail.image, 'high') as string} alt={detail.name} style={{ width: '100%', borderRadius: 14, marginBottom: 16, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                    onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.webp') }} />
                )}
                <h3 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: SNOW.ink, margin: '0 0 4px', letterSpacing: '-0.02em' }}>{detail.name}</h3>
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, margin: '0 0 14px' }}>
                  {detail.set?.name}{detail.rarity ? ` · ${detail.rarity}` : ''}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([['Catégorie', detail.category], ['Stade', detail.stage], ['PV', detail.hp ? String(detail.hp) : undefined], ['Illustrateur', detail.illustrator]] as [string, string | undefined][]).filter(([, v]) => v).map(([l, v]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13 }}>
                      <span style={{ color: SNOW.muted, fontFamily: FONT.body }}>{l}</span>
                      <span style={{ color: SNOW.ink, fontFamily: FONT.display, fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <button onClick={closeCard} style={{ marginTop: 18, width: '100%', height: 42, borderRadius: 12, background: SNOW.ink, color: '#fff', border: 'none', fontSize: 13.5, fontWeight: 700, fontFamily: FONT.display, cursor: 'pointer' }}>Fermer</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
