'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { usePortfolio } from '@/lib/usePortfolio'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'
import { usePersona } from '@/lib/usePersona'

/**
 * 3 KPIs v1.0 collectionneur Snow+ : Master Set + Valeur portfolio + Cartes.
 * Props existantes prises pour compat DailyHub mais logique interne re-orientee v1.
 */
export function HubKpis({
  topSpread, topIndex, cardsCount, loading,
}: {
  topSpread: any | null   // ignore - v2
  topIndex: any | null    // ignore - v2
  cardsCount: number
  loading: boolean
}) {
  const portfolio = usePortfolio()
  const { labels, isCollector } = usePersona()
  // Type local pour acceder aux champs optionnels (set_slug/set_name/graded)
  const cards: Array<{
    qty?: number
    current_price?: number | null
    buy_price?: number | null
    graded?: boolean | null
    set_slug?: string | null
    set_name?: string | null
  }> = (portfolio.cards || []) as any

  const kpis = useMemo(() => {
    // Calcul master-set le plus avance (heuristic: nb cartes par set)
    const setStats = new Map<string, { name: string; count: number; value: number }>()
    let totalValue = 0
    let totalCost = 0
    let gradedCount = 0

    for (const c of cards) {
      const qty = c.qty || 1
      const cur = c.current_price ?? 0
      const buy = c.buy_price ?? 0
      totalValue += cur * qty
      totalCost += buy * qty
      if (c.graded) gradedCount += qty
      const setKey = c.set_slug || c.set_name || 'unknown'
      const setName = c.set_name || 'Set inconnu'
      const ex = setStats.get(setKey)
      if (ex) { ex.count += qty; ex.value += cur * qty }
      else setStats.set(setKey, { name: setName, count: qty, value: cur * qty })
    }
    const roiPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null

    // Top set par count
    let topSet: { name: string; count: number; value: number } | null = null
    for (const s of setStats.values()) {
      if (!topSet || s.count > topSet.count) topSet = s
    }

    return { totalValue, totalCost, roiPct, gradedCount, setsCount: setStats.size, topSet }
  }, [cards])

  const router = useRouter()

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: 14,
    }}>
      {/* KPI 1 : Master Set en cours */}
      <KpiCard
        icon={<TrophyIcon />}
        accent="gold"
        label="Master set en cours"
        value={loading ? '—' : kpis.topSet ? `${kpis.topSet.count} cartes` : 'Aucun'}
        sub={loading ? 'Chargement…'
          : kpis.topSet ? truncate(kpis.topSet.name, 30)
          : 'Crée ton premier set'}
        onClick={() => router.push('/portfolio?tab=mastersets')}
        clickable={!!kpis.topSet || !loading}
        loading={loading}
      />

      {/* KPI 2 : Valeur portfolio */}
      <KpiCard
        icon={<EuroIcon />}
        accent={kpis.roiPct === null ? 'neutral' : kpis.roiPct >= 0 ? 'green' : 'red'}
        label={labels.portfolioValue}
        dim={isCollector}
        value={loading ? '—'
          : kpis.totalValue > 0 ? formatValue(kpis.totalValue) + ' €'
          : '—'}
        sub={loading ? 'Chargement…'
          : isCollector
            ? (kpis.totalValue > 0 ? labels.portfolioSub : 'Ajoute des cartes à ta collection')
          : kpis.roiPct !== null
            ? <TrendBadge pct={kpis.roiPct} />
            : kpis.totalValue > 0 ? 'Renseigne ton coût pour le ROI'
            : 'Ajoute des cartes avec prix'}
        onClick={() => router.push('/portfolio')}
        clickable
        loading={loading}
      />

      {/* KPI 3 : Cartes (total + graded) */}
      <KpiCard
        icon={<StackIcon />}
        accent="blue"
        label="Ma collection"
        value={loading ? '—' : cardsCount.toLocaleString('fr-FR')}
        sub={loading ? 'Chargement…'
          : cardsCount === 0 ? 'Démarrer ma collection'
          : kpis.gradedCount > 0 ? `dont ${kpis.gradedCount} gradée${kpis.gradedCount > 1 ? 's' : ''}`
          : kpis.setsCount > 1 ? `${kpis.setsCount} séries différentes`
          : 'Carte dans le portfolio'}
        onClick={() => router.push('/portfolio')}
        clickable
        loading={loading}
      />
    </div>
  )
}

/* ── KPI Card glass v5 ─────────────────────────────────────────────── */

