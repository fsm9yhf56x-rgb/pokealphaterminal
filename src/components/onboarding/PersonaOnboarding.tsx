'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '@/lib/useAuth'
import { usePersona, type Persona } from '@/lib/usePersona'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Choice = {
  id: Persona
  title: string
  tagline: string
  points: string[]
  accent: string
  wash: string
  soft: string
  border: string
  glow: string
  icon: React.ReactNode
}

const CHOICES: Choice[] = [
  {
    id: 'collector',
    title: 'Collectionneur',
    tagline: 'Mon musée personnel',
    accent: '#E03020',
    wash: 'rgba(224,48,32,0.05)',
    soft: 'rgba(224,48,32,0.11)',
    border: 'rgba(224,48,32,0.24)',
    glow: 'rgba(224,48,32,0.30)',
    points: [
      'Mastersets & complétion multi-langues',
      'Illustrateurs, lore & anecdotes des cartes',
      'Valeur patrimoniale, sans jargon financier',
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" stroke="currentColor" strokeWidth="1.7" />
      </svg>
    ),
  },
  {
    id: 'investor',
    title: 'Investisseur',
    tagline: 'Le terminal complet',
    accent: '#185FA5',
    wash: 'rgba(24,95,165,0.05)',
    soft: 'rgba(24,95,165,0.11)',
    border: 'rgba(24,95,165,0.24)',
    glow: 'rgba(24,95,165,0.28)',
    points: [
      'P&L, ROI & allocation de tes actifs',
      'Alpha Signals, Whale Tracker, indices marché',
      'Deal Hunter arbitrage & flux temps réel',
    ],
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 20V4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.35" />
        <path d="M4 20h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity="0.35" />
        <path d="M6 15.5l4-4 3.2 2.4L19 6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="19" cy="6.5" r="1.9" fill="currentColor" />
      </svg>
    ),
  },
]

