'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useGoals } from '@/lib/useGoals'

interface PortfolioCard {
  set_name?: string | null
  set_slug?: string | null
  qty?: number
  current_price?: number | null
  buy_price?: number | null
}

type AlertVariant = 'milestone' | 'completion' | 'wishlist' | 'roi' | 'welcome'

interface AlertItem {
  id: string
  variant: AlertVariant
  emoji: string
  title: string
  detail: string
  href: string
  ctaLabel: string
}

/**
 * Alertes contextuelles "Du nouveau pour toi" : milestones, sets proches complétion,
 * wishlist, ROI exceptionnel, etc. Adaptatif selon le contexte utilisateur.
 */
export function HubAlerts({
  cards, loading,
}: {
  cards: PortfolioCard[]
  loading: boolean
}) {
  const router = useRouter()
  const { wishlist } = useGoals()

  const alerts = useMemo(
    () => generateAlerts(cards, wishlist),
    [cards, wishlist]
  )

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
      }}>
        <SectionLabel>Du nouveau pour toi</SectionLabel>
      </div>

      {loading ? (
        <LoadingState />
      ) : alerts.length === 0 ? (
        <EmptyState />
      ) : (
        alerts.map((alert, i) => (
          <Row
            key={alert.id}
            alert={alert}
            isLast={i === alerts.length - 1}
            onClick={() => router.push(alert.href)}
          />
        ))
      )}
    </div>
  )
}

/* ── Alert generator ─────────────────────── */

function generateAlerts(
  cards: PortfolioCard[],
  wishlist: any[]
): AlertItem[] {
  const out: AlertItem[] = []

  // Calculate aggregates
  let totalValue = 0
  let totalCost = 0
  for (const c of cards) {
    const qty = c.qty || 1
    totalValue += (c.current_price ?? 0) * qty
    totalCost += (c.buy_price ?? 0) * qty
  }
  const cardsCount = cards.reduce((s, c) => s + (c.qty || 1), 0)

  // Welcome alert if portfolio empty
  if (cards.length === 0) {
    out.push({
      id: 'welcome',
      variant: 'welcome',
      emoji: '🎯',
      title: 'Bienvenue sur PokéAlpha',
      detail: 'Ajoute ta première carte pour commencer à suivre ta collection et débloquer les alertes personnalisées.',
      href: '/portfolio',
      ctaLabel: 'Ajouter une carte',
    })
    return out
  }

  // Alert : milestone cartes (10, 25, 50, 100, 250, 500, 1000)
  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  const passedMilestone = milestones.filter(m => cardsCount >= m).pop()
  const nextMilestone = milestones.find(m => m > cardsCount)
  if (passedMilestone && cardsCount - passedMilestone < 5) {
    out.push({
      id: `ms-cards-${passedMilestone}`,
      variant: 'milestone',
      emoji: '🏆',
      title: `${passedMilestone} cartes atteintes`,
      detail: nextMilestone
        ? `Plus que ${nextMilestone - cardsCount} cartes pour atteindre le palier ${nextMilestone}.`
        : 'Tu as franchi un cap impressionnant.',
      href: '/portfolio',
      ctaLabel: 'Voir mon portfolio',
    })
  }

  // Alert : milestone valeur (1k, 5k, 10k, 25k, 50k, 100k)
  const valueMilestones = [1000, 5000, 10000, 25000, 50000, 100000]
  const passedValueMs = valueMilestones.filter(m => totalValue >= m).pop()
  const nextValueMs = valueMilestones.find(m => m > totalValue)
  if (passedValueMs && totalValue - passedValueMs < passedValueMs * 0.15) {
    out.push({
      id: `ms-value-${passedValueMs}`,
      variant: 'milestone',
      emoji: '💎',
      title: `Portfolio à ${formatEUR(passedValueMs)}+`,
      detail: nextValueMs
        ? `Plus que ${formatEUR(nextValueMs - totalValue)} à gagner pour atteindre ${formatEUR(nextValueMs)}.`
        : 'Une valeur portfolio remarquable.',
      href: '/portfolio',
      ctaLabel: 'Voir détails',
    })
  }

  // Alert : ROI exceptionnel (>50%)
  if (totalCost > 0) {
    const roi = ((totalValue - totalCost) / totalCost) * 100
    if (roi > 50) {
      out.push({
        id: 'roi-strong',
        variant: 'roi',
        emoji: '🚀',
        title: `ROI exceptionnel : +${roi.toFixed(0)}%`,
        detail: `Ton portfolio surperforme largement le marché. ${formatEUR(totalValue - totalCost)} de gain latent.`,
        href: '/portfolio/performance',
        ctaLabel: 'Voir performance',
      })
    } else if (roi < -15) {
      out.push({
        id: 'roi-weak',
        variant: 'roi',
        emoji: '🌊',
        title: `Portfolio en correction : ${roi.toFixed(0)}%`,
        detail: 'Le marché TCG est cyclique. Vérifie tes signaux Spreads pour identifier les opportunités de rachat.',
        href: '/market/spreads',
        ctaLabel: 'Voir spreads',
      })
    }
  }

  // Alert : sets proche complétion (> 70%)
  // Group portfolio cards by set
  const setCounts = new Map<string, { name: string; count: number }>()
  for (const c of cards) {
    if (!c.set_slug) continue
    const key = c.set_slug
    const existing = setCounts.get(key)
    if (existing) {
      existing.count += c.qty || 1
    } else {
      setCounts.set(key, { name: c.set_name || c.set_slug, count: c.qty || 1 })
    }
  }
  // Find a set with significant count (>20 cards as a proxy for "advanced")
  const topSet = Array.from(setCounts.values())
    .sort((a, b) => b.count - a.count)[0]
  if (topSet && topSet.count >= 20) {
    out.push({
      id: `set-${topSet.name}`,
      variant: 'completion',
      emoji: '📚',
      title: `${topSet.count} cartes dans ${truncate(topSet.name, 22)}`,
      detail: 'Surveille les cartes manquantes pour compléter ton set préféré.',
      href: '/portfolio/objectifs',
      ctaLabel: 'Voir objectifs',
    })
  }

  // Alert : wishlist active
  if (wishlist && wishlist.length > 0) {
    out.push({
      id: 'wishlist-count',
      variant: 'wishlist',
      emoji: '⭐',
      title: `${wishlist.length} carte${wishlist.length > 1 ? 's' : ''} en wishlist`,
      detail: 'Configure des alertes prix pour être notifié quand elles baissent.',
      href: '/portfolio/objectifs',
      ctaLabel: 'Voir wishlist',
    })
  }

  // Limit to top 3 alerts
  return out.slice(0, 3)
}

