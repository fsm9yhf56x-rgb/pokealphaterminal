'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { PerfAggregates, AllocationBucket } from './Performance'

/**
 * 3 mini-donuts Recharts : répartition par langue, set, rareté
 */
export function PerfAllocation({ agg }: { agg: PerfAggregates }) {
  return (
    <div>
      <style>{`
        .perf-alloc-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
        }
      `}</style>
      <SectionTitle>Allocation</SectionTitle>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '14px',
      }}>
        <DonutCard title="Par langue"  buckets={agg.byLang}   />
        <DonutCard title="Par set"     buckets={agg.bySet}    />
        <DonutCard title="Par rareté"  buckets={agg.byRarity} />
      </div>
    </div>
  )
}

/* Snow+ palette : data colors (ordered by salience) */
const PALETTE = [
  '#1D1D1F',  // ink (dominant)
  '#E03020',  // accent red
  '#1D9E75',  // perf-up
  '#D4AF37',  // premium gold
  '#6E6E73',  // ink-muted
  '#AEAEB2',  // ink-faint
  '#C7C7CC',  // border-strong
  '#E5E5EA',  // border (last fallback)
]

function DonutCard({ title, buckets }: { title: string; buckets: AllocationBucket[] }) {
  const data = buckets.map((b, i) => ({
    name: b.label,
    value: b.value,
    pct: b.pct,
    count: b.count,
    fill: PALETTE[i % PALETTE.length],
  }))

  const totalValue = buckets.reduce((s, b) => s + b.value, 0)

  return (
    <div className="perf-alloc-card" style={{
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 14,
      padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      transition: 'all .3s cubic-bezier(.2,.85,.3,1)',
    }}>
      <div style={{
        fontSize: 10.5,
        fontWeight: 700,
        color: '#86868B',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        marginBottom: 14,
      }}>{title}</div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr',
        gap: '14px',
        alignItems: 'center',
      }}>
        {/* Donut */}
        <div style={{ width: '120px', height: '120px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip content={<DonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Center label */}
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              fontSize: 9.5,
              color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 600,
              marginBottom: 2,
            }}>Total</div>
            <div style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#1D1D1F',
              fontFamily: 'var(--font-data, "Space Mono", monospace)',
              letterSpacing: '-0.3px',
            }}>{formatEURcompact(totalValue)}</div>
          </div>
        </div>

        {/* Legend */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '6px',
          minWidth: 0,
        }}>
          {data.slice(0, 5).map((d, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '8px 1fr auto',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}>
              <div style={{
                width: '8px', height: '8px',
                borderRadius: '2px',
                background: d.fill,
                flexShrink: 0,
              }} />
              <div style={{
                fontSize: 11.5,
                color: '#1D1D1F',
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{d.name}</div>
              <div style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#86868B',
                fontFamily: 'var(--font-data, "Space Mono", monospace)',
              }}>{d.pct.toFixed(0)}%</div>
            </div>
          ))}
          {data.length > 5 && (
            <div style={{
              fontSize: 10.5,
              color: '#AEAEB2',
              fontStyle: 'italic',
              marginTop: 3,
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
            }}>+ {data.length - 5} autres</div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Custom tooltip Snow+ */
function DonutTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.6)',
      borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
    }}>
      <div style={{
        fontSize: 11.5,
        fontWeight: 700,
        color: '#1D1D1F',
        marginBottom: 3,
      }}>{d.name}</div>
      <div style={{
        fontSize: 10.5,
        color: '#86868B',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>
        {formatEUR(d.value)} · {d.pct.toFixed(1)}% · {d.count} carte{d.count > 1 ? 's' : ''}
      </div>
    </div>
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

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
