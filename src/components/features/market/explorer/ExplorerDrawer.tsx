'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { getCardImageUrl, parseLocalIdR2 } from '@/lib/images'
import { SpotlightV2 } from '@/components/features/spotlight/SpotlightV2'
import type { ExplorerResult } from '@/lib/useExplorerSearch'

/**
 * Drawer detail Explorer : meme coque que le Portfolio (SpotDrawer),
 * mais carte NON possedee -> SpotlightV2 sans portfolio = mode "Prix de marche".
 * Image a gauche (calculee comme la grille), fiche riche a droite.
 */
export function ExplorerDrawer({
  card, onClose,
}: {
  card: ExplorerResult | null
  onClose: () => void
}) {
  const isOpen = card !== null

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!card) return null

  const imgUrl = card.tcgdex_set_id && card.card_number
    ? getCardImageUrl({
        lang: (card.lang as any) || 'EN',
        setId: card.tcgdex_set_id,
        localId: parseLocalIdR2(card.card_number),
      })
    : ''

  return createPortal(
    <div className="spot-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }} onClick={onClose}>
      <div className="spot-modal" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(40px) saturate(200%)', WebkitBackdropFilter: 'blur(40px) saturate(200%)', borderRadius: '20px', border: 'none', boxShadow: '0 24px 60px rgba(0,0,0,.18), 0 8px 20px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,0.9)', padding: 0, maxWidth: '1280px', width: '95vw', height: '90vh', animation: 'kcSpringIn 0.22s cubic-bezier(.2,.85,.3,1)', position: 'relative', display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' as const, isolation: 'isolate' as const }} onClick={e => e.stopPropagation()}>
        <style>{`
          @media (max-width: 900px) {
            .spot-overlay { padding: 0 !important; }
            .spot-modal { width: 100% !important; height: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
            .spot-cols { flex-direction: column !important; overflow-y: auto !important; }
            .spot-imgcol { width: 100% !important; flex-shrink: 0 !important; padding: 6px 16px 0 !important; border-radius: 0 !important; }
            .spot-imgcol .gem { max-width: 130px !important; }
            .spot-close { top: 12px !important; right: 12px !important; background: rgba(0,0,0,0.45) !important; border-color: rgba(255,255,255,0.2) !important; }
            .spot-modal svg { max-width: 100% !important; }
          }
        `}</style>

        {/* Halo glassmorphism (identique SpotDrawer) */}
        <div style={{ position: 'absolute' as const, inset: 0, overflow: 'hidden' as const, borderRadius: '20px', pointerEvents: 'none' as const, zIndex: 0 }}>
          <div style={{ position: 'absolute' as const, top: '-10%', left: '-15%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(255,165,80,0.42) 0%, rgba(255,165,80,0.15) 40%, transparent 75%)', filter: 'blur(110px)' }} />
          <div style={{ position: 'absolute' as const, top: '15%', right: '-15%', width: '70%', height: '70%', background: 'radial-gradient(circle, rgba(110,150,255,0.36) 0%, rgba(110,150,255,0.12) 40%, transparent 75%)', filter: 'blur(130px)' }} />
          <div style={{ position: 'absolute' as const, bottom: '-10%', right: '-10%', width: '70%', height: '60%', background: 'radial-gradient(circle, rgba(0,210,150,0.28) 0%, rgba(0,210,150,0.1) 40%, transparent 75%)', filter: 'blur(120px)' }} />
        </div>

        <button className="spot-close" onClick={onClose} style={{ position: 'absolute', top: 0, right: '-56px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(24px) saturate(200%)', WebkitBackdropFilter: 'blur(24px) saturate(200%)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, transition: 'all .2s cubic-bezier(.2,.8,.2,1)', boxShadow: '0 4px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>

        <div className="spot-cols" style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' as const }}>
          <div className="spot-imgcol" style={{ flexShrink: 0, width: '380px', position: 'relative' as const, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', overflow: 'hidden' as const, borderTopLeftRadius: '20px', borderBottomLeftRadius: '20px' }}>
            <div className="gem" style={{ background: 'transparent', borderRadius: '18px', width: '100%', maxWidth: '280px', position: 'relative' as const, zIndex: 1, filter: 'drop-shadow(0 24px 40px rgba(0,0,0,.18)) drop-shadow(0 8px 16px rgba(0,0,0,.08)) drop-shadow(0 0 36px rgba(255,150,80,0.16))' }}>
              <div style={{ aspectRatio: '63/88', margin: '6px 6px 0', borderRadius: '14px', background: '#EBEBEB', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {imgUrl ? (
                  <img src={imgUrl} alt={card.card_name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                    onError={e => { const t = e.target as HTMLImageElement; t.onerror = null; t.style.opacity = '0' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', zIndex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#86868B" strokeWidth="1.5" strokeLinecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0, padding: 0, overflowY: 'auto' as const, display: 'flex', flexDirection: 'column' as const }}>
            <div style={{ padding: '18px 22px 16px' }}>
              <SpotlightV2 cardId={card.card_ref} lang={card.lang || 'EN'} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
