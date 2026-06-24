'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'

/* ── Snow+ palette (auto-suffisant, aucune dépendance design) ────── */
const INK = '#1D1D1F', MUTED = '#6E6E73', LINE = '#E5E5EA'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"

export type UpgradeTier = 'pro' | 'premium'

/**
 * Modale de conversion réutilisable — LA surface d'upsell du site.
 * Tier-aware (pro / premium), contextuelle (titre/sous-titre adaptés à la
 * feature cliquée), prix + levier Early Supporter, CTA unique fort.
 *
 * Usage :
 *   const [up, setUp] = useState<{tier:'pro'|'premium'; title?:string; sub?:string; previewHref?:string}|null>(null)
 *   ...
 *   <UpgradeModal open={!!up} onClose={()=>setUp(null)} tier={up?.tier ?? 'pro'}
 *     feature={up ? { title: up.title, subtitle: up.sub, previewHref: up.previewHref } : undefined} />
 */
const TIER: Record<UpgradeTier, {
  color: string; glow: string; kicker: string; price: string; cta: string;
  defaultTitle: string; defaultSub: string; bullets: string[]; early: string | null; regularPrice: string | null;
}> = {
  pro: {
    color: '#185FA5',
    glow: 'rgba(24,95,165,0.16)',
    kicker: 'Passe Pro',
    price: '3,99 €',
    regularPrice: null,
    cta: 'Passer Pro',
    early: null,
    defaultTitle: 'Passe la vitesse supérieure',
    defaultSub: 'Toute ta collection sans limite, et tes analyses de portefeuille en détail.',
    bullets: [
      'Ta collection en illimité — au-delà de 800 cartes',
      'Ta performance et ton ROI réel dans le temps',
      'Ton historique de prix complet',
      'Tes objectifs de collection illimités',
    ],
  },
  premium: {
    color: '#6E56CF',
    glow: 'rgba(110,86,207,0.18)',
    kicker: 'Passe Premium',
    price: '5,99 €',
    regularPrice: '9,99 €',
    cta: 'Passer Premium',
    early: '−40 % à vie · 300 places',
    defaultTitle: 'Le terminal complet',
    defaultSub: 'Tout le Pro, plus l\u2019analyse de gradation et le marché gradé complet.',
    bullets: [
      'Faut-il grader ? — l\u2019EV nette réelle, carte par carte',
      'Le marché gradé complet — toutes notes, toutes cartes',
      'Les rapports de population PSA',
      'Nori en illimité',
    ],
  },
}

export function UpgradeModal({
  open, onClose, tier, feature,
}: {
  open: boolean
  onClose: () => void
  tier: UpgradeTier
  feature?: { title?: string; subtitle?: string; previewHref?: string }
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  if (!open) return null

  const t = TIER[tier]
  const title = feature?.title || t.defaultTitle
  const sub = feature?.subtitle || t.defaultSub

  const content = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        background: 'rgba(20,20,22,0.42)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        animation: 'kum-fade .2s ease both',
      }}
    >
      <style>{`
        @keyframes kum-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes kum-pop { from { opacity: 0; transform: translateY(12px) scale(.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        .kum-cta { transition: transform .16s cubic-bezier(.2,.85,.3,1), box-shadow .16s; }
        .kum-cta:hover { transform: translateY(-1px); }
        .kum-close { transition: background .15s, color .15s; }
        .kum-close:hover { background: rgba(0,0,0,0.05); color: #1D1D1F; }
        @media (prefers-reduced-motion: reduce) {
          .kum-cta, [style*="kum-pop"] { animation: none !important; }
        }
      `}</style>

      <div
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{
          position: 'relative', width: '100%', maxWidth: 460,
          borderRadius: 22, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.91) 100%)',
          backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.8)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '28px 26px 24px',
          animation: 'kum-pop .26s cubic-bezier(.32,.72,0,1) both',
        }}
      >
        {/* glow accent */}
        <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)`, pointerEvents: 'none' }} />

        {/* close */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          className="kum-close"
          style={{
            position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: '50%',
            border: `1px solid ${LINE}`, background: 'rgba(255,255,255,0.7)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: MUTED, fontSize: 17, lineHeight: 1,
          }}
        >×</button>

        <div style={{ position: 'relative' }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.color }}>{t.kicker}</span>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 23, letterSpacing: '-0.03em', color: INK, margin: '9px 0 6px', lineHeight: 1.15 }}>{title}</h2>
          <p style={{ fontFamily: DISPLAY, fontSize: 14, color: MUTED, lineHeight: 1.5, margin: 0 }}>{sub}</p>

          <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'grid', gap: 10 }}>
            {t.bullets.map((b, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: DISPLAY, fontSize: 13.5, color: INK, lineHeight: 1.4 }}>
                <span style={{ flexShrink: 0, marginTop: 1, color: t.color }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {b}
              </li>
            ))}
          </ul>

          {/* prix + rareté */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${LINE}`, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: INK, letterSpacing: '-0.03em' }}>{t.price}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 13, color: MUTED }}>/ mois</span>
            {t.regularPrice && <span style={{ fontFamily: DISPLAY, fontSize: 15, color: '#AEAEB2', textDecoration: 'line-through', fontWeight: 600 }}>{t.regularPrice}</span>}
            {t.early && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 10.5, fontWeight: 700, color: t.color, background: `${t.color}14`, padding: '4px 8px', borderRadius: 7, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>{t.early}</span>}
          </div>

          {/* CTAs */}
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link
              href="/abonnement"
              onClick={onClose}
              className="kum-cta"
              style={{
                textDecoration: 'none', textAlign: 'center', padding: '14px 22px', borderRadius: 999,
                background: t.color, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 15, letterSpacing: '-0.01em',
                boxShadow: `0 8px 22px ${t.color}55, inset 0 1px 0 rgba(255,255,255,0.22)`,
              }}
            >{t.cta} →</Link>

            {feature?.previewHref ? (
              <Link href={feature.previewHref} onClick={onClose} style={{ textDecoration: 'none', textAlign: 'center', fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: MUTED }}>
                Voir un aperçu
              </Link>
            ) : (
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: DISPLAY, fontSize: 13, fontWeight: 600, color: MUTED }}>
                Plus tard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
