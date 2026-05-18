'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { usePortfolio } from '@/lib/usePortfolio'
import type { SpreadSignal } from '@/lib/useSpreads'

interface PortfolioCard {
  set_slug?: string | null
  set_name?: string | null
  qty?: number
}

/**
 * Teaser des top spreads avec personnalisation : priorise les sets que tu collectionnes.
 * Spreads matchant tes sets → poussés en haut + badge "Pour toi".
 */
export function HubSpreadsTeaser({
  signals, loading,
}: {
  signals: SpreadSignal[]
  loading: boolean
}) {
  const router = useRouter()
  const portfolio = usePortfolio()

  // Build set frequency map from portfolio
  const userSets = useMemo(() => {
    const map = new Map<string, number>()  // set_slug → card count
    for (const c of (portfolio.cards as PortfolioCard[]) || []) {
      if (!c.set_slug) continue
      map.set(c.set_slug, (map.get(c.set_slug) || 0) + (c.qty || 1))
    }
    return map
  }, [portfolio.cards])

  // Sort signals : matched (in user sets) first, then by tier/upside
  const sortedSignals = useMemo(() => {
    if (signals.length === 0) return []
    const TIER_RANK: Record<string, number> = { S: 3, A: 2, B: 1 }
    return [...signals].sort((a, b) => {
      const aMatch = a.set_slug && userSets.has(a.set_slug) ? 1 : 0
      const bMatch = b.set_slug && userSets.has(b.set_slug) ? 1 : 0
      // Personalized first
      if (aMatch !== bMatch) return bMatch - aMatch
      // Then by tier
      const tierDiff = (TIER_RANK[b.signal_tier] || 0) - (TIER_RANK[a.signal_tier] || 0)
      if (tierDiff !== 0) return tierDiff
      // Then by upside
      return b.upside_pct - a.upside_pct
    }).slice(0, 3)
  }, [signals, userSets])

  const personalizedCount = sortedSignals.filter(s =>
    s.set_slug && userSets.has(s.set_slug)
  ).length

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <SectionLabel>Spreads du jour</SectionLabel>
          {personalizedCount > 0 && (
            <span style={{
              padding: '2px 7px',
              background: 'rgba(224, 48, 32, 0.08)',
              border: '1px solid rgba(224, 48, 32, 0.2)',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: 700,
              color: 'var(--accent)',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{personalizedCount} pour toi</span>
          )}
        </div>
        <button
          onClick={() => router.push('/market/spreads')}
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
      ) : sortedSignals.length === 0 ? (
        <EmptyState />
      ) : (
        sortedSignals.map((s, i) => {
          const isPersonalized = !!(s.set_slug && userSets.has(s.set_slug))
          const cardsInSet = s.set_slug ? userSets.get(s.set_slug) || 0 : 0
          return (
            <Row
              key={s.card_ref}
              signal={s}
              isPersonalized={isPersonalized}
              cardsInSet={cardsInSet}
              isLast={i === sortedSignals.length - 1}
              onClick={() => router.push('/market/spreads')}
            />
          )
        })
      )}
    </div>
  )
}

/* ── Row ─────────────────────────────────── */

function Row({
  signal, isPersonalized, cardsInSet, isLast, onClick,
}: {
  signal: SpreadSignal
  isPersonalized: boolean
  cardsInSet: number
  isLast: boolean
  onClick: () => void
}) {
  const tierStyle = TIER_STYLES[signal.signal_tier]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto',
        gap: '12px',
        width: '100%',
        padding: '11px 16px',
        border: 'none',
        borderTop: '1px solid var(--border)',
        background: isPersonalized ? 'rgba(224, 48, 32, 0.025)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        alignItems: 'center',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = isPersonalized
          ? 'rgba(224, 48, 32, 0.05)'
          : 'rgba(0,0,0,0.015)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isPersonalized
          ? 'rgba(224, 48, 32, 0.025)'
          : 'transparent'
      }}
    >
      {/* Tier badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '24px',
        background: tierStyle.bg,
        color: tierStyle.fg,
        fontSize: '11px',
        fontWeight: 700,
        borderRadius: '5px',
        fontFamily: 'var(--font-data, var(--font-display))',
        letterSpacing: '0.05em',
      }}>{signal.signal_tier}</div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--ink)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
          }}>{signal.card_name}</span>
          {isPersonalized && (
            <span style={{
              padding: '1px 5px',
              background: 'var(--accent)',
              color: '#fff',
              fontSize: '7px',
              fontWeight: 700,
              borderRadius: '3px',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>Pour toi</span>
          )}
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {isPersonalized && cardsInSet > 0 ? (
            <>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                Tu as {cardsInSet} carte{cardsInSet > 1 ? 's' : ''} de ce set
              </span>
              <span style={{ color: 'var(--ink-faint)' }}> · </span>
              EU {formatEUR(signal.price_eu)} <span style={{ color: 'var(--ink-faint)' }}>→</span> US {formatEUR(signal.price_us)}
            </>
          ) : (
            <>EU {formatEUR(signal.price_eu)} <span style={{ color: 'var(--ink-faint)' }}>→</span> US {formatEUR(signal.price_us)}</>
          )}
        </div>
      </div>

      {/* Upside */}
      <div style={{
        textAlign: 'right',
        fontSize: '14px',
        fontWeight: 700,
        color: 'var(--perf-up)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>
        +{signal.upside_pct.toFixed(0)}%
      </div>
    </button>
  )
}

/* ── States ──────────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '40px 16px',
      textAlign: 'center',
      fontSize: '11px',
      color: 'var(--ink-faint)',
      fontFamily: 'var(--font-display)',
    }}>Détection des signaux…</div>
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
      <div style={{ fontSize: '20px', opacity: 0.4, marginBottom: '6px' }}>◆</div>
      Aucun spread détecté pour le moment.<br />
      Le scanner s'exécute toutes les 4 heures.
    </div>
  )
}

/* ── Atoms ─────────────────────────────── */

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

const TIER_STYLES: Record<'S' | 'A' | 'B', { bg: string; fg: string }> = {
  S: { bg: '#FFF8E1', fg: '#B8860B' },
  A: { bg: 'var(--perf-up-soft)', fg: 'var(--perf-up)' },
  B: { bg: 'var(--surface)', fg: 'var(--ink-muted)' },
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
