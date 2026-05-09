'use client'

import { useRouter } from 'next/navigation'

/**
 * Overlay de gate Pro affiché sous le grid de signaux.
 * Encourage la conversion en montrant clairement la valeur cachée.
 */
export function SEProGate({ hiddenCount }: { hiddenCount: number }) {
  const router = useRouter()

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%)',
      borderRadius: '14px',
      padding: '32px 28px',
      overflow: 'hidden',
      color: 'var(--surface)',
    }}>
      {/* Decorative gold dots pattern */}
      <div style={{
        position: 'absolute',
        top: 0, right: 0,
        width: '40%',
        height: '100%',
        backgroundImage: 'radial-gradient(circle at 70% 30%, rgba(212,175,55,0.18) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />

      {/* Sparkle accent top-right */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '24px',
        fontSize: '24px',
        opacity: 0.4,
        animation: 'sparkle 3s ease-in-out infinite',
      }}>◆</div>
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(1) rotate(0deg); }
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
            background: 'rgba(212, 175, 55, 0.16)',
            border: '1px solid rgba(212, 175, 55, 0.4)',
            borderRadius: '6px',
            fontSize: '10px',
            fontWeight: 700,
            color: '#E8C56A',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            fontFamily: 'var(--font-display)',
            marginBottom: '12px',
          }}>
            <span>◆</span>
            Pro · Alpha Signals
          </div>

          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            letterSpacing: '-0.4px',
            marginBottom: '6px',
            fontFamily: 'var(--font-display)',
          }}>
            <span style={{ color: '#E8C56A' }}>{hiddenCount.toLocaleString('fr-FR')} signaux</span> sont cachés
          </div>

          <div style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: 1.5,
            fontFamily: 'var(--font-display)',
            marginBottom: '4px',
          }}>
            Débloquez tous les Alpha Signals en passant à Pro. Détection en temps réel, alertes prioritaires, et accès aux signaux S-tier exclusifs.
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
          <button
            onClick={() => router.push('/pricing')}
            style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #E8C56A 0%, #D4AF37 100%)',
              color: '#1D1D1F',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.02em',
              boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 22px rgba(212, 175, 55, 0.45)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(212, 175, 55, 0.3)'
            }}
          >
            Découvrir Pro
          </button>

          <div style={{
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontFamily: 'var(--font-display)',
          }}>
            Dès 9,99€/mois · Sans engagement
          </div>
        </div>
      </div>

      {/* Features chips */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <Chip>Tous les signaux S/A/B</Chip>
        <Chip>Alertes temps réel</Chip>
        <Chip>Whale Tracker</Chip>
        <Chip>Dexy AI illimité</Chip>
        <Chip>Export portfolio</Chip>
      </div>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      padding: '5px 10px',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      borderRadius: '6px',
      fontSize: '10px',
      fontWeight: 500,
      color: 'rgba(255, 255, 255, 0.85)',
      fontFamily: 'var(--font-display)',
    }}>{children}</span>
  )
}
