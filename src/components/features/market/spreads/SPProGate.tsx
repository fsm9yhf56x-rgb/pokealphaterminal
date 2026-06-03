'use client'

import { useRouter } from 'next/navigation'
import { GlassButton } from '@/components/ui/GlassButton'

/**
 * Overlay de gate Pro affiché sous le grid de signaux — glass v7 clair.
 * L'or reste en accent (badge + compteur) pour la notion premium, sans bloc dark.
 */
export function SPProGate({ hiddenCount }: { hiddenCount: number }) {
  const router = useRouter()

  return (
    <div style={{
      position: 'relative',
      background: 'rgba(255,255,255,0.62)',
      backdropFilter: 'blur(24px) saturate(180%)',
      WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      borderRadius: '18px',
      border: 'none',
      boxShadow: '0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
      padding: '32px 28px',
      overflow: 'hidden',
      color: '#1D1D1F',
    }}>
      {/* Bokeh doux or/rouge (accent premium discret) */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: 'radial-gradient(ellipse at 82% 20%, rgba(201,162,39,0.10) 0%, transparent 50%), radial-gradient(ellipse at 15% 90%, rgba(224,48,32,0.05) 0%, transparent 45%)',
      }} />

      {/* Sparkle accent top-right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '24px',
        fontSize: '24px',
        color: '#C9A227',
        opacity: 0.5,
        animation: 'sparkle 3s ease-in-out infinite',
      }}>◆</div>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.35; transform: scale(1) rotate(0deg); }
          50%      { opacity: 0.8; transform: scale(1.1) rotate(15deg); }
        }
      `}</style>

      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: '20px',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Left : message */}
        <div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            background: 'rgba(201, 162, 39, 0.12)',
            border: '0.5px solid rgba(201, 162, 39, 0.35)',
            borderRadius: '999px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#8A6500',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-display)',
            marginBottom: '12px',
          }}>
            <span>◆</span>
            Pro · Spreads &amp; Signals
          </div>

          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '-0.4px',
            marginBottom: '6px',
            fontFamily: 'var(--font-display)',
            color: '#1D1D1F',
          }}>
            <span style={{ color: '#B8860B' }}>{hiddenCount.toLocaleString('fr-FR')} signaux</span> sont cachés
          </div>

          <div style={{
            fontSize: '13px',
            color: '#48484A',
            lineHeight: 1.5,
            fontFamily: 'var(--font-body)',
            marginBottom: '4px',
          }}>
            Débloquez tous les spreads en passant à Pro. Plus l&apos;accès anticipé aux Alpha Signals (sous-cotation, momentum, set heat — bientôt disponibles).
          </div>
        </div>

        {/* Right : CTA */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          flexShrink: 0,
        }}>
          <GlassButton size="lg" onClick={() => router.push('/pricing')}>
            Découvrir Pro
          </GlassButton>

          <div style={{
            fontSize: '10px',
            color: '#86868B',
            fontFamily: 'var(--font-display)',
          }}>
            Dès 9,99€/mois · Sans engagement
          </div>
        </div>
      </div>

      {/* Features chips — glass clair */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(0, 0, 0, 0.06)',
      }}>
        <Chip>Tous les spreads S/A/B</Chip>
        <Chip>Alertes temps réel</Chip>
        <Chip>Whale Tracker</Chip>
        <Chip>Kodo AI illimité</Chip>
        <Chip>Export portfolio</Chip>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '5px 12px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.55) 100%)',
      border: '0.5px solid rgba(255,255,255,0.6)',
      borderRadius: '999px',
      fontSize: '10px',
      fontWeight: 600,
      color: '#3A3A3C',
      fontFamily: 'var(--font-display)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>{children}</span>
  )
}
