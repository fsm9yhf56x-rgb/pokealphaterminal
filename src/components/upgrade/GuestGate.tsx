'use client'

import { useState } from 'react'
import AuthModal from '@/components/layout/AuthModal'

const INK = '#1D1D1F', MUTED = '#6E6E73', ACCENT = '#E03020'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"

/**
 * GuestGate — teaser de conversion pour les visiteurs non inscrits.
 * Floute le vrai contenu (children) derriere un panneau "Cree ton compte - gratuit"
 * qui ouvre l'AuthModal. Si locked=false, rend les children tels quels.
 *
 *   <GuestGate locked={!user} title="..." desc="...">
 *     <VraiContenu />
 *   </GuestGate>
 */
export function GuestGate({
  locked, title, desc, ctaLabel, children, maxHeight = 360, minHeight = 220, blur = 6,
}: {
  locked: boolean
  title: string
  desc: string
  ctaLabel?: string
  children: React.ReactNode
  maxHeight?: number
  minHeight?: number
  blur?: number
}) {
  const [authOpen, setAuthOpen] = useState(false)
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  if (!locked) return <>{children}</>

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight }}>
      <div aria-hidden style={{
        maxHeight, overflow: 'hidden',
        filter: `blur(${blur}px)`, opacity: 0.5,
        pointerEvents: 'none', userSelect: 'none',
        WebkitMaskImage: 'linear-gradient(180deg, #000 50%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 50%, transparent 100%)',
      }}>
        {children}
      </div>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          width: '100%', maxWidth: 360, textAlign: 'center', padding: '24px 24px', borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.88) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color: ACCENT, background: `${ACCENT}14`, padding: '4px 9px', borderRadius: 7, marginBottom: 14 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: ACCENT }} />
            GRATUIT
          </span>
          <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 700, color: INK, letterSpacing: '-0.01em', marginBottom: 7 }}>{title}</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 13, color: MUTED, lineHeight: 1.5, marginBottom: 18 }}>{desc}</div>
          <button onClick={() => { setMode('signup'); setAuthOpen(true) }} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%',
            height: 46, borderRadius: 13, background: ACCENT, color: '#fff', border: 'none', cursor: 'pointer',
            fontFamily: DISPLAY, fontSize: 14.5, fontWeight: 700, boxShadow: '0 6px 18px rgba(224,48,32,0.28)',
          }}>
            {ctaLabel || 'Créer mon compte — gratuit'}
          </button>
          <button onClick={() => { setMode('login'); setAuthOpen(true) }} style={{
            marginTop: 11, background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 500, color: MUTED,
          }}>
            J&apos;ai déjà un compte
          </button>
        </div>
      </div>

      <AuthModal key={mode} open={authOpen} onClose={() => setAuthOpen(false)} defaultMode={mode} />
    </div>
  )
}
