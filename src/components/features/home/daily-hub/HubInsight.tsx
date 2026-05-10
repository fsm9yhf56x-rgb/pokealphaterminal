'use client'

import { useMemo } from 'react'
import type { SpreadSignal } from '@/lib/useSpreads'
import type { MarketIndex } from '@/lib/useMarketData'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
  buy_price?: number | null
}

interface InsightData {
  emoji: string
  title: string
  detail: string
  accent: 'green' | 'red' | 'gold' | 'neutral'
}

/**
 * Insight du jour : phrase intelligente auto-générée selon contexte portfolio + marché.
 * Sélectionne le message le plus pertinent parmi plusieurs candidats.
 */
export function HubInsight({
  cards, spreads, indices, loading,
}: {
  cards: PortfolioCard[]
  spreads: SpreadSignal[]
  indices: MarketIndex[]
  loading: boolean
}) {
  const insight = useMemo(() => generateInsight(cards, spreads, indices), [cards, spreads, indices])

  if (loading) return <SkeletonInsight />
  if (!insight) return null

  const accentColor = ACCENT_COLORS[insight.accent]

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: `3px solid ${accentColor.border}`,
      borderRadius: '10px',
      fontFamily: 'var(--font-display)',
    }}>
      {/* Emoji avatar */}
      <div style={{
        width: '38px',
        height: '38px',
        background: accentColor.bg,
        borderRadius: '10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        flexShrink: 0,
      }}>{insight.emoji}</div>

      {/* Title + detail */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          letterSpacing: '-0.1px',
          marginBottom: '2px',
        }}>{insight.title}</div>
        <div style={{
          fontSize: '11px',
          color: 'var(--ink-muted)',
          lineHeight: 1.5,
        }}>{insight.detail}</div>
      </div>

      {/* Decorative chevron */}
      <span style={{
        fontSize: '14px',
        color: 'var(--ink-faint)',
        opacity: 0.6,
        flexShrink: 0,
      }}>◆</span>
    </div>
  )
}

/* ── Insight generator ───────────────────── */

