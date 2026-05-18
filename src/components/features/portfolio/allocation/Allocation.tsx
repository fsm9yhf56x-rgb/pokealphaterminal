'use client'

import { useMemo } from 'react'
import { usePortfolio } from '@/lib/usePortfolio'
import { AllocConcentration } from './AllocConcentration'
import { AllocTreemap } from './AllocTreemap'
import { AllocBreakdowns } from './AllocBreakdowns'
import { AllocAlerts } from './AllocAlerts'
import { AllocTopHoldings } from './AllocTopHoldings'

/**
 * Aggregates Allocation : focus statique (où est l'argent ?)
 * Différent de Performance qui regarde l'évolution dans le temps.
 */
export interface AllocAggregates {
  totalValue: number
  cardsCount: number

  // Concentration metrics
  topCardPct: number            // % du portfolio dans la carte #1
  top5Pct: number               // % cumulé des 5 premières cartes
  hhi: number                   // Indice Herfindahl-Hirschman (0-10000, plus haut = plus concentré)
  diversityLabel: string        // 'Très diversifié' | 'Diversifié' | 'Concentré' | 'Très concentré'
  diversityColor: string        // Token CSS

  // Top holdings by weight (sorted desc)
  topHoldings: AllocHolding[]

  // Breakdowns (sorted by value desc)
  byLang: AllocBucket[]
  byEra: AllocBucket[]
  byRarity: AllocBucket[]
  byCondition: AllocBucket[]

  // Alerts
  alerts: AllocAlert[]

  // Treemap data (sets)
  treemapData: TreemapNode[]
}

export interface AllocHolding {
  id: string
  name: string
  set_name: string | null
  lang: string
  rarity: string | null
  qty: number
  value: number
  weightPct: number    // % du portfolio total
  buy_price: number | null
  current_price: number | null
  gain: number
  roiPct: number
}

export interface AllocBucket {
  label: string
  value: number
  pct: number
  count: number
}

export interface AllocAlert {
  level: 'info' | 'warn' | 'danger'
  title: string
  message: string
}

export interface TreemapNode {
  name: string         // set name
  size: number         // value
  pct: number
  count: number        // nb cards
  avgROI: number       // average ROI of cards in this set
  fill: string         // color computed from ROI
}

export function Allocation() {
  const { cards, loading } = usePortfolio()

  const agg = useMemo<AllocAggregates>(() => {
    return computeAggregates(cards || [])
  }, [cards])

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--ink-faint)' }}>
        Chargement…
      </div>
    )
  }

  if (agg.cardsCount === 0) {
    return <EmptyState />
  }

  // Si on a des cartes mais aucune valorisation (current_price tous null/0)
  // alors les composants Recharts (Treemap) crashent avec division par zero.
  // On affiche un etat intermediaire propre.
  if (agg.totalValue === 0) {
    return <NoValuationState cardsCount={agg.cardsCount} />
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <Header />
      <AllocConcentration agg={agg} />
      <AllocAlerts agg={agg} />
      <AllocTreemap agg={agg} />
      <AllocBreakdowns agg={agg} />
      <AllocTopHoldings agg={agg} />
    </div>
  )
}

function NoValuationState({ cardsCount }: { cardsCount: number }) {
  return (
    <div style={{
      width: '100%',
      maxWidth: '720px',
      margin: '0 auto',
      padding: '48px 32px',
      textAlign: 'center',
      fontFamily: 'var(--font-display)',
    }}>
      <p style={{
        fontSize: '10px',
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin: '0 0 4px',
      }}>Portfolio</p>
      <h1 style={{
        fontSize: '26px',
        fontWeight: 600,
        color: 'var(--ink)',
        letterSpacing: '-0.5px',
        margin: '0 0 8px',
      }}>Allocation</h1>

      <div style={{
        marginTop: '32px',
        padding: '32px 24px',
        background: 'rgba(212, 175, 55, 0.06)',
        border: '1px solid rgba(212, 175, 55, 0.25)',
        borderRadius: '14px',
      }}>
        <div style={{ fontSize: '32px', marginBottom: '14px', opacity: 0.6 }}>{'◆'}</div>
        <div style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '8px',
        }}>Valorisation en attente</div>
        <div style={{
          fontSize: '13px',
          color: 'var(--ink-muted)',
          lineHeight: 1.6,
          maxWidth: '480px',
          margin: '0 auto 18px',
        }}>
          {cardsCount.toLocaleString('fr-FR')} carte{cardsCount > 1 ? 's' : ''} dans ton portfolio,
          mais le service de prix est temporairement indisponible.
          L’analyse d’allocation reviendra une fois la valorisation rétablie.
        </div>
        <div style={{
          fontSize: '11px',
          color: 'var(--ink-faint)',
          fontStyle: 'italic',
        }}>
          En attendant, tu peux consulter tes Holdings dans la section Portfolio.
        </div>
      </div>
    </div>
  )
}

/* ── Computation logic ───────────────────────── */

