'use client'

import type { ExplorerResult, SortField, SortDir } from '@/lib/useExplorerSearch'

/**
 * Table dense : 1 row par carte avec toutes les sources de prix.
 * Vue "Bloomberg" pour collectors/traders pros.
 */
export function ExplorerTable({
  results, onSelect, sortField, sortDir, onSortChange,
}: {
  results: ExplorerResult[]
  onSelect: (cardRef: string) => void
  sortField: SortField
  sortDir: SortDir
  onSortChange: (field: SortField, dir: SortDir) => void
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header (sortable) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: COLS,
        gap: '12px',
        padding: '10px 16px',
        background: '#FAFAFA',
        borderBottom: '1px solid var(--border)',
        fontSize: '9px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>
        <SortHeader label="Carte" field="card_name" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="left" />
        <SortHeader label="Set" field={null} align="left" />
        <SortHeader label="Top prix" field="top_price" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="Tendance" field="cardmarket_trend" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="eBay avg" field={null} align="right" />
        <SortHeader label="TCGP avg" field={null} align="right" />
        <SortHeader label="PSA10" field={null} align="right" />
        <SortHeader label="Ventes" field="ebay_sales" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
      </div>

      {/* Rows */}
      {results.map((card, i) => (
        <Row
          key={card.card_ref}
          card={card}
          isLast={i === results.length - 1}
          onClick={() => onSelect(card.card_ref)}
        />
      ))}
    </div>
  )
}

const COLS = '2.4fr 1.4fr 0.9fr 0.9fr 0.9fr 0.9fr 0.9fr 0.7fr'

function Row({
  card, isLast, onClick,
}: {
  card: ExplorerResult
  isLast: boolean
  onClick: () => void
}) {
  const isUp = card.cardmarket_trend != null && card.cardmarket_trend > 0
  const trendColor = card.cardmarket_trend == null
    ? 'var(--ink-faint)'
    : isUp ? 'var(--perf-up)' : 'var(--perf-down)'

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: COLS,
        gap: '12px',
        width: '100%',
        padding: '11px 16px',
        border: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        alignItems: 'center',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Carte (name + variant + tier) */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}>
          {card.tier && (
            <span style={{
              padding: '1px 5px',
              fontSize: '9px',
              fontWeight: 700,
              borderRadius: '3px',
              background: card.tier === 'S' ? '#FFF8E1' : card.tier === 'A' ? 'var(--perf-up-soft)' : 'var(--border)',
              color:      card.tier === 'S' ? '#B8860B' : card.tier === 'A' ? 'var(--perf-up)'      : 'var(--ink-muted)',
              fontFamily: 'var(--font-data, var(--font-display))',
              flexShrink: 0,
            }}>{card.tier}</span>
          )}
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{card.card_name}</span>
        </div>
        {(card.variant || card.has_graded) && (
          <div style={{
            fontSize: '9px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex',
            gap: '6px',
          }}>
            {card.variant && card.variant !== 'raw' && <span>{card.variant}</span>}
            {card.has_graded && <span style={{ color: 'var(--premium)' }}>● GRADED</span>}
          </div>
        )}
      </div>

      {/* Set */}
      <div style={{
        fontSize: '11px',
        color: 'var(--ink-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {card.set_name || card.set_slug || '—'}
      </div>

      {/* Top prix */}
      <div style={tdRight()}>
        <div style={{
          fontWeight: 600,
          color: 'var(--ink)',
          fontSize: '12px',
        }}>{formatEUR(card.top_price)}</div>
      </div>

      {/* Tendance */}
      <div style={tdRight()}>
        {card.cardmarket_trend != null && card.cardmarket_trend !== 0 ? (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            color: trendColor,
            fontWeight: 600,
            fontSize: '11px',
          }}>
            {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{card.cardmarket_trend.toFixed(1)}%
          </span>
        ) : (
          <span style={{ color: 'var(--ink-faint)' }}>—</span>
        )}
      </div>

      {/* eBay avg */}
      <div style={tdRight()}>
        {card.ebay_avg != null ? formatEURNum(card.ebay_avg) : '—'}
      </div>

      {/* TCGP avg */}
      <div style={tdRight()}>
        {card.tcg_avg != null ? formatEURNum(card.tcg_avg) : '—'}
      </div>

      {/* PSA 10 */}
      <div style={tdRight()}>
        {card.psa10_avg != null ? (
          <span style={{ color: 'var(--premium-dark, #B8860B)', fontWeight: 500 }}>
            {formatEURNum(card.psa10_avg)}
          </span>
        ) : '—'}
      </div>

      {/* Ventes */}
      <div style={tdRight()}>
        {card.ebay_sales != null && card.ebay_sales > 0 ? (
          <span style={{ color: 'var(--ink-muted)' }}>
            {card.ebay_sales.toLocaleString('fr-FR')}
          </span>
        ) : '—'}
      </div>
    </button>
  )
}

/* ── Sort header ─────────────────────────── */

function SortHeader({
  label, field, align,
  sortField, sortDir, onChange,
}: {
  label: string
  field: SortField | null
  align: 'left' | 'right'
  sortField?: SortField
  sortDir?: SortDir
  onChange?: (field: SortField, dir: SortDir) => void
}) {
  const isSortable = field !== null && !!onChange
  const isActive = isSortable && field === sortField

  if (!isSortable) {
    return (
      <div style={{ textAlign: align }}>{label}</div>
    )
  }

  const handleClick = () => {
    if (!onChange || !field) return
    if (sortField === field) {
      onChange(field, sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      onChange(field, 'desc')
    }
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: 0,
        background: 'transparent',
        border: 'none',
        color: isActive ? 'var(--ink)' : 'var(--ink-muted)',
        fontSize: '9px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        textAlign: align,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        width: '100%',
      }}
    >
      <span>{label}</span>
      {isActive && (
        <span style={{ fontSize: '8px' }}>
          {sortDir === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </button>
  )
}

/* ── Helpers ─────────────────────────────── */

function tdRight(): React.CSSProperties {
  return {
    textAlign: 'right',
    fontSize: '11px',
    color: 'var(--ink-muted)',
    fontFamily: 'var(--font-data, var(--font-display))',
    fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}

function formatEURNum(v: number): string {
  if (v >= 1000) return `${Number(v / 1000).toFixed(1)}K`
  return v.toFixed(0)
}
