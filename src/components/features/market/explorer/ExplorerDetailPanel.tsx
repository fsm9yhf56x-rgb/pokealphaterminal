'use client'

import { useEffect, useState, useRef } from 'react'
import { SpotlightV2 } from '@/components/features/spotlight/SpotlightV2'
import type { ExplorerResult } from '@/lib/useExplorerSearch'

/**
 * Reading-pane facon terminal (Bloomberg/Linear) :
 * panneau colle au bord droit, pinne dans le viewport (sticky), scroll interne.
 * Pas de voile sombre, pas de modale -> la grille reste visible a gauche.
 * Mobile (<=900px) : bascule en plein ecran qui glisse (le split est impossible en 380px).
 */
export function ExplorerDetailPanel({
  card, onClose,
}: {
  card: ExplorerResult
  onClose: () => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Empeche le panneau (fixed) de recouvrir le footer: on mesure de combien le footer
  // remonte dans le viewport et on raccourcit le bas du panneau d'autant.
  const [footerOverlap, setFooterOverlap] = useState(0)
  useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null
    if (!footer) return
    const compute = () => {
      const rect = footer.getBoundingClientRect()
      const vh = window.innerHeight
      // overlap = portion du footer visible depuis le bas du viewport
      const overlap = Math.max(0, vh - rect.top)
      setFooterOverlap(overlap)
    }
    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => { window.removeEventListener('scroll', compute); window.removeEventListener('resize', compute) }
  }, [])

  return (
    <div
      className="explorer-detail-dock"
      style={{
        width: '440px',
        flexShrink: 0,
        position: 'fixed',
        top: '76px',
        right: '24px',
        height: `calc(100vh - 100px - ${footerOverlap}px)`,
        zIndex: 40,
        overflowY: 'auto',
        background: 'rgba(255,255,255,0.78)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--border)',
        borderRadius: '16px',
        boxShadow: '0 12px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
      }}
    >
      <style>{`
        .explorer-detail-dock { scrollbar-width: thin; }
        .explorer-detail-dock::-webkit-scrollbar { width: 8px; }
        .explorer-detail-dock::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 8px; }
        /* Le chart et les SVG larges ne debordent jamais la largeur du panneau */
        .explorer-detail-body svg { max-width: 100%; height: auto; }
        @keyframes kcPaneUp { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (max-width: 900px) {
          .explorer-detail-dock {
            position: fixed !important;
            inset: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            border: none !important;
            border-radius: 0 !important;
            z-index: 200 !important;
            background: rgba(255,255,255,0.96) !important;
            animation: kcPaneUp 0.24s cubic-bezier(.2,.85,.3,1);
          }
        }
      `}</style>

      {/* En-tete sticky : label + fermer (toujours visible pendant le scroll interne) */}
      <div
        className="explorer-detail-head"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px 12px 16px',
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          Aperçu marché
        </span>
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            width: '30px',
            height: '30px',
            borderRadius: '9px',
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid var(--border)',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .18s cubic-bezier(.2,.8,.2,1)',
            flexShrink: 0,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.6)'; e.currentTarget.style.color = 'var(--ink-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Corps : la fiche riche en mode marche (pas de portfolio) */}
      <div className="explorer-detail-body" style={{ padding: '8px 16px 20px' }}>
        <SpotlightV2 cardId={card.card_ref} lang={card.lang || 'EN'} />
      </div>
    </div>
  )
}