function computeAggregates(cards: any[]): AllocAggregates {
  // Enrich with value
  const enriched: AllocHolding[] = cards.map(c => {
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
      lang: c.lang || 'FR',
      rarity: c.rarity,
      qty,
      value,
      weightPct: 0,    // computed below
      buy_price: c.buy_price,
      current_price: c.current_price,
      gain,
      roiPct,
    }
  })

  const totalValue = enriched.reduce((s, h) => s + h.value, 0)

  // Compute weight pct
  for (const h of enriched) {
    h.weightPct = totalValue > 0 ? (h.value / totalValue) * 100 : 0
  }

  // Top holdings (sorted desc)
  const sortedByWeight = [...enriched].sort((a, b) => b.value - a.value)
  const topHoldings = sortedByWeight.slice(0, 10)

  // Concentration metrics
  const topCardPct = sortedByWeight[0]?.weightPct || 0
  const top5Pct = sortedByWeight.slice(0, 5).reduce((s, h) => s + h.weightPct, 0)

  // HHI = sum of squared market shares (en bps : pct² × 100)
  const hhi = enriched.reduce((s, h) => s + Math.pow(h.weightPct, 2), 0)

  // Diversity rating
  const { label: diversityLabel, color: diversityColor } = getDiversityRating(hhi, enriched.length)

  // Breakdowns
  const byLang      = aggregateBy(enriched, h => h.lang || 'N/A', totalValue)
  const byRarity    = aggregateBy(enriched, h => simplifyRarity(h.rarity), totalValue, 8)
  const byCondition = aggregateBy(enriched, h => deriveCondition(cards.find(c => c.id === h.id)), totalValue)
  const byEra       = aggregateBy(enriched, h => deriveEra(h.set_name), totalValue, 8)

  // Treemap by set
  const setMap = new Map<string, { value: number; count: number; roiSum: number }>()
  for (const h of enriched) {
    const k = h.set_name || 'Sans set'
    const cur = setMap.get(k) || { value: 0, count: 0, roiSum: 0 }
    cur.value += h.value
    cur.count += h.qty
    cur.roiSum += h.roiPct
    setMap.set(k, cur)
  }
  const treemapData: TreemapNode[] = [...setMap.entries()]
    .map(([name, { value, count, roiSum }]) => {
      const avgROI = roiSum / count
      return {
        name,
        size: value,
        pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
        count,
        avgROI,
        fill: roiToColor(avgROI),
      }
    })
    .sort((a, b) => b.size - a.size)

  // Alerts
  const alerts = computeAlerts({
    topCardPct, top5Pct, hhi, byLang, byRarity, byCondition, byEra,
    cardsCount: enriched.length, totalValue,
  })

  return {
    totalValue,
    cardsCount: enriched.length,
    topCardPct, top5Pct, hhi,
    diversityLabel, diversityColor,
    topHoldings,
    byLang, byEra, byRarity, byCondition,
    alerts,
    treemapData,
  }
}

/* ── Helpers ─────────────────────────────────── */

