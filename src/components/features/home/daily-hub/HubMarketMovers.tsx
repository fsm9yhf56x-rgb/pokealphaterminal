'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCardImageUrl } from '@/lib/images'
import { usePortfolio } from '@/lib/usePortfolio'

interface MarketMover {
  card_ref: string
  card_name: string
  set_name: string | null
  set_slug: string | null
  card_number: string | null
  price: number
  ebay_sales: number
  has_graded: boolean
  inPortfolio: boolean   // ⭐ NEW : crossover flag
}

/**
 * Top movers du marché global avec crossover portfolio.
 * Si une carte du top marché est aussi dans ton portfolio, badge "DANS TON PORTFOLIO" gold.
 */
export function HubMarketMovers() {
  const router = useRouter()
  const portfolio = usePortfolio()
  const [movers, setMovers] = useState<MarketMover[]>([])
  const [loading, setLoading] = useState(true)

  // Build a Set of portfolio card identifiers for fast lookup
  const portfolioCardSet = useMemo(() => {
    const set = new Set<string>()
    for (const c of portfolio.cards || []) {
      // Match by card_ref OR by set_slug + card_number combination
      if ((c as any).card_ref) set.add(String((c as any).card_ref))
      if ((c as any).set_slug && (c as any).card_number) {
        set.add(`${(c as any).set_slug}::${(c as any).card_number}`)
      }
      // Also match by name (loose) for cards where ref isn't aligned
      if (c.name) set.add(c.name.toLowerCase().trim())
    }
    return set
  }, [portfolio.cards])

  useEffect(() => {
    let cancelled = false
    loadMovers()
    async function loadMovers() {
      try {
        const { data, error } = await (supabase as any)
          .from('prices_v2')
          .select('card_ref, card_name, set_name, set_slug, card_number, top_price, ebay_avg, ebay_sales, has_graded')
          .gt('ebay_sales', 8)
          .gt('top_price', 30)
          .lt('top_price', 5000)
          .order('ebay_sales', { ascending: false })
          .limit(8)

        if (cancelled || error) {
          if (error) console.warn('[HubMarketMovers]', error)
          return
        }

        const all = (data || []).map((r: any): MarketMover => {
          const refMatch = portfolioCardSet.has(String(r.card_ref))
          const slugMatch = r.set_slug && r.card_number
            ? portfolioCardSet.has(`${r.set_slug}::${r.card_number}`)
            : false
          const nameMatch = r.card_name
            ? portfolioCardSet.has(String(r.card_name).toLowerCase().trim())
            : false
          return {
            card_ref: r.card_ref,
            card_name: r.card_name || 'Unknown',
            set_name: r.set_name,
            set_slug: r.set_slug,
            card_number: r.card_number,
            price: Number(r.top_price) || Number(r.ebay_avg) || 0,
            ebay_sales: Number(r.ebay_sales) || 0,
            has_graded: !!r.has_graded,
            inPortfolio: refMatch || slugMatch || nameMatch,
          }
        })

        all.sort((a: MarketMover, b: MarketMover) => b.ebay_sales - a.ebay_sales)
        const picked = all.slice(0, 3)
        if (!cancelled) setMovers(picked)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    return () => { cancelled = true }
  }, [portfolioCardSet])

  // Count crossover for header
  const crossoverCount = movers.filter(m => m.inPortfolio).length

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
          <SectionLabel>Marché en mouvement</SectionLabel>
          {crossoverCount > 0 && (
            <span style={{
              padding: '2px 7px',
              background: 'rgba(212, 175, 55, 0.14)',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '4px',
              fontSize: '8px',
              fontWeight: 700,
              color: '#B8860B',
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{crossoverCount} matché{crossoverCount > 1 ? 's' : ''}</span>
          )}
        </div>
        <button
          onClick={() => router.push('/market')}
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
        >Terminal <span>→</span></button>
      </div>

      {loading ? (
        <LoadingState />
      ) : movers.length === 0 ? (
        <EmptyState />
      ) : (
        movers.map((m, i) => (
          <Row
            key={m.card_ref}
            mover={m}
            rank={i + 1}
            isLast={i === movers.length - 1}
            onClick={() => router.push('/market/explorer')}
          />
        ))
      )}
    </div>
  )
}

/* ── Row ─────────────────────────────────── */

function Row({
  mover, rank, isLast, onClick,
}: {
  mover: MarketMover
  rank: number
  isLast: boolean
  onClick: () => void
}) {
  const imgUrl = mover.set_slug && mover.card_number
    ? getCardImageUrl({ lang: 'EN', setId: mover.set_slug, localId: mover.card_number })
    : ''

  return (
    <button
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: '36px 1fr auto',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '11px 16px',
        border: 'none',
        borderTop: '1px solid var(--border)',
        background: mover.inPortfolio ? 'rgba(212, 175, 55, 0.04)' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = mover.inPortfolio
          ? 'rgba(212, 175, 55, 0.08)'
          : 'rgba(0,0,0,0.015)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = mover.inPortfolio
          ? 'rgba(212, 175, 55, 0.04)'
          : 'transparent'
      }}
    >
      {/* Mini image */}
      <div style={{
        width: '32px',
        height: '44px',
        background: '#F5F5F7',
        borderRadius: '4px',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}>
        {imgUrl && (
          <img
            src={imgUrl}
            alt=""
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
        {/* Star indicator if in portfolio */}
        {mover.inPortfolio && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: '14px',
            height: '14px',
            background: '#D4AF37',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            color: '#fff',
            fontWeight: 700,
            border: '2px solid var(--surface)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}>★</div>
        )}
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '3px',
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
          }}>{mover.card_name}</span>
          {mover.inPortfolio && (
            <span style={{
              padding: '1px 5px',
              background: '#D4AF37',
              color: '#fff',
              fontSize: '7px',
              fontWeight: 700,
              borderRadius: '3px',
              fontFamily: 'var(--font-display)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>Tu en as</span>
          )}
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span>{mover.set_name || '—'}</span>
          {mover.has_graded && (
            <span style={{
              padding: '0px 4px',
              background: 'var(--premium, #D4AF37)',
              color: '#fff',
              fontSize: '8px',
              fontWeight: 700,
              borderRadius: '3px',
              letterSpacing: '0.05em',
            }}>PSA</span>
          )}
        </div>
      </div>

      {/* Price + volume */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1.1,
        }}>
          {formatEUR(mover.price)}
        </div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
          fontVariantNumeric: 'tabular-nums',
          marginTop: '2px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          justifyContent: 'flex-end',
        }}>
          <VolumeIcon />
          {mover.ebay_sales}
        </div>
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
    }}>Analyse du marché…</div>
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
      Aucune carte populaire à afficher pour le moment.
    </div>
  )
}

/* ── Atoms ─────────────────────────────── */

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

function VolumeIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
      <path d="M1 7V5M3 7V3M5 7V1M7 7V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
