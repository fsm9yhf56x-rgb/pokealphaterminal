'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useGoals } from '@/lib/useGoals'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'

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
  icon: React.ReactNode
  title: string
  detail: string
  href: string
}

/**
 * Alertes contextuelles Snow+ : milestones / completion / wishlist / ROI / welcome.
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
      ...GLASS.card,
      overflow: 'hidden',
      padding: 0,
    }}>
      <div style={{ padding: '14px 18px 10px' }}>
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

/* ── Alert generator ────────────────────────────── */

function generateAlerts(cards: PortfolioCard[], wishlist: any[]): AlertItem[] {
  const out: AlertItem[] = []

  let totalValue = 0
  let totalCost = 0
  for (const c of cards) {
    const qty = c.qty || 1
    totalValue += (c.current_price ?? 0) * qty
    totalCost += (c.buy_price ?? 0) * qty
  }
  const cardsCount = cards.reduce((s, c) => s + (c.qty || 1), 0)

  if (cards.length === 0) {
    out.push({
      id: 'welcome',
      variant: 'welcome',
      icon: <TargetIcon />,
      title: 'Bienvenue sur Kodo Cards',
      detail: 'Ajoute ta première carte pour commencer à suivre ta collection et débloquer les alertes personnalisées.',
      href: '/portfolio',
    })
    return out
  }

  const milestones = [10, 25, 50, 100, 250, 500, 1000]
  const passedMilestone = milestones.filter(m => cardsCount >= m).pop()
  const nextMilestone = milestones.find(m => m > cardsCount)
  if (passedMilestone && cardsCount - passedMilestone < 5) {
    out.push({
      id: `ms-cards-${passedMilestone}`,
      variant: 'milestone',
      icon: <TrophyIcon />,
      title: `${passedMilestone} cartes atteintes`,
      detail: nextMilestone
        ? `Plus que ${nextMilestone - cardsCount} cartes pour atteindre le palier ${nextMilestone}.`
        : 'Tu as franchi un cap impressionnant.',
      href: '/portfolio',
    })
  }

  const valueMilestones = [1000, 5000, 10000, 25000, 50000, 100000]
  const passedValueMs = valueMilestones.filter(m => totalValue >= m).pop()
  const nextValueMs = valueMilestones.find(m => m > totalValue)
  if (passedValueMs && totalValue - passedValueMs < passedValueMs * 0.15) {
    out.push({
      id: `ms-value-${passedValueMs}`,
      variant: 'milestone',
      icon: <DiamondIcon />,
      title: `Portfolio à ${formatEUR(passedValueMs)}+`,
      detail: nextValueMs
        ? `Plus que ${formatEUR(nextValueMs - totalValue)} à gagner pour atteindre ${formatEUR(nextValueMs)}.`
        : 'Une valeur portfolio remarquable.',
      href: '/portfolio',
    })
  }

  if (totalCost > 0) {
    const roi = ((totalValue - totalCost) / totalCost) * 100
    if (roi > 50) {
      out.push({
        id: 'roi-strong',
        variant: 'roi',
        icon: <SparkIcon />,
        title: `ROI exceptionnel : +${roi.toFixed(0)}%`,
        detail: `Ton portfolio surperforme largement le marché. ${formatEUR(totalValue - totalCost)} de gain latent.`,
        href: '/portfolio/performance',
      })
    } else if (roi < -15) {
      out.push({
        id: 'roi-weak',
        variant: 'roi',
        icon: <WaveIcon />,
        title: `Portfolio en correction : ${roi.toFixed(0)}%`,
        detail: 'Le marché TCG est cyclique. Vérifie tes objectifs pour identifier les bonnes opportunités.',
        href: '/portfolio/objectifs',
      })
    }
  }

  const setCounts = new Map<string, { name: string; count: number }>()
  for (const c of cards) {
    if (!c.set_slug) continue
    const key = c.set_slug
    const existing = setCounts.get(key)
    if (existing) existing.count += c.qty || 1
    else setCounts.set(key, { name: c.set_name || c.set_slug, count: c.qty || 1 })
  }
  const topSet = Array.from(setCounts.values()).sort((a, b) => b.count - a.count)[0]
  if (topSet && topSet.count >= 20) {
    out.push({
      id: `set-${topSet.name}`,
      variant: 'completion',
      icon: <BookIcon />,
      title: `${topSet.count} cartes dans ${truncate(topSet.name, 22)}`,
      detail: 'Surveille les cartes manquantes pour compléter ton set préféré.',
      href: '/portfolio/objectifs',
    })
  }

  if (wishlist && wishlist.length > 0) {
    out.push({
      id: 'wishlist-count',
      variant: 'wishlist',
      icon: <HeartIcon />,
      title: `${wishlist.length} carte${wishlist.length > 1 ? 's' : ''} en wishlist`,
      detail: 'Configure des alertes prix pour être notifié quand elles baissent.',
      href: '/portfolio/objectifs',
    })
  }

  return out.slice(0, 3)
}