function aggregateBy(
  holdings: AllocHolding[],
  keyFn: (h: AllocHolding) => string,
  totalValue: number,
  maxBuckets = 0
): AllocBucket[] {
  const map = new Map<string, { value: number; count: number }>()
  for (const h of holdings) {
    const k = keyFn(h)
    const cur = map.get(k) || { value: 0, count: 0 }
    cur.value += h.value
    cur.count += h.qty
    map.set(k, cur)
  }
  const buckets: AllocBucket[] = [...map.entries()]
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

function getDiversityRating(hhi: number, count: number): { label: string; color: string } {
  // HHI: 0 = parfaitement diversifié, 10 000 = monopoly (1 seule carte 100%)
  if (count <= 1) return { label: 'Carte unique', color: 'var(--ink-muted)' }
  if (hhi < 500)   return { label: 'Très diversifié', color: 'var(--perf-up)' }
  if (hhi < 1500)  return { label: 'Diversifié', color: 'var(--perf-up)' }
  if (hhi < 2500)  return { label: 'Modérément concentré', color: 'var(--premium)' }
  if (hhi < 5000)  return { label: 'Concentré', color: 'var(--accent)' }
  return { label: 'Très concentré', color: 'var(--perf-down)' }
}

function simplifyRarity(r: string | null): string {
  if (!r) return 'N/A'
  const lower = r.toLowerCase()
  if (lower.includes('illustration') || lower.includes('alt art')) return 'Illustration / Alt'
  if (lower.includes('hyper'))     return 'Hyper Rare'
  if (lower.includes('secret'))    return 'Secret Rare'
  if (lower.includes('ultra'))     return 'Ultra Rare'
  if (lower.includes('holo'))      return 'Holo Rare'
  if (lower.includes('rare'))      return 'Rare'
  if (lower.includes('uncommon') || lower.includes('peu commune')) return 'Uncommon'
  if (lower.includes('common') || lower.includes('commune'))       return 'Common'
  return r
}

function deriveCondition(card: any): string {
  if (!card) return 'N/A'
  if (card.graded && card.grade_company) {
    return `${card.grade_company}${card.grade_value ? ' ' + card.grade_value : ''}`
  }
  return card.condition || 'Raw'
}

function deriveEra(setName: string | null): string {
  if (!setName) return 'N/A'
  const lower = setName.toLowerCase()
  // Heuristique simple — à raffiner avec un mapping set→ère plus tard
  if (lower.match(/base|jungle|fossil|neo|gym|rocket/)) return 'Vintage WOTC'
  if (lower.match(/ex |sandstorm|delta|dragon frontiers|aquapolis|expedition/)) return 'EX'
  if (lower.match(/diamond|pearl|platinum|hgss|heartgold|soulsilver/)) return 'DPP / HGSS'
  if (lower.match(/black white|bw|plasma|dragons exalted/)) return 'Black & White'
  if (lower.match(/^xy|kalos|primal|fates collide|breakthrough/)) return 'XY'
  if (lower.match(/sun moon|sm |ultra|burning|lost thunder/)) return 'Sun & Moon'
  if (lower.match(/sword shield|swsh|rebel|vivid|battle styles|chilling|evolving|fusion|brilliant|astral|lost origin|silver tempest|crown zenith/)) return 'Sword & Shield'
  if (lower.match(/scarlet|violet|sv|paldea|obsidian|paradox|151|pokémon 151|temporal|twilight|stellar|surging|prismatic/)) return 'Scarlet & Violet'
  return 'Autre'
}

function roiToColor(roi: number): string {
  // ROI → couleur (clamp -100% / +100%)
  const clamped = Math.max(-100, Math.min(100, roi))
  if (clamped >= 50)  return '#1D9E75'  // perf-up vif
  if (clamped >= 20)  return '#5BC495'
  if (clamped >= 5)   return '#A8DCC4'
  if (clamped >= -5)  return '#E5E5EA'  // neutre
  if (clamped >= -20) return '#F5C2BB'
  if (clamped >= -50) return '#E87F73'
  return '#E03020'  // perf-down vif
}

function computeAlerts(ctx: {
  topCardPct: number
  top5Pct: number
  hhi: number
  byLang: AllocBucket[]
  byRarity: AllocBucket[]
  byCondition: AllocBucket[]
  byEra: AllocBucket[]
  cardsCount: number
  totalValue: number
}): AllocAlert[] {
  const alerts: AllocAlert[] = []

  // 1. Concentration cartes
  if (ctx.topCardPct > 40) {
    alerts.push({
      level: 'danger',
      title: 'Concentration extrême',
      message: `Une seule carte représente ${Number(ctx.topCardPct ?? 0).toFixed(0)}% du portefeuille. Diversification fortement recommandée.`,
    })
  } else if (ctx.top5Pct > 70) {
    alerts.push({
      level: 'warn',
      title: 'Top 5 cartes dominent',
      message: `Les 5 premières cartes représentent ${Number(ctx.top5Pct ?? 0).toFixed(0)}% du portefeuille.`,
    })
  }

  // 2. Surexposition par dimension (>60% sur 1 bucket)
  for (const [dim, buckets] of [
    ['langue', ctx.byLang], ['rareté', ctx.byRarity],
    ['ère', ctx.byEra], ['état', ctx.byCondition],
  ] as [string, AllocBucket[]][]) {
    const top = buckets[0]
    if (top && top.pct > 60 && top.label !== 'N/A') {
      alerts.push({
        level: top.pct > 75 ? 'warn' : 'info',
        title: `Surexposition ${dim}`,
        message: `${Number(top.pct ?? 0).toFixed(0)}% du portefeuille en "${top.label}".`,
      })
    }
  }

  // 3. Diversité OK (positive feedback)
  if (alerts.length === 0 && ctx.cardsCount >= 10 && ctx.hhi < 1500) {
    alerts.push({
      level: 'info',
      title: 'Portefeuille bien diversifié',
      message: 'Aucune surconcentration détectée. Bonne répartition globale.',
    })
  }

  return alerts
}

/* ── UI helpers ──────────────────────────────── */

function Header() {
  return (
    <div>
      <p style={{
        fontSize: '10px', color: 'var(--ink-muted)', textTransform: 'uppercase',
        letterSpacing: '0.1em', margin: '0 0 4px',
        fontFamily: 'var(--font-display)',
      }}>Portfolio</p>
      <h1 style={{
        fontSize: '26px', fontWeight: 600, color: 'var(--ink)',
        fontFamily: 'var(--font-display)', letterSpacing: '-0.5px', margin: 0,
      }}>Allocation</h1>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: '12px',
    }}>
      <div style={{ fontSize: '14px', color: 'var(--ink)', fontWeight: 600, marginBottom: '6px' }}>
        Aucune carte dans votre portfolio
      </div>
      <div style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
        Ajoutez des cartes depuis Holdings pour voir vos allocations ici.
      </div>
    </div>
  )
}
