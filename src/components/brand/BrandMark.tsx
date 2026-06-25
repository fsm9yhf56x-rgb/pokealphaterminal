'use client'

import React, { useEffect, useState } from 'react'

/**
 * BrandMark — le logo Kodo Cards, reconstruit en code (net à toutes les tailles).
 *
 *   <BrandMark size={28} inline signature mark={false} responsive /> → header (compact sur mobile)
 *   <BrandMark size={72} signature sigStacked />                     → hero / landing (KODO sur CARDS + 鼓動)
 *   <BrandMark size={22} inline mark={false} />                      → wordmark seul (burger menu)
 *
 * Tout est proportionnel à `size` (= hauteur des capitales KODO en px).
 */

export type BrandMarkProps = {
  /** Hauteur des capitales KODO en px (défaut 28). Tout le reste suit. */
  size?: number
  /** Affiche le losange rouge à gauche (défaut true). */
  mark?: boolean
  /** KODO CARDS sur une seule ligne (header). Sinon KODO empilé sur CARDS (hero). */
  inline?: boolean
  /** Affiche « THE HEARTBEAT OF TCG · 鼓動 ». */
  signature?: boolean
  /** Met 鼓動 sur une 2e ligne centrée sous la tagline (look hero). Sinon tout sur 1 ligne. */
  sigStacked?: boolean
  /** Réduit la taille + masque la signature sur petit écran (header). */
  responsive?: boolean
  /** Couleur du mot KODO (défaut encre #1D1D1F). */
  ink?: string
  /** Couleur du losange / CARDS / 鼓動 (défaut accent #E03020). */
  accent?: string
  /** Rayon des coins du losange en px (défaut 0 = bords droits). */
  radius?: number
  className?: string
  style?: React.CSSProperties
  /** Texte alternatif pour l'accessibilité (défaut « Kodo Cards »). */
  title?: string
}

const WORD = ['K', 'O', 'D', 'O', 'C', 'A', 'R', 'D', 'S'] as const // 0-3 = KODO, 4-8 = CARDS

export function BrandMark({
  size = 28,
  mark = true,
  inline = false,
  signature = false,
  sigStacked = false,
  responsive = false,
  ink = '#1D1D1F',
  accent = '#E03020',
  radius = 0,
  className,
  style,
  title = 'Kodo Cards',
}: BrandMarkProps) {
  const shonen = "var(--font-shonen, 'Sora', system-ui, sans-serif)"
  const sora = "var(--font-sora, 'Sora', system-ui, sans-serif)"
  const cjk = "'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', sans-serif"

  // --- responsive : on mesure la largeur du viewport (client only) ---
  const [vw, setVw] = useState<number | null>(null)
  useEffect(() => {
    if (!responsive) return
    const onResize = () => setVw(window.innerWidth)
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [responsive])

  // tailles effectives (desktop = valeurs d'origine ; flash initial = desktop, pas de mismatch SSR)
  let size_ = size
  let signature_ = signature
  if (responsive && vw !== null) {
    if (vw < 380) {
      size_ = Math.round(size * 0.7)
      signature_ = false
    } else if (vw < 500) {
      size_ = Math.round(size * 0.8)
      signature_ = false
    } else if (vw < 700) {
      size_ = Math.round(size * 0.9)
    }
  }

  // Header avec signature : on justifie KODOCARDS sur la largeur de la signature.
  const justified = inline && signature_

  // Proportions
  const markH = Math.round(size_ * (inline ? 1.42 : 1.26))
  const markW = Math.max(8, Math.round(markH * 0.5))
  const gap = Math.round(size_ * 0.32)
  const sigFont = Math.max(8, Math.round(size_ * 0.27))
  const jpFont = Math.round(sigFont * 1.18)
  const sigGap = Math.max(3, Math.round(sigFont * 0.7))

  const kodoBase: React.CSSProperties = {
    fontFamily: shonen,
    fontWeight: 700,
    fontStyle: 'italic',
    color: ink,
    lineHeight: 0.82,
    letterSpacing: '0.01em',
  }

  // ---- Wordmark ----
  let Wordmark: React.ReactNode
  if (justified) {
    Wordmark = (
      <span
        aria-hidden
        style={{ display: 'flex', width: '100%', justifyContent: 'space-between', whiteSpace: 'nowrap' }}
      >
        {WORD.map((ch, i) => (
          <span key={i} style={{ ...kodoBase, fontSize: size_, color: i < 4 ? ink : accent }}>
            {ch}
          </span>
        ))}
      </span>
    )
  } else if (inline) {
    Wordmark = (
      <span aria-hidden style={{ display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
        <span style={{ ...kodoBase, fontSize: size_ }}>KODO</span>
        <span style={{ ...kodoBase, fontSize: size_, color: accent, marginLeft: '0.06em', letterSpacing: '0.02em' }}>
          CARDS
        </span>
      </span>
    )
  } else {
    Wordmark = (
      <span aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <span style={{ ...kodoBase, fontSize: size_ }}>KODO</span>
        <span
          style={{
            ...kodoBase,
            fontSize: Math.round(size_ * 0.42),
            color: accent,
            lineHeight: 0.9,
            letterSpacing: '0.34em',
            marginTop: Math.round(size_ * 0.06),
            marginLeft: '0.02em',
          }}
        >
          CARDS
        </span>
      </span>
    )
  }

  // ---- Signature ----
  const Sig = signature_ ? (
    sigStacked ? (
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginTop: Math.round(size_ * 0.2),
          gap: Math.round(size_ * 0.1),
        }}
      >
        <span
          style={{
            fontFamily: sora,
            fontSize: sigFont,
            fontWeight: 600,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: '#86868B',
            whiteSpace: 'nowrap',
          }}
        >
          The Heartbeat of TCG
        </span>
        <span style={{ fontFamily: cjk, fontSize: jpFont, color: accent, letterSpacing: '0.18em' }}>鼓動</span>
      </span>
    ) : (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: sigGap,
          marginTop: Math.round(size_ * 0.16),
          fontFamily: sora,
          fontSize: sigFont,
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#86868B',
          whiteSpace: 'nowrap',
        }}
      >
        The Heartbeat of TCG
        <span style={{ color: '#C7C7CC', fontWeight: 700 }}>·</span>
        <span style={{ fontFamily: cjk, color: accent, fontSize: jpFont, letterSpacing: '0.06em' }}>鼓動</span>
      </span>
    )
  ) : null

  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{ display: 'inline-flex', alignItems: 'center', gap: mark ? gap : 0, lineHeight: 1, ...style }}
    >
      {/* losange — optionnel, bords droits par défaut */}
      {mark && (
        <span
          aria-hidden
          style={{
            width: markW,
            height: markH,
            background: accent,
            transform: 'skewX(-12deg)',
            borderRadius: radius,
            flexShrink: 0,
          }}
        />
      )}
      {/* texte : la signature fixe la largeur, KODOCARDS se justifie dessus */}
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        {Wordmark}
        {Sig}
      </span>
    </span>
  )
}

export default BrandMark
