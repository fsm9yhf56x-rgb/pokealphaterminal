'use client'

import { useState } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'
import { SoonBadge, SoonModal } from '@/components/ui/snow'

/**
 * Marche en mouvement / Whale Tracker teaser - SOON v2.0
 * Remplace l'ancien HubMarketMovers (qui scrapait supabase - obsolete).
 * Aucune prop necessaire (composant autoporte).
 */
export function HubMarketMovers() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div
        onClick={() => setModalOpen(true)}
        style={{
          ...GLASS.card,
          overflow: 'hidden',
          padding: 0,
          cursor: 'pointer',
          position: 'relative',
          transition: 'transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s cubic-bezier(.2,.8,.2,1)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {/* Glow blue subtle */}
        <div style={{
          position: 'absolute',
          top: '-30%', left: '-15%',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(24,95,165,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        {/* Header */}
        <div style={{
          padding: '14px 18px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: SNOW.blueDark,
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: SNOW.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: FONT.display,
            }}>
              Marché en mouvement
            </span>
          </div>
          <SoonBadge version="v2.0" variant="inline" />
        </div>

        {/* Preview mockup blurred */}
        <div style={{
          padding: '6px 18px 18px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none' }}>
            {[
              { name: 'Pikachu Illustrator', pct: '+12%', vol: '14 ventes 24h' },
              { name: 'Lugia Neo Genesis 1ed', pct: '+8%', vol: '21 ventes 24h' },
              { name: 'Charizard Alt Art SV', pct: '-4%', vol: '37 ventes 24h' },
            ].map((row, i) => {
              const isUp = row.pct.startsWith('+')
              return (
                <div key={i} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 1fr auto',
                  gap: 12,
                  padding: '10px 0',
                  alignItems: 'center',
                  borderTop: i > 0 ? `1px solid ${SNOW.borderSoft}` : 'none',
                }}>
                  <div style={{
                    width: 36, height: 36,
                    borderRadius: RADIUS.sm,
                    background: SNOW.surface,
                    border: `1px solid ${SNOW.borderSoft}`,
                  }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: SNOW.ink }}>{row.name}</div>
                    <div style={{ fontSize: 10, color: SNOW.muted, fontFamily: FONT.body }}>{row.vol}</div>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isUp ? SNOW.green : SNOW.red,
                    fontFamily: FONT.data, fontVariantNumeric: 'tabular-nums',
                  }}>
                    {row.pct}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Overlay teaser */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 16,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.7) 60%, rgba(255,255,255,0.85) 100%)',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.7)',
              backdropFilter: 'blur(12px)',
              border: `1px solid ${SNOW.borderSoft}`,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SNOW.blueDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
              <span style={{
                fontSize: 11, fontWeight: 600, color: SNOW.ink,
                fontFamily: FONT.display,
              }}>
                Top mouvements du marché en temps réel
              </span>
            </div>
            <span style={{
              fontSize: 11, color: SNOW.muted, fontFamily: FONT.body,
            }}>
              Bientôt disponible · clique pour en savoir plus
            </span>
          </div>
        </div>
      </div>

      <SoonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        feature="Marché en mouvement"
        version="v2.0"
        description="Suis en temps réel les cartes les plus actives du marché : volumes de ventes, variations de prix, et mouvements des collectionneurs majeurs."
        bullets={[
          'Top movers par volume de ventes (24h, 7j, 30j)',
          'Détection des mouvements des collectionneurs majeurs',
          'Heatmap des sets en surchauffe',
          'Alertes sur les pics de volume inhabituels',
        ]}
        brevoListId={null}
      />
    </>
  )
}
