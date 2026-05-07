'use client'

import { useState, useMemo } from 'react'
import { usePortfolio } from '@/lib/usePortfolio'
import { useGoals, type GoalMetric, type GoalTarget, type WishlistItem } from '@/lib/useGoals'
import { ObjFinancialTargets } from './ObjFinancialTargets'
import { ObjSetCompletion } from './ObjSetCompletion'
import { ObjWishlist } from './ObjWishlist'
import { ObjAddModal } from './ObjAddModal'

/**
 * Aggregates Objectifs : combine portfolio actuel + targets + wishlist.
 * Calcule la progression de chaque target/set/wishlist en temps réel.
 */
export interface ObjAggregates {
  /* Portfolio metrics (computed live from holdings) */
  portfolioValue: number
  cardsCount: number
  totalROI: number
  gradedCount: number

  /* Set completion (auto from holdings) */
  setProgress: SetCompletionData[]

  /* Targets enriched with progress */
  enrichedTargets: EnrichedTarget[]

  /* Wishlist enriched with current price + alert flag */
  enrichedWishlist: EnrichedWish[]

  /* Summary */
  totalTargets: number
  achievedTargets: number
  avgTargetProgress: number
  wishlistAlerts: number   // nb items where current price <= target_price
}

export interface SetCompletionData {
  setId: string
  setName: string
  owned: number
  total: number  // unknown for now (placeholder, à enrichir avec tcg_cards static)
  pct: number
  totalValue: number
  topCard?: string  // most expensive card name in this set
}

export interface EnrichedTarget extends GoalTarget {
  current: number
  pct: number
  remaining: number
  achieved: boolean
}

export interface EnrichedWish extends WishlistItem {
  // current_price will be enriched later via prices_v2 join
  // for now just placeholder
  alertActive: boolean
}

export function Objectifs() {
  const { cards, loading: pfLoading } = usePortfolio()
  const goals = useGoals()
  const [modalOpen, setModalOpen] = useState<null | 'target' | 'wish'>(null)

  const agg = useMemo<ObjAggregates>(() => {
    return computeAggregates(cards || [], goals.targets, goals.wishlist)
  }, [cards, goals.targets, goals.wishlist])

  if (pfLoading || goals.loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
        Chargement…
      </div>
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Header
        isCloud={goals.isCloud}
        onAddTarget={() => setModalOpen('target')}
        onAddWish={() => setModalOpen('wish')}
      />

      <SummaryKPIs agg={agg} />

      <ObjFinancialTargets
        agg={agg}
        onAddTarget={() => setModalOpen('target')}
        onDelete={goals.deleteTarget}
      />

      <ObjSetCompletion agg={agg} />

      <ObjWishlist
        agg={agg}
        onAdd={() => setModalOpen('wish')}
        onDelete={goals.deleteWishItem}
        onAcquire={goals.markAcquired}
      />

      {modalOpen && (
        <ObjAddModal
          mode={modalOpen}
          onClose={() => setModalOpen(null)}
          onAddTarget={goals.addTarget}
          onAddWish={goals.addWishItem}
        />
      )}
    </div>
  )
}

/* ── Computation ───────────────────────────── */

function computeAggregates(
  cards: any[],
  targets: GoalTarget[],
  wishlist: WishlistItem[]
): ObjAggregates {
  /* Portfolio metrics */
  let portfolioValue = 0
  let totalCost = 0
  let gradedCount = 0
  for (const c of cards) {
    const qty = c.qty || 1
    const cur = c.current_price ?? 0
    const buy = c.buy_price ?? 0
    portfolioValue += cur * qty
    totalCost += buy * qty
    if (c.graded) gradedCount += qty
  }
  const totalROI = totalCost > 0 ? ((portfolioValue - totalCost) / totalCost) * 100 : 0

  /* Set completion */
  type SetMapEntry = { name: string; owned: number; value: number; topCard?: string; topPrice: number }
  const setMap = new Map<string, SetMapEntry>()
  for (const c of cards) {
    if (!c.set_id) continue
    const cur = c.current_price ?? 0
    const qty = c.qty || 1
    const entry: SetMapEntry = setMap.get(c.set_id) || { name: c.set_name || c.set_id, owned: 0, value: 0, topPrice: 0 }
    entry.owned += qty
    entry.value += cur * qty
    if (cur > entry.topPrice) {
      entry.topPrice = cur
      entry.topCard = c.name
    }
    setMap.set(c.set_id, entry)
  }
  const setProgress: SetCompletionData[] = [...setMap.entries()]
    .map(([setId, { name, owned, value, topCard }]) => ({
      setId,
      setName: name,
      owned,
      total: 0,  // À enrichir avec /public/data/sets-{LANG}.json (total field)
      pct: 0,    // computed once total is known
      totalValue: value,
      topCard,
    }))
    .sort((a, b) => b.totalValue - a.totalValue)

  /* Targets enriched */
  const enrichedTargets: EnrichedTarget[] = targets.map(t => {
    const current = getCurrentValueForMetric(t.metric, {
      portfolioValue, cardsCount: cards.length, totalROI, gradedCount,
    })
    const pct = t.target_value > 0 ? Math.min((current / t.target_value) * 100, 100) : 0
    return {
      ...t,
      current,
      pct,
      remaining: Math.max(0, t.target_value - current),
      achieved: current >= t.target_value,
    }
  })

  const totalTargets       = targets.length
  const achievedTargets    = enrichedTargets.filter(t => t.achieved).length
  const avgTargetProgress  = totalTargets > 0
    ? enrichedTargets.reduce((s, t) => s + t.pct, 0) / totalTargets
    : 0

  /* Wishlist enriched (alerts later when prices are joined) */
  const enrichedWishlist: EnrichedWish[] = wishlist
    .filter(w => !w.acquired)
    .map(w => ({ ...w, alertActive: false }))

  const wishlistAlerts = enrichedWishlist.filter(w => w.alertActive).length

  return {
    portfolioValue, cardsCount: cards.length, totalROI, gradedCount,
    setProgress, enrichedTargets, enrichedWishlist,
    totalTargets, achievedTargets, avgTargetProgress,
    wishlistAlerts,
  }
}