/* ── Row ────────────────────────────────── */

function Row({
  alert, isLast, onClick,
}: {
  alert: AlertItem
  isLast: boolean
  onClick: () => void
}) {
  const accent = ACCENT_COLORS[alert.variant]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '34px 1fr auto',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px 16px',
        border: 'none',
        borderTop: '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Emoji avatar */}
      <div style={{
        width: '34px',
        height: '34px',
        borderRadius: '8px',
        background: accent.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        flexShrink: 0,
      }}>{alert.emoji}</div>

      {/* Title + detail */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--ink)',
          marginBottom: '2px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{alert.title}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>{alert.detail}</div>
      </div>

      {/* CTA arrow */}
      <span style={{
        fontSize: '13px',
        color: 'var(--ink-faint)',
        flexShrink: 0,
      }}>→</span>
    </button>
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
    }}>Analyse en cours…</div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '32px 20px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-muted)',
      fontFamily: 'var(--font-display)',
      lineHeight: 1.5,
    }}>
      <div style={{ fontSize: '20px', opacity: 0.4, marginBottom: '6px' }}>✦</div>
      Tout est en ordre — pas d'alerte pour aujourd'hui.
    </div>
  )
}

/* ── Atoms ──────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

const ACCENT_COLORS: Record<AlertVariant, { bg: string }> = {
  milestone:  { bg: 'rgba(212, 175, 55, 0.14)' },   // gold
  completion: { bg: 'rgba(31, 138, 204, 0.10)' },   // blue
  wishlist:   { bg: 'rgba(212, 175, 55, 0.14)' },   // gold
  roi:        { bg: 'rgba(29, 158, 117, 0.10)' },   // green
  welcome:    { bg: 'rgba(224, 48, 32, 0.08)' },    // accent red
}

/* ── Helpers ───────────────────────────── */

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
