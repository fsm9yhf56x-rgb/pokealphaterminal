'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { useIsMobile } from '@/lib/useIsMobile'

const A = 'https://assets.tcgdex.net/fr'
function img(u: string) { return /\.(webp|png|jpg)$/i.test(u) ? u : `${u}/low.webp` }

// Cartes vérifiées OK dans cette session
const HERO_CARDS = [
  `${A}/base/base1/4`, `${A}/neo/neo1/9`, `${A}/sm/sm10/20`,
  `${A}/xy/xy7/15`, `${A}/ex/ex13/16`, `${A}/swsh/swsh8/113`,
]

type Portal = { href: string; color: string; eyebrow: string; title: string; desc: string; cards: string[]; icon: React.ReactNode }
const PORTALS: Portal[] = [
  { href: '/culture/artistes', color: '#E03020', eyebrow: 'Les maîtres', title: 'Artistes',
    desc: '399 illustrateurs, d’Arita à Nishida. Leurs cartes, leur signature, leur empreinte sur l’univers Pokémon.',
    cards: [`${A}/base/base1/58`, `${A}/neo/neo3/8`, `${A}/hgss/hgss1/4`],
    icon: <path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM11 13a2 2 0 100-4 2 2 0 000 4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /> },
  { href: '/culture/eres', color: '#D4AF37', eyebrow: '1996 → aujourd’hui', title: 'Ères',
    desc: 'Vingt-cinq ans d’histoire en cartes. Des holos Wizards aux Illustration Rares modernes, chaque ère a son style.',
    cards: [`${A}/base/base1/4`, `${A}/pl/pl1/5`, `${A}/sv/sv03.5/200`],
    icon: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /> },
  { href: '/culture/curiosites', color: '#2A82DD', eyebrow: 'Anecdotes', title: 'Curiosités',
    desc: 'Les histoires et raretés qui font la légende. De la carte la plus chère du monde aux erreurs d’impression cultes.',
    cards: [`${A}/neo/neo1/9`, `${A}/sm/sm9/33`, `${A}/ex/ex2/16`],
    icon: <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /> },
  { href: '/culture/lore', color: '#0E9E8E', eyebrow: 'L’épopée', title: 'Lore',
    desc: 'De sa naissance dans une boutique japonaise en 1996 à un marché de plusieurs milliards — le récit complet.',
    cards: [`${A}/base/base1/15`, `${A}/xy/xy12/11`, `${A}/bw/bw9/39`],
    icon: <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" /> },
]

function MiniCard({ src, rotate, z }: { src: string; rotate: number; z: number }) {
  return (
    <div style={{ width: 52, aspectRatio: '63/88', borderRadius: 6, overflow: 'hidden', background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 4px 12px rgba(0,0,0,0.14)', transform: `rotate(${rotate}deg)`, zIndex: z, transition: 'transform .3s ease' }}>
      <img src={img(src)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else t.style.display = 'none' }} />
    </div>
  )
}

function PortalCard({ p, index }: { p: Portal; index: number }) {
  const isMobile = useIsMobile()
  const router = useRouter()
  const ref = useRef<HTMLButtonElement>(null)
  const [shown, setShown] = useState(false)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect() } }, { threshold: 0.1 })
    io.observe(el); return () => io.disconnect()
  }, [])
  return (
    <button ref={ref} onClick={() => router.push(p.href)}
      onMouseEnter={e => { setHover(true); e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 22px 50px ${p.color}2E, inset 0 1px 0 rgba(255,255,255,0.85)` }}
      onMouseLeave={e => { setHover(false); e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
      style={{
        textAlign: 'left', cursor: 'pointer', display: 'block', width: '100%',
        opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity .5s ease ${index * 80}ms, transform .55s cubic-bezier(.2,.85,.3,1) ${index * 80}ms, box-shadow .25s`,
        background: `linear-gradient(150deg, ${p.color}1C, rgba(255,255,255,0.62))`,
        backdropFilter: 'blur(20px) saturate(170%)', WebkitBackdropFilter: 'blur(20px) saturate(170%)',
        border: `1px solid ${p.color}33`, borderRadius: 20, padding: '24px 24px 22px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)', position: 'relative', overflow: 'hidden',
      }}>
      {/* halo décoratif */}
      <div aria-hidden style={{ position: 'absolute', bottom: -50, left: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}22, transparent 70%)`, pointerEvents: 'none' }} />
      {/* mini-cartes en éventail, coin haut droit */}
      <div style={{ position: 'absolute', top: isMobile ? 14 : 18, right: isMobile ? 10 : 18, display: 'flex', gap: -6 as any, transform: isMobile ? 'scale(0.78)' : 'none', transformOrigin: 'top right' }}>
        <div style={{ display: 'flex' }}>
          {p.cards.map((c, i) => (
            <div key={i} style={{ marginLeft: i === 0 ? 0 : -22 }}>
              <MiniCard src={c} rotate={(i - 1) * (hover ? 11 : 7)} z={i} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `linear-gradient(160deg, ${p.color}, ${p.color}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 6px 16px ${p.color}44`, marginBottom: 60 }}>
        <svg width="21" height="21" viewBox="0 0 24 24">{p.icon}</svg>
      </div>
      <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{p.eyebrow}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 25, fontWeight: 800, color: SNOW.ink, margin: 0, letterSpacing: '-0.03em' }}>{p.title}</h2>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: p.color, opacity: hover ? 1 : 0.5, transform: hover ? 'translateX(3px)' : 'none', transition: 'all .25s' }}>
          <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, margin: 0, lineHeight: 1.6 }}>{p.desc}</p>
    </button>
  )
}

export default function CulturePage() {
  const isMobile = useIsMobile()
  const [heroIn, setHeroIn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setHeroIn(true), 60); return () => clearTimeout(t) }, [])
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '8px 20px 90px' }}>
      {/* HERO avec éventail de cartes en fond */}
      <div style={{ position: 'relative', marginBottom: 44, paddingTop: 28, paddingBottom: 12, overflow: 'hidden' }}>
        {/* éventail de cartes flouté */}
        <div aria-hidden style={{ position: 'absolute', top: isMobile ? -10 : -30, right: isMobile ? -8 : -40, display: 'flex', pointerEvents: 'none', opacity: heroIn ? (isMobile ? 0.32 : 0.5) : 0, transform: heroIn ? 'translateX(0)' : 'translateX(40px)', transition: 'opacity 1s ease, transform 1.2s cubic-bezier(.2,.85,.3,1)', filter: isMobile ? 'blur(2.5px)' : 'blur(1.5px)' }}>
          {HERO_CARDS.map((c, i) => {
            const w = isMobile ? 78 : 120
            const overlap = isMobile ? -42 : -64
            return (
            <div key={i} style={{ width: w, aspectRatio: '63/88', borderRadius: 10, overflow: 'hidden', marginLeft: i === 0 ? 0 : overlap, transform: `rotate(${(i - 2.5) * 7}deg) translateY(${Math.abs(i - 2.5) * (isMobile ? 6 : 10)}px)`, boxShadow: '0 12px 32px rgba(0,0,0,0.18)', border: '2px solid rgba(255,255,255,0.6)', background: '#fff' }}>
              <img src={img(c)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                onError={e => { const t = e.target as HTMLImageElement; if (t.src.includes('/low.webp')) t.src = t.src.replace('/low.webp', '/high.webp'); else t.style.display = 'none' }} />
            </div>
            )
          })}
        </div>

        <div style={{ position: 'relative', opacity: heroIn ? 1 : 0, transform: heroIn ? 'translateY(0)' : 'translateY(16px)', transition: 'opacity .7s ease, transform .8s cubic-bezier(.2,.85,.3,1)' }}>
          <span style={{ display: 'inline-block', marginBottom: 14, padding: '5px 13px', borderRadius: RADIUS.pill, background: 'rgba(224,48,32,0.08)', border: '1px solid rgba(224,48,32,0.2)', color: '#E03020', fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Kodo Culture</span>
          <h1 style={{ fontFamily: FONT.display, fontSize: 'clamp(36px, 5.5vw, 52px)', fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.04em', margin: '0 0 16px', lineHeight: 1.02, maxWidth: '14ch' }}>L’âme de la collection</h1>
          <p style={{ fontFamily: FONT.body, fontSize: 16.5, color: SNOW.muted, margin: 0, maxWidth: '50ch', lineHeight: 1.6 }}>
            Une carte, ce n’est pas qu’un prix. C’est une œuvre, un artiste, une époque, une histoire. Bienvenue dans la dimension culturelle de Kodo.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(380px, 1fr))', gap: 18 }}>
        {PORTALS.map((p, i) => <PortalCard key={p.href} p={p} index={i} />)}
      </div>
    </div>
  )
}
