'use client'

import type { ExplorerResult, SortField, SortDir } from '@/lib/useExplorerSearch'

/**
 * Table dense facon terminal : 1 row/carte, colonnes reelles et triables.
 * Prix (source NM) · Ventes · Plus-value PSA 10 · Spread US/EU · Liquidite.
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
        <SortHeader label="Prix" field="top_price" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="Ventes" field="ebay_sales" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="+Value PSA 10" field="grade_ev" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="Spread US/EU" field="spread_pct" sortField={sortField} sortDir={sortDir} onChange={onSortChange} align="right" />
        <SortHeader label="Liquidité" field={null} align="right" />
      </div>

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

const COLS = '2.2fr 1.3fr 1fr 0.7fr 1.1fr 0.95fr 0.85fr'

const SRC_LABEL: Record<string, string> = { ebay: 'eBay', tcgplayer: 'TCGplayer', cardmarket: 'Cardmarket' }
const METHOD_LABEL: Record<string, string> = { cardmarket_trend: 'Cardmarket', ebay_sold: 'eBay', tcgplayer: 'TCGplayer' }
const COND_SHORT: Record<string, string> = { NEAR_MINT: 'NM', LIGHTLY_PLAYED: 'LP', MODERATELY_PLAYED: 'MP', HEAVILY_PLAYED: 'HP', DAMAGED: 'DMG', MINT: 'MINT' }

function priceSub(card: ExplorerResult): string {
  if (card.top_sales != null && card.top_source) {
    const src = SRC_LABEL[card.top_source] || card.top_source
    const cond = card.top_condition ? COND_SHORT[card.top_condition] || '' : ''
    return cond ? `${src} · ${cond}` : src
  }
  if (card.fv_method) return METHOD_LABEL[card.fv_method] || 'Estimation'
  return ''
}

function Row({
  card, isLast, onClick,
}: {
  card: ExplorerResult
  isLast: boolean
  onClick: () => void
}) {
  const sub = priceSub(card)
  const ev = card.grade_ev
  const evPositive = ev != null && ev >= 0
  const spread = card.spread_pct
  const liq = card.liquidity

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
      {/* Carte */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px',
        }}>
          {card.tier && (
            <span style={{
              padding: '1px 5px', fontSize: '9px', fontWeight: 700, borderRadius: '3px',
              background: card.tier === 'S' ? '#FFF8E1' : card.tier === 'A' ? 'var(--perf-up-soft)' : 'var(--border)',
              color: card.tier === 'S' ? '#B8860B' : card.tier === 'A' ? 'var(--perf-up)' : 'var(--ink-muted)',
              fontFamily: 'var(--font-data, var(--font-display))', flexShrink: 0,
            }}>{card.tier}</span>
          )}
          <span style={{
            fontSize: '12px', fontWeight: 500, color: 'var(--ink)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{card.card_name}</span>
        </div>
        {card.variant && card.variant !== 'raw' ? (
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{card.variant}</div>
        ) : null}
      </div>

      {/* Set */}
      <div style={{
        fontSize: '11px', color: 'var(--ink-muted)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {card.set_name || card.set_slug || '—'}
      </div>

      {/* Prix + source */}
      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', fontSize: '12px', fontFamily: 'var(--font-data, var(--font-display))', fontVariantNumeric: 'tabular-nums' }}>
          {formatEUR(card.top_price)}
        </div>
        {sub ? (
          <div style={{ fontSize: '9px', color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
        ) : null}
      </div>

      {/* Ventes */}
      <div style={tdRight()}>
        {card.top_sales != null && card.top_sales > 0 ? card.top_sales.toLocaleString('fr-FR') : '—'}
      </div>

      {/* Plus-value PSA 10 */}
      <div style={tdRight()}>
        {ev != null ? (
          <span style={{ color: evPositive ? '#00A368' : 'var(--perf-down, #C0392B)', fontWeight: 600 }}>
            {evPositive ? '+' : '−'}{formatEURNum(Math.abs(ev))}
          </span>
        ) : '—'}
      </div>

      {/* Spread US/EU */}
      <div style={tdRight()}>
        {spread != null ? (
          <span style={{ color: Math.abs(spread) >= 40 ? '#C77700' : 'var(--ink-muted)', fontWeight: 600 }}>
            {spread > 0 ? '+' : ''}{Math.round(spread)}%
          </span>
        ) : '—'}
      </div>

      {/* Liquidité */}
      <div style={tdRight()}>
        {liq != null ? (
          <span style={{ color: liq >= 70 ? '#00A368' : liq >= 40 ? '#C77700' : 'var(--ink-muted)', fontWeight: 600 }}>
            {liq}
          </span>
        ) : '—'}
      </div>
    </button>
  )
}

function SortHeader({
  label, field, align, sortField, sortDir, onChange,
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
    return <div style={{ textAlign: align }}>{label}</div>
  }

  const handleClick = () => {
    if (!onChange || !field) return
    if (sortField === field) onChange(field, sortDir === 'asc' ? 'desc' : 'asc')
    else onChange(field, 'desc')
  }

  return (
    <button
      onClick={handleClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px', padding: 0,
        background: 'transparent', border: 'none',
        color: isActive ? 'var(--ink)' : 'var(--ink-muted)',
        fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
        cursor: 'pointer', fontFamily: 'var(--font-display)', textAlign: align,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start', width: '100%',
      }}
    >
      <span>{label}</span>
      {isActive && (<span style={{ fontSize: '8px' }}>{sortDir === 'asc' ? '▲' : '▼'}</span>)}
    </button>
  )
}

function tdRight(): React.CSSProperties {
  return {
    textAlign: 'right', fontSize: '11px', color: 'var(--ink-muted)',
    fontFamily: 'var(--font-data, var(--font-display))', fontVariantNumeric: 'tabular-nums',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}

function formatEURNum(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
