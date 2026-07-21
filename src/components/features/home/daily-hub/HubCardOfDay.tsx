
'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/lib/usePortfolio'
import { deriveEra } from '@/components/features/portfolio/allocation/Allocation'
import { getCardOfDay } from '@/lib/cardOfDay'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

/**
 * Hero collectionneur : la Carte du Jour, mise en scene comme une piece de musee.
 * Visuel TCGdex + tilt 3D + reflet holographique au survol. Anecdote a gauche.
 * Priorite : carte de la collection, sinon iconique curee. Rotation quotidienne.
 */
export function HubCardOfDay() {
  const router = useRouter()
  const { cards, loading } = usePortfolio()
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 50, active: false })

  const card = useMemo(() => getCardOfDay(cards as any, deriveEra), [cards])

  function onMove(e: React.MouseEvent) {
    const el = cardRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width   // 0..1
    const py = (e.clientY - r.top) / r.height   // 0..1
    setTilt({
      rx: (0.5 - py) * 18,   // inclinaison verticale
      ry: (px - 0.5) * 18,   // inclinaison horizontale
      gx: px * 100,
      gy: py * 100,
      active: true,
    })
  }
  function onLeave() { setTilt({ rx: 0, ry: 0, gx: 50, gy: 50, active: false }) }

  if (loading) {
    return (
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: RADIUS.xl,
        background: 'linear-gradient(135deg, rgba(224,48,32,0.05), rgba(255,255,255,0.5))',
        border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 60px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
        padding: 'clamp(24px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 'clamp(20px,4vw,48px)', flexWrap: 'wrap',
      }}>
        <div style={{ flex: '1 1 280px', minWidth: 260 }}>
          <div style={{ width: 110, height: 24, borderRadius: 999, background: 'rgba(0,0,0,0.05)', marginBottom: 16, animation: 'codShimmer 1.4s ease-in-out infinite' }} />
          <div style={{ width: 220, height: 38, borderRadius: 10, background: 'rgba(0,0,0,0.06)', marginBottom: 14, animation: 'codShimmer 1.4s ease-in-out infinite' }} />
          <div style={{ width: '80%', height: 14, borderRadius: 6, background: 'rgba(0,0,0,0.04)', marginBottom: 8, animation: 'codShimmer 1.4s ease-in-out infinite' }} />
          <div style={{ width: '60%', height: 14, borderRadius: 6, background: 'rgba(0,0,0,0.04)', animation: 'codShimmer 1.4s ease-in-out infinite' }} />
        </div>
        <div style={{ flex: '0 0 auto', width: 'clamp(180px,28vw,240px)', aspectRatio: '63/88', borderRadius: 14, background: 'rgba(0,0,0,0.05)', animation: 'codShimmer 1.4s ease-in-out infinite' }} />
        <style>{`@keyframes codShimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: RADIUS.xl,
      background: 'linear-gradient(135deg, rgba(224,48,32,0.07), rgba(255,255,255,0.55) 55%, rgba(180,160,90,0.08))',
      backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 20px 60px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
      padding: 'clamp(24px,4vw,40px)', display: 'flex', alignItems: 'center', gap: 'clamp(20px,4vw,48px)', flexWrap: 'wrap',
    }}>
      <div aria-hidden style={{ position: 'absolute', top: -90, right: -60, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224,48,32,0.10), transparent 70%)', pointerEvents: 'none' }} />

      {/* Texte / anecdote */}
      <div style={{ flex: '1 1 280px', minWidth: 260, position: 'relative', order: 1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 14, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.1)', border: '1px solid rgba(224,48,32,0.22)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6 4.5 2.3 7.1L12 16.6 5.7 21l2.3-7.1-6-4.5h7.6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg>
          Carte du jour
        </span>
        <h1 style={{ fontFamily: FONT.display, fontSize: 'clamp(30px,4.5vw,46px)', fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.035em', margin: '0 0 10px', lineHeight: 1.02 }}>{card.name}</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {card.era && card.era !== 'Autre' && card.era !== 'N/A' && card.era !== 'Ta collection' && (
            <span style={{ fontFamily: FONT.body, fontSize: 11.5, fontWeight: 600, color: SNOW.muted, padding: '4px 11px', borderRadius: RADIUS.pill, background: 'rgba(0,0,0,0.04)' }}>{card.era}</span>
          )}
          {card.illustrator && <span style={{ fontFamily: FONT.body, fontSize: 11.5, fontWeight: 600, color: SNOW.muted, padding: '4px 11px', borderRadius: RADIUS.pill, background: 'rgba(0,0,0,0.04)' }}>{card.illustrator}</span>}
          {card.fromCollection && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.body, fontSize: 11.5, fontWeight: 700, color: '#B8860B', padding: '4px 11px', borderRadius: RADIUS.pill, background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Dans ta collection
            </span>
          )}
        </div>
        <p style={{ fontFamily: FONT.body, fontSize: 15, color: SNOW.inkSoft, margin: '0 0 20px', maxWidth: '46ch', lineHeight: 1.6 }}>{card.anecdote}</p>
        <button onClick={() => router.push('/culture')} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: RADIUS.pill, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 600, fontSize: 13.5, transition: 'gap .2s, transform .2s' }}
          onMouseEnter={e => { e.currentTarget.style.gap = '11px'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.gap = '7px'; e.currentTarget.style.transform = '' }}>
          Explorer la culture
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {/* Carte 3D holographique */}
      <div style={{ flex: '0 0 auto', order: 2, perspective: 1000, display: 'flex', justifyContent: 'center', width: 'clamp(180px,28vw,240px)' }}>
        <div
          ref={cardRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          onClick={() => router.push('/culture')}
          style={{
            position: 'relative', width: '100%', aspectRatio: '63/88', borderRadius: 14, cursor: 'pointer',
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg) scale(${tilt.active ? 1.04 : 1})`,
            transition: tilt.active ? 'transform .08s ease-out' : 'transform .5s cubic-bezier(.2,.85,.3,1)',
            boxShadow: tilt.active
              ? `0 30px 60px rgba(0,0,0,0.28), 0 0 30px rgba(224,48,32,0.12)`
              : '0 16px 40px rgba(0,0,0,0.18)',
            animation: tilt.active ? 'none' : 'cardFloat 5s ease-in-out infinite',
          }}>
          <img src={card.imageUrl} alt={card.name} loading="lazy"
            onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/high.webp')) t.src = t.src.replace('/high.webp', '/low.webp') }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 14, display: 'block', border: '3px solid rgba(255,255,255,0.7)' }} />
          {/* reflet holographique */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', mixBlendMode: 'color-dodge',
            opacity: tilt.active ? 0.55 : 0,
            background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.8), transparent 45%), linear-gradient(115deg, transparent 30%, rgba(255,0,128,0.35), rgba(0,200,255,0.35), rgba(255,230,0,0.35), transparent 70%)`,
            transition: 'opacity .2s ease',
          }} />
          {/* brillance de bord */}
          <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', boxShadow: tilt.active ? 'inset 0 0 0 1px rgba(255,255,255,0.5)' : 'none' }} />
        </div>
      </div>

      <style>{`@keyframes cardFloat { 0%,100% { transform: rotateX(2deg) rotateY(-3deg) translateY(0) } 50% { transform: rotateX(2deg) rotateY(-3deg) translateY(-8px) } }`}</style>
    </div>
  )
}