function generateInsight(
  cards: PortfolioCard[],
  spreads: SpreadSignal[],
  indices: MarketIndex[]
): InsightData | null {
  // Calculate portfolio stats
  let totalValue = 0
  let totalCost = 0
  for (const c of cards) {
    const qty = c.qty || 1
    totalValue += (c.current_price ?? 0) * qty
    totalCost += (c.buy_price ?? 0) * qty
  }
  const portfolioROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null
  const sCount = spreads.filter(s => s.signal_tier === 'S').length
  const topSpread = spreads[0]
  const vintageIdx = indices.find(i => i.id === 'vintage_us')

  // Empty portfolio insight
  if (cards.length === 0) {
    return {
      emoji: '🎯',
      title: 'Démarre ta collection',
      detail: 'Ajoute tes premières cartes pour suivre leur valeur en temps réel et débloquer ton dashboard personnalisé.',
      accent: 'gold',
    }
  }

  // Multiple candidates ranked by impact
  const candidates: Array<InsightData & { priority: number }> = []

  // Candidate 1 : Strong portfolio gain
  if (portfolioROI !== null && portfolioROI > 20) {
    candidates.push({
      emoji: '🚀',
      title: `Ton portfolio surperforme avec +${portfolioROI.toFixed(0)}%`,
      detail: vintageIdx && vintageIdx.change_24h_pct !== 0
        ? `Vs Vintage US qui fait ${vintageIdx.change_24h_pct >= 0 ? '+' : ''}${vintageIdx.change_24h_pct.toFixed(1)}% sur 24h. Belle stratégie d'allocation.`
        : 'Ta stratégie d\'allocation porte ses fruits, continue de surveiller les opportunités.',
      accent: 'green',
      priority: 90,
    })
  }

  // Candidate 2 : Many S-tier spreads
  if (sCount >= 5) {
    candidates.push({
      emoji: '◆',
      title: `${sCount} spreads S-tier détectés aujourd'hui`,
      detail: topSpread
        ? `Le top : ${topSpread.card_name} avec un upside de +${topSpread.upside_pct.toFixed(0)}%. Ne tarde pas trop, le marché s'auto-corrige vite.`
        : `Une journée riche en opportunités d'arbitrage. C'est le moment d'agir.`,
      accent: 'red',
      priority: 80,
    })
  }

  // Candidate 3 : Portfolio losing significantly
  if (portfolioROI !== null && portfolioROI < -10) {
    candidates.push({
      emoji: '🌊',
      title: 'Phase de correction sur ton portfolio',
      detail: `${portfolioROI.toFixed(0)}% sur ton coût total. Le marché TCG est cyclique — c'est souvent le bon moment pour repérer des cartes sous-cotées.`,
      accent: 'red',
      priority: 75,
    })
  }

  // Candidate 4 : Market in strong uptrend
  if (vintageIdx && vintageIdx.change_24h_pct > 5) {
    candidates.push({
      emoji: '📈',
      title: `Le Vintage US chauffe : +${vintageIdx.change_24h_pct.toFixed(1)}% sur 24h`,
      detail: 'Les cartes vintage entrent dans une phase haussière. Vérifie tes holdings de cette époque.',
      accent: 'green',
      priority: 70,
    })
  }

  // Candidate 5 : New investor (small portfolio with positive ROI)
  if (cards.length < 5 && portfolioROI !== null && portfolioROI > 0) {
    candidates.push({
      emoji: '🌱',
      title: 'Bonne start — ton portfolio est déjà en gain',
      detail: `+${portfolioROI.toFixed(1)}% sur ${cards.length} carte${cards.length > 1 ? 's' : ''}. Continue de diversifier pour réduire le risque.`,
      accent: 'green',
      priority: 60,
    })
  }

  // Candidate 6 : Healthy portfolio, normal market
  if (portfolioROI !== null && portfolioROI > 0 && portfolioROI <= 20) {
    candidates.push({
      emoji: '✦',
      title: `Portfolio en croissance régulière (+${portfolioROI.toFixed(1)}%)`,
      detail: topSpread
        ? `Le top spread du jour : ${topSpread.card_name} (+${topSpread.upside_pct.toFixed(0)}%). Une opportunité à étudier.`
        : 'Continue de surveiller les indices et les spreads pour ton prochain mouvement.',
      accent: 'neutral',
      priority: 40,
    })
  }

  // Default fallback : welcome / market status
  if (candidates.length === 0) {
    candidates.push({
      emoji: '◇',
      title: 'Aperçu du jour',
      detail: vintageIdx
        ? `Vintage US à €${vintageIdx.current.toFixed(0)} (${vintageIdx.change_24h_pct >= 0 ? '+' : ''}${vintageIdx.change_24h_pct.toFixed(1)}% 24h). ${spreads.length} spreads sur le marché.`
        : `${spreads.length} opportunités détectées sur le marché aujourd'hui.`,
      accent: 'neutral',
      priority: 10,
    })
  }

  // Pick highest priority
  candidates.sort((a, b) => b.priority - a.priority)
  const winner = candidates[0]
  const { priority, ...rest } = winner
  return rest
}

/* ── Skeleton ───────────────────────────── */

function SkeletonInsight() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 18px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderLeft: '3px solid var(--border-strong)',
      borderRadius: '10px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.04) 50%, transparent 100%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer-insight 1.4s ease-in-out infinite',
      }} />
      <style>{`@keyframes shimmer-insight { 0%{background-position:200% 0;} 100%{background-position:-200% 0;} }`}</style>

      <div style={{
        width: '38px', height: '38px',
        background: 'var(--surface-muted, #F5F5F7)',
        borderRadius: '10px',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1 }}>
        <div style={{
          height: '13px', width: '60%',
          background: 'var(--surface-muted, #F5F5F7)',
          borderRadius: '4px',
          marginBottom: '6px',
        }} />
        <div style={{
          height: '11px', width: '85%',
          background: 'var(--surface-muted, #F5F5F7)',
          borderRadius: '4px',
        }} />
      </div>
    </div>
  )
}

/* ── Accent colors ──────────────────────── */

const ACCENT_COLORS: Record<'green' | 'red' | 'gold' | 'neutral', { bg: string; border: string }> = {
  green:   { bg: 'rgba(29, 158, 117, 0.10)',  border: '#1D9E75' },
  red:     { bg: 'rgba(224, 48, 32, 0.08)',   border: '#E03020' },
  gold:    { bg: 'rgba(212, 175, 55, 0.12)',  border: '#D4AF37' },
  neutral: { bg: 'rgba(0, 0, 0, 0.04)',       border: 'var(--ink-muted)' },
}