export function PersonaOnboarding({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void } = {}) {
  const { user, updateProfile } = useAuth()
  const { onboarded, loading } = usePersona()
  const [saving, setSaving] = useState<Persona | 'skip' | null>(null)
  const [hovered, setHovered] = useState<Persona | null>(null)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted || loading || !user) return null
  if (!forceOpen && onboarded) return null

  async function pick(persona: Persona) {
    setSaving(persona)
    await updateProfile({ persona, persona_onboarded: true } as never)
    setSaving(null)
    if (forceOpen) {
      // Changement de mode à chaud : reload pour resynchroniser toute l'UI
      // (nav, gardes, libellés) qui dépend du profil dans d'autres instances.
      window.location.reload()
    } else {
      onClose?.()
    }
  }
  async function skip() {
    setSaving('skip')
    await updateProfile({ persona_onboarded: true } as never)
    setSaving(null)
    onClose?.()
  }

  const busy = saving !== null
  // Bokeh réactif : l'orbe du mode survolé s'embrase
  const redOn = hovered === 'collector'
  const blueOn = hovered === 'investor'

  return createPortal(
    <div
      data-konb-overlay
      onClick={forceOpen ? onClose : undefined}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999,
        background: 'rgba(20,20,30,0.42)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 90, paddingLeft: 24, paddingRight: 24, paddingBottom: 24,
        animation: 'konbFade .3s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <style>{`
        @keyframes konbFade { from{opacity:0} to{opacity:1} }
        @keyframes konbPanel { from{opacity:0;transform:translateY(24px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes konbRise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes konbSheen { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        @keyframes konbPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes konbOrbA { 0%,100%{transform:translate(0,0)} 50%{transform:translate(26px,-22px)} }
        @keyframes konbOrbB { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-30px,18px)} }
        @keyframes konbOrbC { 0%,100%{transform:translate(0,0)} 50%{transform:translate(16px,24px)} }
        .konb-rise { opacity:0; animation: konbRise .55s cubic-bezier(.16,1,.3,1) forwards; }
        .konb-title-grad {
          background: linear-gradient(100deg,#1D1D1F 0%,#1D1D1F 35%,#E03020 50%,#1D1D1F 65%,#1D1D1F 100%);
          background-size:200% auto;
          -webkit-background-clip:text; background-clip:text;
          -webkit-text-fill-color:transparent; color:transparent;
          animation: konbSheen 4.5s linear infinite;
        }
        .konb-orb { position:absolute; border-radius:50%; filter:blur(55px); pointer-events:none;
          transition: opacity .5s ease, transform .5s ease; will-change:transform; }
        .konb-card { position:relative; isolation:isolate; }
        .konb-glow { position:absolute; inset:-1px; border-radius:inherit; z-index:-1; opacity:0;
          transition:opacity .4s ease; pointer-events:none; }
        .konb-card[data-active="true"] .konb-glow { opacity:1; animation:konbPulse 2.4s ease-in-out infinite; }
        .konb-arrow { transition:transform .35s cubic-bezier(.16,1,.3,1); }
        .konb-card[data-active="true"] .konb-arrow { transform:translateX(4px); }
        @media (prefers-reduced-motion:reduce){
          [data-konb-overlay],[data-konb-panel],.konb-rise,.konb-title-grad,.konb-orb,
          .konb-card[data-active="true"] .konb-glow { animation:none !important; }
          .konb-rise{opacity:1 !important;}
        }
      `}</style>

      {/* Wrapper : aligne la couche bokeh et le panel */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '100%', maxWidth: 540 }}>

        {/* Couche bokeh — derrière le panel, floutée par son verre = réfraction */}
        <div style={{ position: 'absolute', inset: -70, borderRadius: 40, overflow: 'hidden', zIndex: 0 }}>
          <span className="konb-orb" style={{
            width: 260, height: 260, top: -30, left: -20,
            background: '#E03020', opacity: redOn ? 0.85 : 0.5,
            animation: 'konbOrbA 14s ease-in-out infinite',
          }} />
          <span className="konb-orb" style={{
            width: 280, height: 280, bottom: -40, right: -30,
            background: '#185FA5', opacity: blueOn ? 0.8 : 0.45,
            animation: 'konbOrbB 17s ease-in-out infinite',
          }} />
          <span className="konb-orb" style={{
            width: 200, height: 200, top: '40%', left: '38%',
            background: '#D4AF37', opacity: 0.28,
            animation: 'konbOrbC 20s ease-in-out infinite',
          }} />
        </div>

        {/* Panel verre — plus translucide pour laisser passer le bokeh */}
        <div
          data-konb-panel
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.74) 0%, rgba(255,255,255,0.66) 100%)',
            backdropFilter: 'blur(44px) saturate(190%)',
            WebkitBackdropFilter: 'blur(44px) saturate(190%)',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.20), 0 6px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
            padding: '34px 30px 26px',
            animation: 'konbPanel .5s cubic-bezier(.16,1,.3,1)',
          }}
        >
          {/* Badge glass pill */}
          <div className="konb-rise" style={{ animationDelay: '.08s', marginBottom: 14 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 13px', fontSize: 10.5, fontWeight: 600,
              fontFamily: FONT.display, letterSpacing: '0.05em', textTransform: 'uppercase',
              color: SNOW.muted,
              background: 'linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.4))',
              backdropFilter: 'blur(12px) saturate(180%)', WebkitBackdropFilter: 'blur(12px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.8)',
              borderRadius: RADIUS.pill,
              boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
            }}>
              <span style={{ color: SNOW.red, fontSize: 8 }}>●</span>
              <span>{forceOpen ? 'Mode d\u2019exp\u00e9rience' : 'Bienvenue sur Kodo'}</span>
            </span>
          </div>

          <h3 className="konb-rise" style={{
            animationDelay: '.14s', fontSize: 25, fontWeight: 800, margin: '0 0 10px',
            fontFamily: FONT.display, letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            <span className="konb-title-grad">{forceOpen ? 'Change ta fa\u00e7on de vivre Kodo' : 'Comment veux-tu vivre Kodo'}&nbsp;?</span>
          </h3>
          <p className="konb-rise" style={{
            animationDelay: '.2s', fontSize: 14, color: SNOW.muted, margin: '0 0 24px',
            fontFamily: FONT.display, lineHeight: 1.6,
          }}>
            On adapte ton expérience à ta façon de collectionner. Tu pourras changer à tout moment dans tes réglages.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
            {CHOICES.map((c, i) => {
              const selected = saving === c.id
              const isHover = hovered === c.id && !busy
              const active = selected || isHover
              return (
                <button
                  key={c.id}
                  className="konb-card konb-rise"
                  data-active={active}
                  disabled={busy}
                  onClick={() => pick(c.id)}
                  onMouseEnter={() => setHovered(c.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    animationDelay: `${0.28 + i * 0.09}s`,
                    textAlign: 'left', cursor: busy ? 'default' : 'pointer',
                    opacity: busy && !selected ? 0.5 : undefined,
                    display: 'block', width: '100%', padding: '17px 19px',
                    borderRadius: RADIUS.lg,
                    background: active
                      ? `linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0.3)), ${c.soft}`
                      : 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.32))',
                    backdropFilter: 'blur(16px) saturate(160%)', WebkitBackdropFilter: 'blur(16px) saturate(160%)',
                    border: `1px solid ${active ? c.border : 'rgba(255,255,255,0.65)'}`,
                    boxShadow: active
                      ? 'inset 0 1px 0 rgba(255,255,255,0.95)'
                      : '0 2px 8px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                    transform: isHover ? 'translateY(-3px)' : 'none',
                    transition: 'transform .4s cubic-bezier(.16,1,.3,1), background .3s ease, border-color .3s ease',
                  }}
                >
                  <span className="konb-glow" style={{ boxShadow: `0 14px 46px ${c.glow}` }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, marginBottom: 13 }}>
                    <span style={{
                      flex: '0 0 auto', width: 42, height: 42, borderRadius: RADIUS.md,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: active ? c.accent : c.soft,
                      color: active ? '#fff' : c.accent,
                      border: `1px solid ${active ? c.accent : c.border}`,
                      boxShadow: active ? `0 4px 16px ${c.glow}` : 'inset 0 1px 0 rgba(255,255,255,0.7)',
                      transition: 'all .3s cubic-bezier(.16,1,.3,1)',
                    }}>
                      {c.icon}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <span style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 700, color: SNOW.ink, letterSpacing: '-0.01em' }}>
                        {c.title}
                      </span>
                      {/* tagline = glass pill teintée */}
                      <span style={{
                        alignSelf: 'flex-start',
                        padding: '3px 10px', borderRadius: RADIUS.pill,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.25))',
                        border: `1px solid ${c.border}`,
                        color: c.accent, fontSize: 11, fontWeight: 600,
                        fontFamily: FONT.display, letterSpacing: '0.01em',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
                      }}>
                        {selected ? 'Activation…' : c.tagline}
                      </span>
                    </span>
                    <span className="konb-arrow" style={{ marginLeft: 'auto', color: c.accent, opacity: active ? 1 : 0.4, transition: 'opacity .3s' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.points.map((p) => (
                      <li key={p} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 11,
                        fontSize: 13, color: SNOW.inkSoft, fontFamily: FONT.display, lineHeight: 1.5,
                      }}>
                        <span style={{ flex: '0 0 auto', width: 13, height: 2, borderRadius: 2, background: c.accent, opacity: 0.7, marginTop: 8 }} />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              )
            })}
          </div>

          <button
            className="konb-rise"
            onClick={skip}
            disabled={busy}
            style={{
              animationDelay: '.5s', width: '100%', height: 42, borderRadius: 12,
              background: 'transparent', border: 'none',
              color: SNOW.mutedLight, fontSize: 13, fontWeight: 500,
              cursor: busy ? 'default' : 'pointer', fontFamily: FONT.display, transition: 'color .2s',
            }}
            onMouseEnter={(e) => { if (!busy) e.currentTarget.style.color = SNOW.ink }}
            onMouseLeave={(e) => { e.currentTarget.style.color = SNOW.mutedLight }}
          >
            {saving === 'skip' ? '…' : 'Décider plus tard'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
