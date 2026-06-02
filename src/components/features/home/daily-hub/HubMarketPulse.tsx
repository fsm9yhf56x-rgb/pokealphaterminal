'use client'

import { useState } from 'react'
import type { MarketIndex } from '@/lib/useMarketData'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'
import { SoonBadge, SoonModal } from '@/components/ui/snow'

/**
 * Pouls du marché — teaser SOON v2.0.
 * Les indices existent en base mais les variations ne sont pas encore fiables,
 * donc on présente la feature en "Bientôt disponible" avec un aperçu flouté,
 * sur le même modèle que Alpha Signals.
 */
export function HubMarketPulse({
  indices, loading,
}: {
  indices: MarketIndex[]
  loading: boolean
}) {
  const [modalOpen, setModalOpen] = useState(false)

  const preview = (indices && indices.length > 0)
    ? indices.slice(0, 4)
    : [
        { id: 'vintage_us', label: 'PKA Vintage US', sparkline: [], change_24h_pct: 0 },
        { id: 'modern_fr', label: 'PKA Modern FR', sparkline: [], change_24h_pct: 0 },
        { id: 'modern_en', label: 'PKA Modern EN', sparkline: [], change_24h_pct: 0 },
        { id: 'japan', label: 'PKA Japan', sparkline: [], change_24h_pct: 0 },
      ] as any[]

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
        <div style={{
          position: 'absolute', top: '-30%', right: '-15%',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(34,139,87,0.10) 0%, transparent 70%)',
          filter: 'blur(40px)', pointerEvents: 'none',
        }} />

        <div style={{
          padding: '14px 18px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'relative', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: SNOW.green }} />
            <span style={{
              fontSize: 10, fontWeight: 700, color: SNOW.muted,
              textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: FONT.display,
            }}>
              Pouls du marché
            </span>
          </div>
          <SoonBadge version="v2.0" variant="inline" />
        </div>

        <div style={{ padding: '6px 18px 18px', position: 'relative', zIndex: 1 }}>
          <div style={{
            filter: 'blur(2px)', opacity: 0.55, pointerEvents: 'none',
            display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
          }}>
            {preview.map((idx, i) => (
              <div key={idx.id || i} style={{
                ...GLASS.cardSoft, padding: '10px 12px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: SNOW.inkSoft, fontFamily: FONT.display }}>
                  {idx.label}
                </span>
                <MiniSparkStatic />
              </div>
            ))}
          </div>

          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16,
            background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.7) 60%, rgba(255,255,255,0.85) 100%)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 999,
              background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)',
              border: `1px solid ${SNOW.borderSoft}`,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={SNOW.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18" />
                <path d="m19 9-5 5-4-4-3 3" />
              </svg>
              <span style={{ fontSize: 11, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>
                Indices de marché en temps réel
              </span>
            </div>
            <span style={{ fontSize: 11, color: SNOW.muted, fontFamily: FONT.body }}>
              Bientôt disponible · clique pour en savoir plus
            </span>
          </div>
        </div>
      </div>

      <SoonModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        feature="Pouls du marché"
        version="v2.0"
        description="Des indices de marché composites (Vintage US, Modern FR/EN, Japan) calculés en temps réel à partir des ventes réelles, pour suivre la tendance globale du TCG d'un coup d'œil."
        bullets={[
          'Indices Vintage US, Modern FR, Modern EN, Japan',
          'Variations 24h / 7j / 30j fiables',
          'Sparklines et historique consolidé',
          'Alertes sur les retournements de tendance',
        ]}
        brevoListId={null}
      />
    </>
  )
}

function MiniSparkStatic() {
  return (
    <svg width="100%" height="28" viewBox="0 0 150 28" preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d="M0,20 C20,18 30,8 50,12 C70,16 80,6 100,10 C120,14 130,20 150,16"
        fill="none" stroke={SNOW.green} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
