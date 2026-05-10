'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCardImageUrl } from '@/lib/images'

interface MarketMover {
  card_ref: string
  card_name: string
  set_name: string | null
  set_slug: string | null
  card_number: string | null
  price: number
  ebay_sales: number
  has_graded: boolean
}

/**
 * Top movers du marché global : cartes les plus vendues / les plus chères en mouvement.
 * Différent de HubMovers (qui montre TES cartes) — ici c'est ce qui chauffe ailleurs.
 */
export function HubMarketMovers() {
  const router = useRouter()
  const [movers, setMovers] = useState<MarketMover[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    loadMovers()
    async function loadMovers() {
      try {
        // Get top cards by recent eBay sales activity + significant price
        // Proxy for "what's hot" : high volume + meaningful value
        const { data, error } = await (supabase as any)
          .from('prices_v2')
          .select('card_ref, card_name, set_name, set_slug, card_number, top_price, ebay_avg, ebay_sales, has_graded')
          .gt('ebay_sales', 8)        // strong volume
          .gt('top_price', 30)        // not penny cards
          .lt('top_price', 5000)      // not super outliers
          .order('ebay_sales', { ascending: false })
          .limit(8)

        if (cancelled || error) {
          if (error) console.warn('[HubMarketMovers]', error)
          return
        }

        // Pick 3 with diverse value range (low/mid/high) to feel curated
        const all = (data || []).map((r: any) => ({
          card_ref: r.card_ref,
          card_name: r.card_name || 'Unknown',
          set_name: r.set_name,
          set_slug: r.set_slug,
          card_number: r.card_number,
          price: Number(r.top_price) || Number(r.ebay_avg) || 0,
          ebay_sales: Number(r.ebay_sales) || 0,
          has_graded: !!r.has_graded,
        }))

        // Sort by volume, take top 3
        all.sort((a: MarketMover, b: MarketMover) => b.ebay_sales - a.ebay_sales)
        const picked = all.slice(0, 3)
        if (!cancelled) setMovers(picked)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    return () => { cancelled = true }
  }, [])

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
        <SectionLabel>Marché en mouvement</SectionLabel>
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
        background: 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'background 0.1s',
        fontFamily: 'var(--font-display)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Mini image */}
      <div style={{
        width: '32px',
        height: '44px',
        background: '#F5F5F7',
        borderRadius: '4px',
        overflow: 'hidden',
        flexShrink: 0,
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
      </div>

      {/* Name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--ink)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '3px',
        }}>{mover.card_name}</div>
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
  if (v >= 1000) return `€${(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
