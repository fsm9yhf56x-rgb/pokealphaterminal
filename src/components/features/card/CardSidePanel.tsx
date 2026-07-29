'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { SpotlightV2 } from '@/components/features/spotlight/SpotlightV2'
import { CollectorSidePanel } from './CollectorSidePanel'
import { usePersona } from '@/lib/usePersona'

/**
 * CardSidePanel = panneau lateral generique reutilisable (Pokedesk, Portfolio).
 *
 * Reading-pane facon terminal (Linear/Gmail) : colle au bord droit, pinne dans le
 * viewport (fixed), scroll interne, pas de voile -> la grille reste visible a gauche.
 * Mobile (<=900px) : bascule en plein ecran qui glisse.
 *
 * - cardId / lang : passes a SpotlightV2 (le contenu s'adapte selon portfolio).
 * - portfolio : contexte "ta carte" optionnel (qty, prix d'achat...) -> SpotlightV2
 *   affiche "Ton exemplaire" au lieu de "Prix de marche".
 * - actions : slot optionnel rendu en bas du panneau (gestion qty/favori/partage
 *   cote Portfolio ; vide cote Pokedesk = consultation pure).
 * - title : libelle de l'en-tete ("Apercu marche" par defaut).
 */

export type CardSidePanelPortfolio = {
  qty?: number
  buyPrice?: number
  condition?: string
  graded?: boolean
  psa?: number
}

export function CardSidePanel({
  cardId,
  lang = 'EN',
  onClose,
  portfolio,
  actions,
  title,
  width = 440,
}: {
  cardId: string
  lang?: 'EN' | 'JP' | 'FR'
  onClose: () => void
  portfolio?: CardSidePanelPortfolio
  actions?: ReactNode
  title?: string
  width?: number
}) {
  const { isInvestor } = usePersona()
  // Echap ferme le panneau
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Empeche le panneau (fixed) de recouvrir le footer : on ancre le bas du panneau
  // juste au-dessus du footer. Modele top+bottom -> la hauteur s'ajuste seule et ne
  // peut jamais devenir negative, contrairement a un calc(height) qui deborde.
  const [bottomOffset, setBottomOffset] = useState(24)
  useEffect(() => {
    const footer = document.querySelector('footer') as HTMLElement | null
    if (!footer) return
    const compute = () => {
      const rect = footer.getBoundingClientRect()
      const overlap = Math.max(0, window.innerHeight - rect.top) // px de footer visibles
      setBottomOffset(Math.max(24, overlap + 16)) // 16px de marge au-dessus du footer
    }
    compute()
    window.addEventListener('scroll', compute, { passive: true })
    window.addEventListener('resize', compute)
    return () => { window.removeEventListener('scroll', compute); window.removeEventListener('resize', compute) }
  }, [])

  return (
    <div
      className="card-side-dock"
      style={{
        width: `${width}px`,
        flexShrink: 0,
        position: 'fixed',
        top: '76px',
        right: '24px',
        bottom: `${bottomOffset}px`,
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
        .card-side-dock { scrollbar-width: thin; }
        .card-side-dock::-webkit-scrollbar { width: 8px; }
        .card-side-dock::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 8px; }
        .card-side-body svg { max-width: 100%; height: auto; }
        @keyframes kcPaneUp { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (max-width: 900px) {
          .card-side-dock {
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

      {/* En-tete sticky : label + fermer */}
      <div
        className="card-side-head"
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
          {title ?? (isInvestor ? 'Aperçu marché' : 'Aperçu')}
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

      {/* Corps : la fiche riche (SpotlightV2 s'adapte au contexte portfolio) */}
      <div className="card-side-body" style={{ padding: '8px 16px 20px' }}>
        {isInvestor
          ? <SpotlightV2 cardId={cardId} lang={lang} portfolio={portfolio as any} />
          : <CollectorSidePanel cardId={cardId} lang={lang as any} />}
        {actions ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  )
}
