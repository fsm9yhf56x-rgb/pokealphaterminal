'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'

interface PortfolioCard {
  id?: string | number
  name?: string
  set_name?: string | null
  qty?: number
  current_price?: number | null
  buy_price?: number | null
}

interface MoverItem {
  id: string
  name: string
  set_name: string | null
  value: number
  gain: number
  roiPct: number
}

/**
 * Top movers portfolio : top 3 gagnants + top 1 perdant.
 * Vue rapide de qui rapporte / qui sous-performe dans la collection.
 */
export function HubMovers({
  cards, loading,
}: {
  cards: PortfolioCard[]
  loading: boolean
}) {
  const router = useRouter()

  const { gainers, loser } = useMemo(() => {
    const movers: MoverItem[] = cards
      .filter(c => c.buy_price != null && c.buy_price > 0 && c.current_price != null)
      .map((c, i) => {
        const qty = c.qty || 1
        const cur = c.current_price || 0
        const buy = c.buy_price || 0
        const value = cur * qty
        const cost = buy * qty
        return {
          id: String(c.id ?? `card-${i}`),
          name: c.name || 'Carte sans nom',
          set_name: c.set_name || null,
          value,
          gain: value - cost,
          roiPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        }
      })

    const sorted = [...movers].sort((a, b) => b.roiPct - a.roiPct)
    const gainers = sorted.slice(0, 3)
    // Top 1 loser : the worst (last element if it's actually negative)
    const last = sorted[sorted.length - 1]
    const loser = last && last.roiPct < 0 ? last : null

    return { gainers, loser }
  }, [cards])

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <SectionLabel>Top mouvements</SectionLabel>
        <button
          onClick={() => router.push('/portfolio/performance')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '11px',
            color: 'var(--ink-muted)',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >Voir tout <span>→</span></button>
      </div>

      {loading ? (
        <LoadingState />
      ) : gainers.length === 0 ? (
        <EmptyState message="Ajoutez des cartes avec un prix d'achat pour voir les mouvements." />
      ) : (
        <>
          {/* Gainers */}
          <div>
            {gainers.map((m, i) => (
              <Row
                key={m.id}
                mover={m}
                rank={i + 1}
                isLast={i === gainers.length - 1 && !loser}
                variant="up"
              />
            ))}
          </div>

          {/* Loser (1) */}
          {loser && (
            <>
              <div style={{
                padding: '10px 16px 4px',
                background: '#FAFAFA',
                borderTop: '1px solid var(--border)',
              }}>
                <span style={{
                  fontSize: '9px',
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  fontWeight: 600,
                  fontFamily: 'var(--font-display)',
                }}>À surveiller</span>
              </div>
              <Row mover={loser} rank={null} isLast variant="down" />
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Row ─────────────────────────────────── */

function Row({
  mover, rank, isLast, variant,
}: {
  mover: MoverItem
  rank: number | null
  isLast: boolean
  variant: 'up' | 'down'
}) {
  const isUp = variant === 'up'
  const color = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = mover.roiPct >= 0 ? '+' : ''

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        alignItems: 'center',
        gap: '12px',
        padding: '11px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border)',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Rank */}
      <div style={{
        fontSize: '10px',
        fontWeight: 600,
        color: rank === 1 ? color : 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
        textAlign: 'center',
      }}>
        {rank ? rank.toString().padStart(2, '0') : '·'}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>{mover.name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[mover.set_name, formatEUR(mover.value)].filter(Boolean).join(' · ')}
        </div>
      </div>

      {/* ROI + gain */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color,
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {isUp ? '▲' : '▼'} {sign}{mover.roiPct.toFixed(1)}%
        </div>
        <div style={{
          fontSize: '10px',
          color,
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          marginTop: '1px',
          opacity: 0.85,
        }}>
          {sign}{formatEURcompact(mover.gain)}
        </div>
      </div>
    </div>
  )
}

/* ── States ─────────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-faint)',
      fontFamily: 'var(--font-display)',
    }}>Chargement…</div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-muted)',
      fontFamily: 'var(--font-display)',
      lineHeight: 1.5,
    }}>{message}</div>
  )
}

/* ── Atoms ──────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
      }} />
      <span style={{
        fontSize: '10px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
    </div>
  )
}

/* ── Helpers ────────────────────────────── */

function formatEUR(v: number): string {
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}

function formatEURcompact(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}€${(abs / 1000).toFixed(1)}K`
  return `${sign}€${abs.toFixed(0)}`
}
