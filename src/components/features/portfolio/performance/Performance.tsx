'use client'

import { useMemo } from 'react'
import { usePortfolio } from '@/lib/usePortfolio'
import { usePlan } from '@/lib/usePlan'
import { GateOverlay } from '@/components/upgrade/GateOverlay'
import { PerfKPIs } from './PerfKPIs'
import { PerfChart } from './PerfChart'
import { PerfMovers } from './PerfMovers'
import { PerfAllocation } from './PerfAllocation'
import { PerfTable } from './PerfTable'

/**
 * Type des aggrégats calculés à partir des holdings.
 * Réutilisé par tous les sous-composants.
 */
export interface PerfAggregates {
  totalValue: number
  totalCost: number
  totalGain: number
  totalROI: number
  cardsCount: number
  // Top movers
  topGainers: EnrichedHolding[]
  topLosers: EnrichedHolding[]
  // Best performer (highest absolute gain)
  bestPerformer: EnrichedHolding | null
  // All holdings enriched (with gain/roi computed)
  enrichedHoldings: EnrichedHolding[]
  // Allocation breakdowns
  byLang: AllocationBucket[]
  bySet: AllocationBucket[]
  byRarity: AllocationBucket[]
}

export interface EnrichedHolding {
  id: string
  name: string
  set_name: string | null
  set_id: string | null
  lang: string
  rarity: string | null
  qty: number
  buy_price: number | null
  current_price: number | null
  image_url: string | null
  // Computed
  value: number       // current_price * qty
  cost: number        // buy_price * qty
  gain: number        // value - cost
  roiPct: number      // gain / cost * 100
}

export interface AllocationBucket {
  label: string
  value: number
  pct: number
  count: number
}

export function Performance() {
  const { cards, loading } = usePortfolio()
  const { isPro } = usePlan()

  const agg = useMemo<PerfAggregates>(() => {
    const enriched: EnrichedHolding[] = (cards || []).map(c => {
      const qty = c.qty || 1
      const buy = c.buy_price ?? 0
      const cur = c.current_price ?? 0
      const value = cur * qty
      const cost = buy * qty
      const gain = value - cost
      const roiPct = cost > 0 ? (gain / cost) * 100 : 0
      return {
        id: c.id,
        name: c.name,
        set_name: c.set_name,
        set_id: c.set_id,
        lang: c.lang || 'FR',
        rarity: c.rarity,
        qty,
        buy_price: c.buy_price,
        current_price: c.current_price,
        image_url: c.image_url,
        value, cost, gain, roiPct,
      }
    })

    const totalValue = enriched.reduce((s, h) => s + h.value, 0)
    const totalCost  = enriched.reduce((s, h) => s + h.cost, 0)
    const totalGain  = totalValue - totalCost
    const totalROI   = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

    // Top movers (only holdings with cost > 0)
    const sortedByROI = [...enriched]
      .filter(h => h.cost > 0)
      .sort((a, b) => b.roiPct - a.roiPct)
    const topGainers = sortedByROI.slice(0, 5)
    const topLosers  = sortedByROI.slice(-5).reverse()

    const bestPerformer = sortedByROI[0] || null

    // Allocation breakdowns
    const byLang   = aggregateBy(enriched, h => h.lang || 'N/A', totalValue)
    const bySet    = aggregateBy(enriched, h => h.set_name || 'Sans set', totalValue, 8)
    const byRarity = aggregateBy(enriched, h => h.rarity || 'N/A', totalValue, 8)

    return {
      totalValue, totalCost, totalGain, totalROI,
      cardsCount: enriched.length,
      topGainers, topLosers, bestPerformer,
      enrichedHoldings: enriched,
      byLang, bySet, byRarity,
    }
  }, [cards])

  if (loading) {
    return (
      <div style={{
        padding: '40px 20px', textAlign: 'center', color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)', fontSize: 13,
      }}>
        Chargement…
      </div>
    )
  }

  if (agg.cardsCount === 0) {
    return <EmptyState />
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Header />
      {/* Libres (hook) : valeur actuelle, gain, ROI, top performer */}
      <PerfKPIs agg={agg} />
      {/* Courbe : 7J/1M libres, historique long -> modale Pro (géré dans PerfChart) */}
      <PerfChart agg={agg} />
      {/* Highlight libre : meilleurs / pires mouvements */}
      <PerfMovers agg={agg} />
      {/* Libre (décision actée) : répartition du portefeuille */}
      <PerfAllocation agg={agg} />
      {/* Profondeur Pro : détail carte par carte -> teaser partiel */}
      <GateOverlay
        locked={!isPro}
        tier="pro"
        title="Le détail carte par carte"
        desc={`Coût, valeur, gain et ROI pour chacune de tes ${agg.cardsCount} cartes.`}
        feature={{
          title: 'Le détail de toute ta collection',
          subtitle: 'Coût, valeur, gain et ROI pour chacune de tes cartes — et ton historique complet.',
        }}
      >
        <PerfTable agg={agg} />
      </GateOverlay>
    </div>
  )
}

/* ── Helpers ───────────────────────────────────── */

function aggregateBy(
  holdings: EnrichedHolding[],
  keyFn: (h: EnrichedHolding) => string,
  totalValue: number,
  maxBuckets = 0
): AllocationBucket[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const h of holdings) {
    const k = keyFn(h)
    const cur = map.get(k) || { value: 0, count: 0 }
    cur.value += h.value
    cur.count += h.qty
    map.set(k, cur)
  }
  const buckets: AllocationBucket[] = [...map.entries()]
    .map(([label, { value, count }]) => ({
      label,
      value,
      count,
      pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)

  if (maxBuckets > 0 && buckets.length > maxBuckets) {
    const top = buckets.slice(0, maxBuckets - 1)
    const rest = buckets.slice(maxBuckets - 1)
    const restValue = rest.reduce((s, b) => s + b.value, 0)
    const restCount = rest.reduce((s, b) => s + b.count, 0)
    return [
      ...top,
      {
        label: `Autres (${rest.length})`,
        value: restValue,
        count: restCount,
        pct: totalValue > 0 ? (restValue / totalValue) * 100 : 0,
      },
    ]
  }
  return buckets
}

function Header() {
  return (
    <div>
      <p style={{
        fontSize: 10, color: '#86868B', textTransform: 'uppercase',
        letterSpacing: '0.1em', margin: '0 0 4px',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>Portfolio</p>
      <h1 style={{
        fontSize: 28, fontWeight: 600, color: '#1D1D1F',
        fontFamily: 'var(--font-sora, Sora, sans-serif)', letterSpacing: '-0.5px', margin: 0,
      }}>Performance</h1>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      background: 'rgba(255,255,255,0.65)',
      backdropFilter: 'blur(14px) saturate(180%)',
      WebkitBackdropFilter: 'blur(14px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
    }}>
      <div style={{ fontSize: 48, opacity: 0.2, marginBottom: 16 }}>📊</div>
      <div style={{
        fontSize: 15, color: '#1D1D1F', fontWeight: 600, marginBottom: 6,
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>
        Aucune carte dans votre portfolio
      </div>
      <div style={{
        fontSize: 12, color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>
        Ajoutez des cartes depuis Holdings pour voir vos performances ici.
      </div>
    </div>
  )
}
