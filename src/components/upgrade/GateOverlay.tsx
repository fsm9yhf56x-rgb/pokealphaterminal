'use client'

import { useState } from 'react'
import { UpgradeModal, type UpgradeTier } from './UpgradeModal'

const INK = '#1D1D1F', MUTED = '#6E6E73'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"

const COLOR: Record<UpgradeTier, string> = { pro: '#185FA5', premium: '#6E56CF' }

/**
 * GateOverlay — teaser partiel réutilisable.
 * Montre le VRAI contenu (children) flouté derrière un panneau d'upsell centré
 * qui ouvre la modale de conversion. Si locked=false, rend les children tels quels.
 *
 *   <GateOverlay locked={!isPro} tier="pro" title="..." desc="...">
 *     <MonContenuPro />
 *   </GateOverlay>
 *
 * maxHeight : hauteur max du contenu flouté (clip + fondu).
 * minHeight : hauteur plancher du bloc, pour que le panneau ait toujours sa place.
 */
export function GateOverlay({
  locked, tier, title, desc, ctaLabel, children, maxHeight = 360, minHeight = 220, blur = 6, feature,
}: {
  locked: boolean
  tier: UpgradeTier
  title: string
  desc: string
  ctaLabel?: string
  children: React.ReactNode
  maxHeight?: number
  minHeight?: number
  blur?: number
  feature?: { title?: string; subtitle?: string; previewHref?: string }
}) {
  const [open, setOpen] = useState(false)
  if (!locked) return <>{children}</>

  const color = COLOR[tier]
  const cta = ctaLabel || (tier === 'premium' ? 'Passer Premium' : 'Passer Pro')

  return (
    <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', minHeight }}>
      {/* contenu réel, flouté + neutralisé, fondu vers le bas */}
      <div aria-hidden style={{
        maxHeight, overflow: 'hidden',
        filter: `blur(${blur}px)`, opacity: 0.55,
        pointerEvents: 'none', userSelect: 'none',
        WebkitMaskImage: 'linear-gradient(180deg, #000 52%, transparent 100%)',
        maskImage: 'linear-gradient(180deg, #000 52%, transparent 100%)',
      }}>
        {children}
      </div>

      {/* panneau d'upsell */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          width: '100%', maxWidth: 420, textAlign: 'center', padding: '24px 26px', borderRadius: 18,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.86) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <span style={{ display: 'inline-flex', width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', background: `${color}14`, color }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </span>
            <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em', color, background: `${color}14`, padding: '3px 7px', borderRadius: 6 }}>{tier === 'premium' ? 'PREMIUM' : 'PRO'}</span>
          </div>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em', color: INK, margin: '0 0 6px', lineHeight: 1.2 }}>{title}</h3>
          <p style={{ fontFamily: DISPLAY, fontSize: 13.5, color: MUTED, lineHeight: 1.5, margin: '0 auto 16px', maxWidth: '34ch' }}>{desc}</p>
          <button onClick={() => setOpen(true)} className="kgo-cta" style={{
            border: 'none', cursor: 'pointer', padding: '12px 24px', borderRadius: 999,
            background: color, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em',
            boxShadow: `0 8px 22px ${color}55, inset 0 1px 0 rgba(255,255,255,0.22)`,
          }}>{cta} →</button>
        </div>
      </div>

      <style>{`.kgo-cta{transition:transform .16s cubic-bezier(.2,.85,.3,1)} .kgo-cta:hover{transform:translateY(-1px)}`}</style>

      <UpgradeModal open={open} onClose={() => setOpen(false)} tier={tier} feature={feature} />
    </div>
  )
}
