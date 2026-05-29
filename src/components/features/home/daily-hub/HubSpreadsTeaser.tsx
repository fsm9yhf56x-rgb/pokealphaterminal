'use client'

import { useState } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'
import { SoonBadge, SoonModal, SnowButton } from '@/components/ui/snow'

/**
 * Alpha Signals teaser - SOON v2.0
 * Remplace l'ancien HubSpreadsTeaser (qui montrait des spreads detectes).
 * Garde la signature des props pour compat DailyHub.
 */
export function HubSpreadsTeaser({ signals, loading }: { signals: any[]; loading: boolean }) {
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
        {/* Glow violet en fond (accent v2) */}
        <div style={{
          position: 'absolute',
          top: '-30%', right: '-15%',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(38,33,92,0.10) 0%, transparent 70%)',
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
              background: SNOW.purpleDark,
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: SNOW.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: FONT.display,
            }}>
              Alpha Signals
            </span>
          </div>
          <SoonBadge version="v2.0" variant="inline" />
        </div>

        {/* Preview mockup blurred (3 fake rows pour evoquer la feature) */}
        <div style={{
          padding: '6px 18px 18px',
          position: 'relative',
          zIndex: 1,
        }}>
          <div style={{ filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none' }}>
            {[
              { name: 'Charizard Alt Art', src: 'EU €820', tgt: 'US €2,340', pct: '+185%' },
              { name: 'Pikachu VMAX RA', src: 'EU €145', tgt: 'US €380', pct: '+162%' },
              { name: 'Mewtwo V Alt', src: 'EU €92', tgt: 'US €235', pct: '+155%' },
            ].map((row, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '24px 1fr auto',
                gap: 12,
                padding: '10px 0',
                alignItems: 'center',
                borderTop: i > 0 ? `1px solid ${SNOW.borderSoft}` : 'none',
              }}>
                <span style={{
                  fontSize: 9, fontWeight: 700, color: SNOW.purpleDark,
                  background: SNOW.purple, padding: '3px 6px',
                  borderRadius: 4, fontFamily: FONT.data,
                  textAlign: 'center',
                }}>S</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: SNOW.ink }}>{row.name}</div>
                  <div style={{ fontSize: 10, color: SNOW.muted, fontFamily: FONT.data }}>
                    {row.src} → {row.tgt}
                  </div>
                </div>
                <span style={{
                  fontSize: 13, fontWeight: 700, color: SNOW.green,
                  fontFamily: FONT.data, fontVariantNumeric: 'tabular-nums',
                }}>
                  {row.pct}
                </span>
              </div>
            ))}
          </div>

          {/* Overlay teaser CTA */}
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
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SNOW.purpleDark} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{
                fontSize: 11, fontWeight: 600, color: SNOW.ink,
                fontFamily: FONT.display,
              }}>
                Détection auto des cartes sous-évaluées
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
        feature="Alpha Signals"
        version="v2.0"
        description="Le moteur Kodo détecte automatiquement les cartes sous-évaluées sur le marché européen vs US, classées par niveau de confiance (S/A/B) et upside réel."
        bullets={[
          'Comparaison temps-réel EU vs US, JP, FR',
          'Tri par tier S/A/B selon confiance algorithmique',
          'Filtres par condition, état, langue, source',
          'Alertes push instantanées sur les nouveaux signaux',
        ]}
        brevoListId={null}
      />
    </>
  )
}
