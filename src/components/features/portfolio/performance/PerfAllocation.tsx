'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { PerfAggregates, AllocationBucket } from './Performance'

/**
 * 3 mini-donuts Recharts : répartition par langue, set, rareté
 */
export function PerfAllocation({ agg }: { agg: PerfAggregates }) {
  return (
    <div>
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
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '16px 18px',
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
        marginBottom: '12px',
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
              fontSize: '10px',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>Total</div>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--ink)',
              fontFamily: 'var(--font-data, var(--font-display))',
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
                fontSize: '11px',
                color: 'var(--ink)',
                fontFamily: 'var(--font-display)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>{d.name}</div>
              <div style={{
                fontSize: '11px',
                fontWeight: 500,
                color: 'var(--ink-muted)',
                fontFamily: 'var(--font-data, var(--font-display))',
              }}>{d.pct.toFixed(0)}%</div>
            </div>
          ))}
          {data.length > 5 && (
            <div style={{
              fontSize: '10px',
              color: 'var(--ink-faint)',
              fontStyle: 'italic',
              marginTop: '2px',
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
      background: 'var(--surface)',
      border: '1px solid var(--border-strong)',
      borderRadius: '8px',
      padding: '8px 12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--ink)',
        marginBottom: '2px',
      }}>{d.name}</div>
      <div style={{
        fontSize: '10px',
        color: 'var(--ink-muted)',
      }}>
        {formatEUR(d.value)} · {d.pct.toFixed(1)}% · {d.count} carte{d.count > 1 ? 's' : ''}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '10px', fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, var(--border), transparent)',
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
