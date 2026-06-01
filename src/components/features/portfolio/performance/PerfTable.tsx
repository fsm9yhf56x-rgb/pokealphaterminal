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
            padding: '8px 14px',
            fontSize: 12.5,
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            color: '#1D1D1F',
            width: 220,
            outline: 'none',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
            transition: 'all .2s',
          }}
          onFocus={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.75)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)' }}
          onBlur={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.55)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)' }}
        />
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        {/* Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: gridCols,
          gap: 0,
          padding: '14px 18px',
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(10px) saturate(180%)',
          WebkitBackdropFilter: 'blur(10px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
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
                fontSize: 10.5,
                fontWeight: 700,
                color: sortKey === c.key ? '#1D1D1F' : '#86868B',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: c.align === 'right' ? 'flex-end' : 'flex-start',
                gap: 4,
                transition: 'color .15s',
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
            padding: '40px 20px',
            textAlign: 'center',
            fontSize: 12.5,
            color: '#AEAEB2',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
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
      gap: 0,
      padding: '12px 18px',
      borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)',
      alignItems: 'center',
      transition: 'background .15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1D1D1F',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 2,
        }}>{h.name}</div>
        <div style={{
          fontSize: 10.5,
          color: '#86868B',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>{h.lang} · {h.rarity || '—'}</div>
      </div>

      <div style={{
        fontSize: 11.5,
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{h.set_name || '—'}</div>

      <div style={{
        textAlign: 'right',
        fontSize: 12.5,
        color: '#86868B',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{h.qty}</div>

      <div style={{
        textAlign: 'right',
        fontSize: 12.5,
        color: hasNoBuy ? '#C7C7CC' : '#86868B',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{hasNoBuy ? '—' : formatEUR(h.cost)}</div>

      <div style={{
        textAlign: 'right',
        fontSize: 12.5,
        fontWeight: 600,
        color: '#1D1D1F',
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{formatEUR(h.value)}</div>

      <div style={{
        textAlign: 'right',
        fontSize: 12.5,
        fontWeight: 700,
        color: hasNoBuy ? '#C7C7CC' : trendColor,
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
      }}>{hasNoBuy ? '—' : `${sign}${formatEUR(h.gain)}`}</div>

      <div style={{
        textAlign: 'right',
        fontSize: 12.5,
        fontWeight: 700,
        color: hasNoBuy ? '#C7C7CC' : trendColor,
        fontFamily: 'var(--font-data, "Space Mono", monospace)',
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
      display: 'flex', alignItems: 'center', gap: 8, flex: 1,
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
