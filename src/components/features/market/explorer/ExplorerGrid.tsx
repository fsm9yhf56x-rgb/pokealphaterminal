'use client'

import { useState } from 'react'
import { getCardImageUrl, parseLocalId } from '@/lib/images'
import type { ExplorerResult } from '@/lib/useExplorerSearch'

/**
 * Grid view : cartes avec image + nom + prix + variation cardmarket.
 * Click → ouvre le drawer détail.
 */
export function ExplorerGrid({
  results, onSelect,
}: {
  results: ExplorerResult[]
  onSelect: (cardRef: string) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
      gap: '14px',
    }}>
      {results.map(card => (
        <CardTile key={card.card_ref} card={card} onSelect={onSelect} />
      ))}
    </div>
  )
}

function CardTile({
  card, onSelect,
}: {
  card: ExplorerResult
  onSelect: (cardRef: string) => void
}) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const imgUrl = card.tcgdex_set_id && card.card_number
    ? getCardImageUrl({
        lang: (card.lang as any) || 'EN',
        setId: card.tcgdex_set_id,
        localId: parseLocalId(card.card_number),
      })
    : ''

  const isUp = card.cardmarket_trend != null && card.cardmarket_trend > 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'
  const sign = isUp ? '+' : ''

  return (
    <button
      onClick={() => onSelect(card.card_ref)}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '0',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--ink)'
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {/* Image */}
      <div style={{
        width: '100%',
        aspectRatio: '0.7',
        background: '#F5F5F7',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {imgUrl && !imgError ? (
          <>
            {!imgLoaded && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, #F5F5F7 0%, #ECECEE 50%, #F5F5F7 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            )}
            <style>{`
              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }
            `}</style>
            <img
              src={imgUrl}
              alt={card.card_name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                opacity: imgLoaded ? 1 : 0,
                transition: 'opacity 0.3s',
              }}
            />
          </>
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--ink-faint)',
            fontSize: '24px',
          }}>🃏</div>
        )}

        {/* Tier badge if any */}
        {card.tier && (
          <div style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            padding: '2px 6px',
            background: TIER_BG[card.tier] || 'var(--surface)',
            color: TIER_FG[card.tier] || 'var(--ink)',
            fontSize: '9px',
            fontWeight: 700,
            borderRadius: '4px',
            fontFamily: 'var(--font-data, var(--font-display))',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>{card.tier}</div>
        )}

        {/* Graded badge */}
        {card.has_graded && (
          <div style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            padding: '2px 6px',
            background: 'var(--premium)',
            color: 'var(--surface)',
            fontSize: '9px',
            fontWeight: 700,
            borderRadius: '4px',
            fontFamily: 'var(--font-display)',
          }}>GRADED</div>
        )}
      </div>

      {/* Body : name + meta + price */}
      <div style={{
        padding: '10px 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          lineHeight: 1.3,
        }}>{card.card_name}</div>

        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[card.set_name, card.variant && card.variant !== 'raw' ? card.variant : null]
            .filter(Boolean).join(' · ')}
        </div>

        <div style={{
          marginTop: '6px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-data, var(--font-display))',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.3px',
          }}>{formatEUR(card.top_price)}</div>

          {card.cardmarket_trend != null && card.cardmarket_trend !== 0 && (
            <div style={{
              fontSize: '10px',
              fontWeight: 600,
              color: trendColor,
              fontFamily: 'var(--font-data, var(--font-display))',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {isUp ? '▲' : '▼'} {sign}{card.cardmarket_trend.toFixed(1)}%
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

const TIER_BG: Record<string, string> = {
  S: '#FFF8E1',
  A: 'var(--perf-up-soft)',
  B: 'var(--surface)',
}
const TIER_FG: Record<string, string> = {
  S: '#B8860B',
  A: 'var(--perf-up)',
  B: 'var(--ink-muted)',
}

function formatEUR(v: number): string {
  if (v >= 1000) return `€${Number(v / 1000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
