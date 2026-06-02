'use client'

import { useRouter } from 'next/navigation'
import { usePlan } from '@/lib/usePlan'
import { SNOW, FONT, GLASS, RADIUS } from '@/lib/design/snow'

/**
 * UpgradeHook — carte glass v7 affichée à la place d'un widget verrouillé.
 * Message + CTA s'adaptent au plan courant :
 *   free → "Passer Pro"   pro → "Passer Premium"   premium → null
 */
export function UpgradeHook({
  requires,
  title,
  desc,
  compact,
}: {
  requires: 'pro' | 'premium'
  title: string
  desc: string
  compact?: boolean
}) {
  const router = useRouter()
  const { plan } = usePlan()

  const rank = { free: 0, pro: 1, premium: 2 } as const
  if (rank[plan] >= rank[requires]) return null

  const targetLabel = requires === 'premium' ? 'Premium' : 'Pro'
  const ctaText = requires === 'premium' ? 'Passer Premium' : 'Passer Pro'

  return (
    <div
      style={{
        ...GLASS.card,
        padding: compact ? '18px 20px' : '26px 24px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        minHeight: compact ? undefined : 160,
        justifyContent: 'center',
      }}
    >
      <div style={{
        position: 'absolute', top: '-40%', right: '-10%',
        width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(224,48,32,0.10) 0%, transparent 70%)',
        filter: 'blur(24px)', pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10, fontWeight: 700, fontFamily: FONT.data,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: SNOW.red, background: SNOW.redLight,
          padding: '4px 10px', borderRadius: RADIUS.pill,
          marginBottom: 12,
        }}>
          <LockIcon /> {targetLabel}
        </span>

        <h3 style={{
          margin: '0 0 6px', fontSize: compact ? 15 : 17, fontWeight: 700,
          color: SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em',
        }}>
          {title}
        </h3>
        <p style={{
          margin: 0, fontSize: 13, lineHeight: 1.5,
          color: SNOW.muted, fontFamily: FONT.body, maxWidth: '42ch',
        }}>
          {desc}
        </p>

        <button
          onClick={() => router.push('/#pricing')}
          style={{
            marginTop: 16,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: `linear-gradient(135deg, ${SNOW.red}, #FF4433)`,
            color: '#fff', border: 'none',
            borderRadius: RADIUS.md, padding: '10px 18px',
            fontFamily: FONT.display, fontWeight: 600, fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(224,48,32,0.26)',
            transition: 'transform .15s, box-shadow .25s',
            alignSelf: 'flex-start',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(224,48,32,0.32)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'none'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(224,48,32,0.26)'
          }}
        >
          {ctaText} <span style={{ fontSize: 15 }}>→</span>
        </button>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
