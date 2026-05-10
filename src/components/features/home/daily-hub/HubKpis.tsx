'use client'

import { useRouter } from 'next/navigation'
import type { SpreadSignal } from '@/lib/useSpreads'
import type { MarketIndex } from '@/lib/useMarketData'

/**
 * 3 KPIs ligne : pulse rapide du marché + opportunité du jour.
 * Chaque KPI est cliquable et mène à sa section détaillée.
 */
export function HubKpis({
  topSpread, topIndex, cardsCount, loading,
}: {
  topSpread: SpreadSignal | null
  topIndex: MarketIndex | null
  cardsCount: number
  loading: boolean
}) {
  const router = useRouter()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '12px',
    }}>
      {/* KPI 1 : Top Spread du jour */}
      <KpiCard
        label="Top opportunité"
        value={loading ? '—' : topSpread ? `+${topSpread.upside_pct.toFixed(0)}%` : 'Aucune'}
        sub={loading ? 'Chargement…' : topSpread
          ? truncate(topSpread.card_name, 28)
          : 'Pas de signal détecté'}
        accent={topSpread ? 'var(--accent)' : 'var(--ink-faint)'}
        href="/market/spreads"
        clickable={!!topSpread}
        loading={loading}
        icon={<DiamondIcon />}
      />

      {/* KPI 2 : Indice marché phare */}
      <KpiCard
        label={topIndex ? topIndex.label : 'Indice marché'}
        value={loading ? '—'
          : topIndex && topIndex.current > 0
            ? formatValue(topIndex.current)
            : '—'}
        sub={loading ? 'Chargement…'
          : topIndex && topIndex.change_24h_pct !== 0
            ? <TrendBadge pct={topIndex.change_24h_pct} />
            : 'Tendance stable'}
        accent={topIndex && topIndex.change_24h_pct >= 0 ? 'var(--perf-up)' : 'var(--perf-down)'}
        href="/market"
        clickable={!!topIndex}
        loading={loading}
        icon={<ChartIcon />}
      />

      {/* KPI 3 : Activité personnelle */}
      <KpiCard
        label="Mon activité"
        value={loading ? '—' : cardsCount.toLocaleString('fr-FR')}
        sub={loading ? 'Chargement…'
          : cardsCount === 0 ? 'Démarrer ma collection'
          : cardsCount === 1 ? 'Carte dans le portfolio'
          : 'Cartes dans le portfolio'}
        accent="var(--ink)"
        href="/portfolio"
        clickable
        loading={loading}
        icon={<StackIcon />}
      />
    </div>
  )
}

/* ── KPI Card ────────────────────────────── */

function KpiCard({
  label, value, sub, accent, href, clickable, loading, icon,
}: {
  label: string
  value: string
  sub: React.ReactNode
  accent: string
  href: string
  clickable: boolean
  loading: boolean
  icon: React.ReactNode
}) {
  const router = useRouter()

  return (
    <button
      onClick={clickable ? () => router.push(href) : undefined}
      disabled={!clickable}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: 'var(--font-display)',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        if (!clickable) return
        e.currentTarget.style.borderColor = 'var(--ink)'
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!clickable) return
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Loading shimmer */}
      {loading && (
        <>
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-kpi 1.4s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
          <style>{`
            @keyframes shimmer-kpi {
              0%   { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </>
      )}

      {/* Header : icon + label + arrow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
          }}>{icon}</div>
          <span style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontWeight: 600,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{label}</span>
        </div>

        {clickable && (
          <span style={{
            fontSize: '12px',
            color: 'var(--ink-faint)',
          }}>→</span>
        )}
      </div>

      {/* Big value */}
      <div style={{
        fontSize: '24px',
        fontWeight: 600,
        color: loading ? 'var(--ink-faint)' : accent,
        fontFamily: 'var(--font-data, var(--font-display))',
        letterSpacing: '-0.4px',
        lineHeight: 1.1,
        marginBottom: '4px',
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{value}</div>

      {/* Sub-line */}
      <div style={{
        fontSize: '11px',
        color: 'var(--ink-muted)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>{sub}</div>
    </button>
  )
}

/* ── Trend badge ─────────────────────────── */

function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0
  const color = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      color,
      fontWeight: 600,
      fontFamily: 'var(--font-data, var(--font-display))',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct.toFixed(1)}% sur 24h
    </span>
  )
}

/* ── Icons ───────────────────────────────── */

function DiamondIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M5.5 1l4 4-4 5-4-5 4-4z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <path d="M1.5 9.5L4 6l2.5 2L9.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M7 4h2.5v2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function StackIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
      <rect x="2" y="3" width="7" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
      <rect x="3" y="2" width="7" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none" />
    </svg>
  )
}

/* ── Helpers ─────────────────────────────── */

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000)     return `${(v / 1_000).toFixed(2)}K`
  return v.toFixed(0)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
