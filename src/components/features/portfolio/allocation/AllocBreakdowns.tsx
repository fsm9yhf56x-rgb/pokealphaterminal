'use client'

import type { AllocAggregates, AllocBucket } from './Allocation'
import { GateOverlay } from '@/components/upgrade/GateOverlay'

/**
 * 4 stacked bars : langue / ère / rareté / condition.
 * Vue analytique : où est l'argent par dimension.
 * Gating Free : PAR LANGUE libre ; ère / rareté / état -> floutés + panneau Pro.
 */
export function AllocBreakdowns({ agg, collector, isPro }: { agg: AllocAggregates; collector?: boolean; isPro?: boolean }) {
  return (
    <div>
      <style>{`
        .alloc-breakdown-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
      `}</style>
      <SectionTitle>{collector ? 'Composition de ma collection' : 'Répartition par dimension'}</SectionTitle>

      {isPro ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '14px',
        }}>
          <BreakdownCard title="Par langue"    buckets={agg.byLang}      collector={collector} />
          <BreakdownCard title="Par ère"       buckets={agg.byEra}       collector={collector} />
          <BreakdownCard title="Par rareté"    buckets={agg.byRarity}    collector={collector} />
          <BreakdownCard title="Par état"      buckets={agg.byCondition} collector={collector} />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Par langue : libre (le hook) */}
          <BreakdownCard title="Par langue" buckets={agg.byLang} collector={collector} />
          {/* Ère / Rareté / État : Pro */}
          <GateOverlay
            locked
            tier="pro"
            maxHeight={300}
            minHeight={300}
            title="Ta répartition complète"
            desc="Par ère, par rareté et par état — la concentration de ton capital sous tous les angles."
            feature={{ title: 'Ta répartition complète', subtitle: 'Par ère, rareté et état — vois la concentration de ton capital sous tous les angles.' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <BreakdownCard title="Par ère"    buckets={agg.byEra}       collector={collector} />
              <BreakdownCard title="Par rareté" buckets={agg.byRarity}    collector={collector} />
              <BreakdownCard title="Par état"   buckets={agg.byCondition} collector={collector} />
            </div>
          </GateOverlay>
        </div>
      )}
    </div>
  )
}

/* Snow+ data palette : ordered for visual hierarchy */
const PALETTE = [
  '#1D1D1F',  // ink dominant
  '#E03020',  // accent red
  '#1D9E75',  // perf-up
  '#D4AF37',  // premium gold
  '#6E6E73',  // ink-muted
  '#AEAEB2',  // ink-faint
  '#C7C7CC',  // border-strong
  '#E5E5EA',  // border (last)
]

function BreakdownCard({ title, buckets, collector }: { title: string; buckets: AllocBucket[]; collector?: boolean }) {
  if (buckets.length === 0) {
    return (
      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 14,
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        <CardTitle title={title} />
        <div style={{
          padding: '24px 0',
          textAlign: 'center',
          fontSize: 11.5,
          color: '#AEAEB2',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>Pas de données</div>
      </div>
    )
  }

  const colored = buckets.map((b, i) => ({
    ...b,
    dispPct: collector ? ((b.count || 0) / (buckets.reduce((q,x)=>q+(x.count||0),0)||1)) * 100 : (b.pct || 0),
    color: PALETTE[i % PALETTE.length],
  }))

  // Top bucket signals concentration
  const topPct = colored[0]?.dispPct || 0
  const isHighConcentration = !collector && topPct > 60

  return (
    <div className="alloc-breakdown-card" style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      transition: 'all .3s cubic-bezier(.2,.85,.3,1)',
    }}>
      <CardTitle title={title} />

      {/* Stacked bar */}
      <div style={{
        display: 'flex',
        height: 10,
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 16,
        gap: 2,
        background: 'rgba(0,0,0,0.04)',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
      }}>
        {colored.map((b) => (
          <div
            key={b.label}
            title={`${b.label} : ${Number(b.dispPct ?? 0).toFixed(1)}%`}
            style={{
              width: `${Math.max(b.dispPct, 0.3)}%`,
              background: b.color,
              minWidth: b.pct > 1 ? undefined : '3px',
              transition: 'width 0.4s ease',
            }}
          />
        ))}
      </div>

      {/* Legend rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {colored.map((b) => (
          <div
            key={b.label}
            style={{
              display: 'grid',
              gridTemplateColumns: '8px 1fr auto auto',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '2px',
              background: b.color,
              flexShrink: 0,
            }} />
            <span style={{
              fontSize: 12,
              color: '#1D1D1F',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>{b.label}</span>
            <span style={{
              fontSize: 11.5,
              color: '#86868B',
              fontWeight: 600,
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              minWidth: 36,
              textAlign: 'right' as const,
            }}>{Number(b.dispPct ?? 0).toFixed(1)}%</span>
            <span style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: '#1D1D1F',
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              minWidth: 60,
              textAlign: 'right' as const,
            }}>{collector ? `${b.count} carte${b.count>1?'s':''}` : formatEURcompact(b.value)}</span>
          </div>
        ))}
      </div>

      {/* Concentration footnote */}
      {isHighConcentration && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(0,0,0,0.05)',
          fontSize: 10.5,
          color: '#C42E1F',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          fontWeight: 600,
        }}>
          ▲ Forte concentration sur "{colored[0].label}"
        </div>
      )}
    </div>
  )
}

function CardTitle({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 10.5,
      fontWeight: 700,
      color: '#86868B',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
      marginBottom: 14,
    }}>{title}</div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: '#C42E1F',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)',
      }} />
    </div>
  )
}

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${Number(v ?? 0).toFixed(0)}`
}