/* ── Row ─────────────────────────────── */

function Row({
  alert, isLast, onClick,
}: {
  alert: AlertItem
  isLast: boolean
  onClick: () => void
}) {
  const accent = ACCENT[alert.variant]
  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto',
        alignItems: 'center',
        gap: 12,
        width: '100%',
        padding: '13px 18px',
        border: 'none',
        borderTop: `1px solid ${SNOW.borderSoft}`,
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background .15s ease',
        fontFamily: FONT.body,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        width: 36, height: 36,
        borderRadius: RADIUS.md,
        background: accent.bg,
        border: `1px solid ${accent.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent.color,
        flexShrink: 0,
      }}>
        {alert.icon}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: SNOW.ink,
          marginBottom: 2,
          fontFamily: FONT.display,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {alert.title}
        </div>
        <div style={{
          fontSize: 11,
          color: SNOW.muted,
          lineHeight: 1.4,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>
          {alert.detail}
        </div>
      </div>

      <span style={{
        fontSize: 13,
        color: SNOW.mutedLight,
        flexShrink: 0,
        transition: TRANSITION.fast,
      }}>
        →
      </span>
    </button>
  )
}

/* ── States ─────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '40px 18px',
      textAlign: 'center',
      fontSize: 11,
      color: SNOW.mutedLight,
      fontFamily: FONT.body,
    }}>
      Analyse en cours…
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '40px 22px',
      textAlign: 'center',
      fontSize: 12,
      color: SNOW.muted,
      fontFamily: FONT.body,
      lineHeight: 1.5,
    }}>
      <div style={{ fontSize: 22, opacity: 0.4, marginBottom: 8 }}>✦</div>
      Tout est en ordre — pas d'alerte pour aujourd'hui.
    </div>
  )
}

/* ── Atoms ─────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: SNOW.red,
      }} />
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: SNOW.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: FONT.display,
      }}>
        {children}
      </span>
    </div>
  )
}

/* ── Icons ────────────────────────── */

function svgProps() {
  return { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
}
function TrophyIcon() { return <svg {...svgProps()}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg> }
function DiamondIcon() { return <svg {...svgProps()}><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M11 3 8 9l4 12 4-12-3-6"/><path d="M2 9h20"/></svg> }
function SparkIcon() { return <svg {...svgProps()}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4"/></svg> }
function WaveIcon() { return <svg {...svgProps()}><path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/><path d="M2 17c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/></svg> }
function BookIcon() { return <svg {...svgProps()}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/></svg> }
function HeartIcon() { return <svg {...svgProps()}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> }
function TargetIcon() { return <svg {...svgProps()}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg> }

/* ── Accent palettes ──────────────── */

const ACCENT: Record<AlertVariant, { bg: string; border: string; color: string }> = {
  milestone: {
    bg: SNOW.amber,
    border: 'rgba(212,175,55,0.25)',
    color: SNOW.amberDark,
  },
  completion: {
    bg: SNOW.blue,
    border: 'rgba(24,95,165,0.2)',
    color: SNOW.blueDark,
  },
  wishlist: {
    bg: SNOW.pink,
    border: 'rgba(75,21,40,0.15)',
    color: SNOW.pinkDark,
  },
  roi: {
    bg: SNOW.greenLight,
    border: 'rgba(38,166,91,0.2)',
    color: SNOW.green,
  },
  welcome: {
    bg: SNOW.redLight,
    border: 'rgba(224,48,32,0.2)',
    color: SNOW.red,
  },
}

/* ── Helpers ────────────────────── */

function formatEUR(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} K€`
  return `${v.toFixed(0)} €`
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
