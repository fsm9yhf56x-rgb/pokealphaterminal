'use client'

import { useMemo } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'

interface PortfolioCard {
  qty?: number
  current_price?: number | null
  buy_price?: number | null
  name?: string | null
  set_name?: string | null
  set_slug?: string | null
}

interface InsightData {
  icon: 'spark' | 'target' | 'flame' | 'trophy' | 'heart' | 'compass' | 'plus'
  title: string
  detail: string
  accent: 'green' | 'red' | 'gold' | 'blue' | 'neutral'
}

/**
 * Insight du jour Snow+ v1.0 : message intelligent oriente collectionneur.
 * 7 candidats prioritises selon contexte personnel (pas marche global).
 */
export function HubInsight({
  cards, spreads, indices, loading,
}: {
  cards: PortfolioCard[]
  spreads: any[]   // ignore v2
  indices: any[]   // ignore v2
  loading: boolean
}) {
  const insight = useMemo(() => generateV1Insight(cards), [cards])

  if (loading) return <SkeletonInsight />
  if (!insight) return null

  const accent = ACCENT[insight.accent]

  return (
    <div style={{
      ...GLASS.card,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT.body,
    }}>
      {/* Accent vertical bar à gauche (refraction colorée) */}
      <div style={{
        position: 'absolute',
        top: 8, bottom: 8, left: 0,
        width: 3,
        background: accent.bar,
        borderRadius: 2,
      }} />

      {/* Glow subtle de l'accent dans le coin */}
      <div style={{
        position: 'absolute',
        top: '-20%', left: '-5%',
        width: 180, height: 180,
        background: `radial-gradient(circle, ${accent.glow} 0%, transparent 70%)`,
        filter: 'blur(20px)',
        pointerEvents: 'none',
      }} />

      {/* Icon container - glass soft tinted */}
      <div style={{
        width: 40, height: 40,
        background: accent.iconBg,
        border: `1px solid ${accent.iconBorder}`,
        borderRadius: RADIUS.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: accent.iconColor,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
      }}>
        <InsightIcon name={insight.icon} />
      </div>

      {/* Title + detail */}
      <div style={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 600,
          color: SNOW.ink,
          letterSpacing: '-0.1px',
          marginBottom: 3,
          fontFamily: FONT.display,
        }}>
          {insight.title}
        </div>
        <div style={{
          fontSize: 12,
          color: SNOW.muted,
          lineHeight: 1.5,
        }}>
          {insight.detail}
        </div>
      </div>

      {/* Decorative chevron à droite */}
      <span style={{
        fontSize: 14,
        color: SNOW.mutedExtraLight,
        flexShrink: 0,
        position: 'relative',
        zIndex: 1,
        transition: TRANSITION.fast,
      }}>
        →
      </span>
    </div>
  )
}

/* ── Insight generator v1 (collectionneur) ─────────────────────────── */