function KpiCard({
  icon, accent, label, value, sub, onClick, clickable, loading, dim,
}: {
  icon: React.ReactNode
  accent: 'green' | 'red' | 'gold' | 'blue' | 'neutral'
  label: string
  value: string
  dim?: boolean
  sub: React.ReactNode
  onClick: () => void
  clickable: boolean
  loading: boolean
}) {
  const a = ACCENT[accent]

  return (
    <button
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={{
        ...GLASS.card,
        padding: '16px 20px',
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: FONT.body,
        transition: 'transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s cubic-bezier(.2,.8,.2,1)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.85)',
      }}
      onMouseEnter={(e) => {
        if (!clickable) return
        e.currentTarget.style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={(e) => {
        if (!clickable) return
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Loading shimmer */}
      {loading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
          animation: 'kcShimmer 1.4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Glow subtle accent dans le coin */}
      <div style={{
        position: 'absolute',
        top: '-30%',
        right: '-10%',
        width: 140,
        height: 140,
        background: `radial-gradient(circle, ${a.glow} 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Header : icon + label + arrow */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 28, height: 28,
            borderRadius: RADIUS.sm,
            background: a.iconBg,
            border: `1px solid ${a.iconBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: a.iconColor,
          }}>
            {icon}
          </div>
          <span style={{
            fontSize: 10,
            color: SNOW.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            fontFamily: FONT.display,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {label}
          </span>
        </div>

        {clickable && (
          <span style={{
            fontSize: 12,
            color: SNOW.mutedLight,
          }}>→</span>
        )}
      </div>

      {/* Big value */}
      <div style={{
        fontSize: dim ? 17 : 26,
        fontWeight: 700,
        color: loading ? SNOW.mutedExtraLight : dim ? SNOW.muted : a.valueColor,
        fontFamily: FONT.display,
        letterSpacing: '-0.5px',
        lineHeight: 1.1,
        marginBottom: 5,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        position: 'relative',
        zIndex: 1,
      }}>
        {value}
      </div>

      {/* Sub-line */}
      <div style={{
        fontSize: 11,
        color: SNOW.muted,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        position: 'relative',
        zIndex: 1,
      }}>
        {sub}
      </div>
    </button>
  )
}

/* ── Trend badge ─────────────────────────────────────────────────── */

function TrendBadge({ pct }: { pct: number }) {
  const isUp = pct >= 0
  const color = isUp ? SNOW.green : SNOW.red
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      color,
      fontWeight: 600,
      fontFamily: FONT.data,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

/* ── Icons ─────────────────────────────────────────────────────── */

function TrophyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
    </svg>
  )
}

function EuroIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M4 14h9"/>
      <path d="M19 5a7 7 0 1 0 0 14"/>
    </svg>
  )
}

function StackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  )
}

/* ── Helpers ─────────────────────────────────────────────────── */

function formatValue(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`
  return v.toFixed(0)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

/* ── Accent palettes ───────────────────────────────────────── */

const ACCENT: Record<'green' | 'red' | 'gold' | 'blue' | 'neutral', {
  iconBg: string; iconBorder: string; iconColor: string;
  valueColor: string; glow: string;
}> = {
  green: {
    iconBg: SNOW.greenLight,
    iconBorder: 'rgba(38,166,91,0.2)',
    iconColor: SNOW.green,
    valueColor: SNOW.ink,
    glow: 'rgba(38,166,91,0.10)',
  },
  red: {
    iconBg: SNOW.redLight,
    iconBorder: 'rgba(224,48,32,0.2)',
    iconColor: SNOW.red,
    valueColor: SNOW.ink,
    glow: 'rgba(224,48,32,0.08)',
  },
  gold: {
    iconBg: SNOW.amber,
    iconBorder: 'rgba(212,175,55,0.25)',
    iconColor: SNOW.amberDark,
    valueColor: SNOW.ink,
    glow: 'rgba(212,175,55,0.10)',
  },
  blue: {
    iconBg: SNOW.blue,
    iconBorder: 'rgba(24,95,165,0.2)',
    iconColor: SNOW.blueDark,
    valueColor: SNOW.ink,
    glow: 'rgba(24,95,165,0.08)',
  },
  neutral: {
    iconBg: SNOW.surface,
    iconBorder: SNOW.border,
    iconColor: SNOW.muted,
    valueColor: SNOW.ink,
    glow: 'rgba(110,110,115,0.06)',
  },
}
