'use client'

import { useState, type CSSProperties } from 'react'
import AuthModal from '@/components/layout/AuthModal'

const INK = '#1D1D1F', MUTED = '#6E6E73', ACCENT = '#E03020', SURFACE = '#F5F5F7', BORDER = '#E5E5EA'
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"
const MONO = "var(--font-mono, 'Space Mono', monospace)"

type Preset = 'home' | 'portfolio'

const PRESETS: Record<Preset, { title: string; subtitle: string; bullets: string[] }> = {
  home: {
    title: "Ton tableau de bord t'attend",
    subtitle: "Ta collection valorisée, l'actu du marché et tes cartes suivies — tout au même endroit.",
    bullets: [
      "Ta collection valorisée en temps réel",
      "L'actu du marché Pokémon en direct",
      "Tes cartes suivies, alerte quand elles bougent",
    ],
  },
  portfolio: {
    title: "Ta collection, valorisée en temps réel",
    subtitle: "Suis la cote de chaque carte, complète tes séries et ne rate jamais le bon moment.",
    bullets: [
      "La valeur réelle de chaque carte que tu possèdes",
      "Ta progression, set par set",
      "Alerte dès qu'une carte prend de la valeur",
    ],
  },
}

// Aperçu neutre : des formes, AUCUNE donnee (jamais de faux chiffre)
function GhostPreview() {
  const card = (h: number): CSSProperties => ({ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: 14, height: h })
  const bar = (w: string): CSSProperties => ({ height: 8, width: w, borderRadius: 5, background: SURFACE })
  return (
    <div aria-hidden style={{ position: 'absolute', inset: 0, padding: '26px 20px', filter: 'blur(7px)', opacity: 0.42, pointerEvents: 'none', userSelect: 'none', overflow: 'hidden', WebkitMaskImage: 'linear-gradient(180deg,#000 38%,transparent 92%)', maskImage: 'linear-gradient(180deg,#000 38%,transparent 92%)' }}>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ ...card(94), flex: 1, padding: 14 }}>
            <div style={{ ...bar('55%'), marginBottom: 12 }} />
            <div style={{ height: 22, width: '70%', borderRadius: 6, background: SURFACE }} />
          </div>
        ))}
      </div>
      <div style={{ ...card(196), padding: 16, marginBottom: 14 }}>
        <div style={{ ...bar('30%'), marginBottom: 16 }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 122 }}>
          {[40, 70, 55, 85, 60, 95, 72, 50, 80, 65, 78, 58].map((h, i) => (
            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: 4, background: SURFACE }} />
          ))}
        </div>
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ ...card(58), padding: '0 16px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 46, borderRadius: 5, background: SURFACE, flexShrink: 0 }} />
          <div style={{ flex: 1 }}><div style={{ ...bar('40%'), marginBottom: 7 }} /><div style={bar('25%')} /></div>
          <div style={{ height: 16, width: 56, borderRadius: 5, background: SURFACE }} />
        </div>
      ))}
    </div>
  )
}

export function GuestWall({ variant }: { variant: Preset }) {
  const [authOpen, setAuthOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const p = PRESETS[variant]

  return (
    <div style={{ position: 'relative', minHeight: 'calc(100dvh - 130px)', borderRadius: 20, overflow: 'hidden' }}>
      <GhostPreview />
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: 440, marginTop: 'min(8vh, 64px)', textAlign: 'center', padding: '30px 28px', borderRadius: 22, background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.85)', boxShadow: '0 24px 60px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT, background: `${ACCENT}14`, padding: '4px 9px', borderRadius: 7, marginBottom: 16 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT }} />
            GRATUIT
          </span>
          <div style={{ fontFamily: DISPLAY, fontSize: 22, fontWeight: 700, color: INK, letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 9 }}>{p.title}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 14, color: MUTED, lineHeight: 1.5, marginBottom: 22 }}>{p.subtitle}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 24, textAlign: 'left' }}>
            {p.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ flexShrink: 0, width: 19, height: 19, borderRadius: '50%', background: 'rgba(0,163,104,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#00A368" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
                <span style={{ fontFamily: DISPLAY, fontSize: 13.5, fontWeight: 500, color: INK }}>{b}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setMode('signup'); setAuthOpen(true) }} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 50, borderRadius: 14, background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 15, fontWeight: 700, boxShadow: '0 8px 22px rgba(224,48,32,0.3)' }}>
            Créer mon compte — gratuit
          </button>
          <button onClick={() => { setMode('login'); setAuthOpen(true) }} style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 13, fontWeight: 500, color: MUTED }}>
            J&apos;ai déjà un compte
          </button>
        </div>
      </div>
      <AuthModal key={mode} open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={mode} />
    </div>
  )
}