function generateV1Insight(cards: PortfolioCard[]): InsightData | null {
  // Calcul stats portfolio
  let totalValue = 0
  let totalCost = 0
  const setCardsMap = new Map<string, { count: number; name: string }>()

  for (const c of cards) {
    const qty = c.qty || 1
    totalValue += (c.current_price ?? 0) * qty
    totalCost += (c.buy_price ?? 0) * qty
    const setKey = c.set_slug || c.set_name || 'unknown'
    const setName = c.set_name || 'Set inconnu'
    const cur = setCardsMap.get(setKey)
    if (cur) cur.count += qty
    else setCardsMap.set(setKey, { count: qty, name: setName })
  }
  const portfolioROI = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : null

  // Top carte par valeur unitaire (pas qty)
  let topCard: PortfolioCard | null = null
  let topCardValue = 0
  for (const c of cards) {
    const v = (c.current_price ?? 0)
    if (v > topCardValue) { topCardValue = v; topCard = c }
  }

  const candidates: Array<InsightData & { priority: number }> = []

  // 1. Empty portfolio (priorite max)
  if (cards.length === 0) {
    return {
      icon: 'plus',
      title: 'Démarre ta collection',
      detail: 'Ajoute tes premières cartes pour suivre leur valeur en temps réel et débloquer ton dashboard personnalisé.',
      accent: 'gold',
    }
  }

  // 2. Petite collection (<5) - encourage progression
  if (cards.length < 5) {
    candidates.push({
      icon: 'target',
      title: `${cards.length} carte${cards.length > 1 ? 's' : ''} dans ta collection`,
      detail: 'Continue d\'ajouter tes cartes pour voir ton portfolio prendre forme. La valeur réelle se révèle au-delà de 10 cartes.',
      accent: 'gold',
      priority: 85,
    })
  }

  // 3. Top carte valeur (info "carte phare")
  if (topCard && topCardValue >= 50 && topCard.name) {
    candidates.push({
      icon: 'trophy',
      title: `${topCard.name} mène ton portfolio`,
      detail: `Estimée à ${formatEUR(topCardValue)}, c'est ta pièce la plus précieuse en valeur unitaire.`,
      accent: 'gold',
      priority: 75,
    })
  }

  // 4. Strong gain (perfo sur portfolio)
  if (portfolioROI !== null && portfolioROI > 20) {
    candidates.push({
      icon: 'spark',
      title: `Ton portfolio est en plus-value de +${portfolioROI.toFixed(0)}%`,
      detail: 'Ta stratégie d\'allocation porte ses fruits. Surveille les pièces qui dominent ta progression.',
      accent: 'green',
      priority: 70,
    })
  }

  // 5. Multi-sets (collectionneur engagé)
  if (setCardsMap.size >= 3) {
    candidates.push({
      icon: 'compass',
      title: `Tu collectionnes ${setCardsMap.size} sets différents`,
      detail: 'Beau collectionneur — pense aux Master Sets pour structurer ta progression et débloquer des badges.',
      accent: 'blue',
      priority: 60,
    })
  }

  // 6. Modest gain
  if (portfolioROI !== null && portfolioROI > 0 && portfolioROI <= 20) {
    candidates.push({
      icon: 'spark',
      title: `Portfolio en croissance régulière (+${portfolioROI.toFixed(1)}%)`,
      detail: 'Tes choix d\'allocation rapportent. Continue de scruter le marché pour les prochaines opportunités.',
      accent: 'green',
      priority: 50,
    })
  }

  // 7. Default fallback - aperçu du jour
  if (candidates.length === 0) {
    candidates.push({
      icon: 'compass',
      title: 'Aperçu du jour',
      detail: `Tu suis ${cards.length} carte${cards.length > 1 ? 's' : ''} sur ${setCardsMap.size} set${setCardsMap.size > 1 ? 's' : ''}. Bonne continuation dans ta collection.`,
      accent: 'neutral',
      priority: 10,
    })
  }

  candidates.sort((a, b) => b.priority - a.priority)
  const winner = candidates[0]
  const { priority, ...rest } = winner
  return rest
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}

/* ── Icons SVG inline (legers) ───────────────────────────────────────── */

function InsightIcon({ name }: { name: InsightData['icon'] }) {
  const props = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'spark':
      return <svg {...props}><path d="M12 2v6M12 16v6M2 12h6M16 12h6"/></svg>
    case 'target':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
    case 'flame':
      return <svg {...props}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
    case 'trophy':
      return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
    case 'heart':
      return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
    case 'compass':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
    case 'plus':
      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  }
}

/* ── Skeleton ───────────────────────────────────────────────────────── */

function SkeletonInsight() {
  return (
    <div style={{
      ...GLASS.card,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '16px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
        animation: 'kcShimmer 1.4s ease-in-out infinite',
      }} />
      <div style={{ width: 40, height: 40, background: SNOW.surface, borderRadius: RADIUS.md, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, width: '50%', background: SNOW.surface, borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 11, width: '80%', background: SNOW.surface, borderRadius: 4 }} />
      </div>
    </div>
  )
}

/* ── Accent palettes (Snow+) ──────────────────────────────────────── */

const ACCENT: Record<InsightData['accent'], {
  bar: string; glow: string; iconBg: string; iconBorder: string; iconColor: string;
}> = {
  green: {
    bar: SNOW.green,
    glow: 'rgba(38,166,91,0.10)',
    iconBg: SNOW.greenLight,
    iconBorder: 'rgba(38,166,91,0.2)',
    iconColor: SNOW.green,
  },
  red: {
    bar: SNOW.red,
    glow: 'rgba(224,48,32,0.08)',
    iconBg: SNOW.redLight,
    iconBorder: 'rgba(224,48,32,0.2)',
    iconColor: SNOW.red,
  },
  gold: {
    bar: SNOW.amberDark,
    glow: 'rgba(212,175,55,0.10)',
    iconBg: SNOW.amber,
    iconBorder: 'rgba(212,175,55,0.25)',
    iconColor: SNOW.amberDark,
  },
  blue: {
    bar: SNOW.blueDark,
    glow: 'rgba(24,95,165,0.08)',
    iconBg: SNOW.blue,
    iconBorder: 'rgba(24,95,165,0.2)',
    iconColor: SNOW.blueDark,
  },
  neutral: {
    bar: SNOW.muted,
    glow: 'rgba(110,110,115,0.06)',
    iconBg: SNOW.surface,
    iconBorder: SNOW.border,
    iconColor: SNOW.muted,
  },
}
