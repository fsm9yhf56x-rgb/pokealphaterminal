'use client'

import { useState, useMemo } from 'react'
import type { PerfAggregates, EnrichedHolding } from './Performance'

type SortKey = 'name' | 'set' | 'qty' | 'cost' | 'value' | 'gain' | 'roi'
type SortDir = 'asc' | 'desc'

const COLS: { key: SortKey; label: string; align: 'left' | 'right'; width: string }[] = [
  { key: 'name',  label: 'Carte',     align: 'left',  width: '2.2fr' },
  { key: 'set',   label: 'Set',       align: 'left',  width: '1.4fr' },
  { key: 'qty',   label: 'Qté',       align: 'right', width: '0.6fr' },
  { key: 'cost',  label: 'Coût',      align: 'right', width: '1fr'   },
  { key: 'value', label: 'Valeur',    align: 'right', width: '1fr'   },
  { key: 'gain',  label: 'Gain',      align: 'right', width: '1fr'   },
  { key: 'roi',   label: 'ROI',       align: 'right', width: '0.8fr' },
]

export function PerfTable({ agg }: { agg: PerfAggregates }) {
  const [sortKey, setSortKey] = useState<SortKey>('roi')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filter, setFilter] = useState('')

  const sorted = useMemo(() => {
    const arr = [...agg.enrichedHoldings]
    const filtered = filter
      ? arr.filter(h =>
          h.name.toLowerCase().includes(filter.toLowerCase()) ||
          (h.set_name || '').toLowerCase().includes(filter.toLowerCase())
        )
      : arr

    filtered.sort((a, b) => {
      const va = getSortValue(a, sortKey)
      const vb = getSortValue(b, sortKey)
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      const na = Number(va) || 0
      const nb = Number(vb) || 0
      return sortDir === 'asc' ? na - nb : nb - na
    })
    return filtered
  }, [agg.enrichedHoldings, sortKey, sortDir, filter])

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const gridCols = COLS.map(c => c.width).join(' ')

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        gap: '12px',
        flexWrap: 'wrap',
      }}>
        <SectionTitle>Performance par carte ({sorted.length})</SectionTitle>

        <input
          type="text"
          placeholder="Filtrer..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            fontFamily: 'var(--font-display)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--surface)',
            color: 'var(--ink)',
            width: '200px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: '0',
          padding: '12px 16px',
          background: '#FAFAFA',
          borderBottom: '1px solid var(--border)',
        }}>
          {COLS.map(c => (
            <button
              key={c.key}
              onClick={() => handleSort(c.key)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                textAlign: c.align,
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: 600,
                color: sortKey === c.key ? 'var(--ink)' : 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-display)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                gap: '4px',
              }}
            >
              {c.label}
              {sortKey === c.key && (
                <span style={{ fontSize: '8px' }}>
                  {sortDir === 'asc' ? '▲' : '▼'}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div style={{
            padding: '32px 20px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'var(--ink-faint)',
          }}>Aucune carte trouvée</div>
        ) : (
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {sorted.map((h, i) => (
              <Row
                key={h.id}
                h={h}
                gridCols={gridCols}
                isLast={i === sorted.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ h, gridCols, isLast }: { h: EnrichedHolding; gridCols: string; isLast: boolean }) {
  const isUp = h.gain >= 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = isUp ? '+' : ''
  const hasNoBuy = h.buy_price == null || h.buy_price === 0

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: gridCols,
      gap: '0',
      padding: '11px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      alignItems: 'center',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{h.name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
        }}>{h.lang} · {h.rarity || '—'}</div>
      </div>

      <div style={{
        fontSize: '11px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{h.set_name || '—'}</div>

      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{h.qty}</div>

      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        color: hasNoBuy ? 'var(--ink-faint)' : 'var(--ink-muted)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{hasNoBuy ? '—' : formatEUR(h.cost)}</div>

      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{formatEUR(h.value)}</div>

      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
        color: hasNoBuy ? 'var(--ink-faint)' : trendColor,
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{hasNoBuy ? '—' : `${sign}${formatEUR(h.gain)}`}</div>

      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 600,
        color: hasNoBuy ? 'var(--ink-faint)' : trendColor,
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{hasNoBuy ? '—' : `${sign}${h.roiPct.toFixed(1)}%`}</div>
    </div>
  )
}

function getSortValue(h: EnrichedHolding, key: SortKey): string | number {
  switch (key) {
    case 'name':  return h.name
    case 'set':   return h.set_name || ''
    case 'qty':   return h.qty
    case 'cost':  return h.cost
    case 'value': return h.value
    case 'gain':  return h.gain
    case 'roi':   return h.roiPct
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px', flex: 1,
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