function getCurrentValueForMetric(
  metric: GoalMetric,
  ctx: { portfolioValue: number; cardsCount: number; totalROI: number; gradedCount: number }
): number {
  switch (metric) {
    case 'portfolio_value': return ctx.portfolioValue
    case 'cards_count':     return ctx.cardsCount
    case 'roi_pct':         return ctx.totalROI
    case 'graded_count':    return ctx.gradedCount
  }
}

/* ── UI helpers ─────────────────────────────── */

function Header({
  isCloud, onAddTarget, onAddWish,
}: {
  isCloud: boolean
  onAddTarget: () => void
  onAddWish: () => void
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '12px',
      flexWrap: 'wrap',
    }}>
      <div>
        <p style={{
          fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase',
          letterSpacing: '0.1em', margin: '0 0 4px',
          fontFamily: 'var(--font-display)',
        }}>Portfolio</p>
        <h1 style={{
          fontSize: '26px', fontWeight: 600, color: 'var(--ink)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.5px', margin: 0,
        }}>Objectifs</h1>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
          marginTop: '4px',
        }}>
          {isCloud ? '☁ Synchronisé sur le cloud' : '⊙ Stocké localement'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <ActionButton onClick={onAddWish} variant="secondary">+ Wishlist</ActionButton>
        <ActionButton onClick={onAddTarget} variant="primary">+ Objectif</ActionButton>
      </div>
    </div>
  )
}

function ActionButton({
  onClick, variant, children,
}: {
  onClick: () => void
  variant: 'primary' | 'secondary'
  children: React.ReactNode
}) {
  const isPrimary = variant === 'primary'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '9px 16px',
        background: isPrimary ? 'var(--ink)' : 'var(--surface)',
        color: isPrimary ? 'var(--surface)' : 'var(--ink)',
        border: isPrimary ? 'none' : '1px solid var(--border-strong)',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'var(--font-display)',
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        if (isPrimary) e.currentTarget.style.background = '#333'
        else           e.currentTarget.style.background = '#FAFAFA'
      }}
      onMouseLeave={e => {
        if (isPrimary) e.currentTarget.style.background = 'var(--ink)'
        else           e.currentTarget.style.background = 'var(--surface)'
      }}
    >
      {children}
    </button>
  )
}

function SummaryKPIs({ agg }: { agg: ObjAggregates }) {
  const kpis = [
    {
      label: 'Objectifs actifs',
      value: agg.totalTargets.toString(),
      sub: agg.achievedTargets > 0 ? `${agg.achievedTargets} atteint${agg.achievedTargets > 1 ? 's' : ''}` : 'En cours',
      color: 'var(--ink)',
    },
    {
      label: 'Progression moyenne',
      value: agg.totalTargets > 0 ? `${agg.avgTargetProgress.toFixed(0)}%` : '—',
      sub: agg.totalTargets > 0 ? 'Tous objectifs confondus' : 'Pas encore d\'objectif',
      color: agg.avgTargetProgress >= 50 ? 'var(--perf-up)' : 'var(--ink)',
    },
    {
      label: 'Sets en cours',
      value: agg.setProgress.length.toString(),
      sub: 'Sets dans votre portfolio',
      color: 'var(--ink)',
    },
    {
      label: 'Wishlist',
      value: agg.enrichedWishlist.length.toString(),
      sub: agg.wishlistAlerts > 0 ? `${agg.wishlistAlerts} prix atteint${agg.wishlistAlerts > 1 ? 's' : ''} ▲` : 'Cartes à acquérir',
      color: agg.wishlistAlerts > 0 ? 'var(--perf-up)' : 'var(--ink)',
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '12px',
    }}>
      {kpis.map((k, i) => (
        <div
          key={i}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{
            fontSize: '9px',
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            fontFamily: 'var(--font-display)',
            marginBottom: '6px',
          }}>{k.label}</div>
          <div style={{
            fontSize: '22px',
            fontWeight: 600,
            color: k.color,
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-0.4px',
            lineHeight: 1.1,
            marginBottom: '4px',
          }}>{k.value}</div>
          <div style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
          }}>{k.sub}</div>
        </div>
      ))}
    </div>
  )
}
