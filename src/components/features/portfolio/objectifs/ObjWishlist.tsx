'use client'

import type { ObjAggregates, EnrichedWish } from './Objectifs'

/**
 * Wishlist : cartes à acheter avec priorité (★/★★/★★★) + prix cible.
 * Alerte visuelle si prix actuel ≤ prix cible (TODO: enrichir via prices_v2).
 */
export function ObjWishlist({
  agg, onAdd, onDelete, onAcquire,
}: {
  agg: ObjAggregates
  onAdd: () => void
  onDelete: (id: string) => void
  onAcquire: (id: string) => void
}) {
  const wishlist = agg.enrichedWishlist

  if (wishlist.length === 0) {
    return (
      <div>
        <SectionTitle>Wishlist</SectionTitle>
        <div style={{
          background: 'var(--surface)',
          border: '2px dashed var(--border-strong)',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '13px',
            color: 'var(--ink)',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            marginBottom: '6px',
          }}>Aucune carte dans votre wishlist</div>
          <div style={{
            fontSize: '11px',
            color: 'var(--ink-muted)',
            fontFamily: 'var(--font-display)',
            marginBottom: '14px',
          }}>Trackez les cartes que vous voulez acquérir avec un prix cible.</div>
          <button
            onClick={onAdd}
            style={{
              padding: '8px 14px',
              background: 'var(--ink)',
              color: 'var(--surface)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >+ Ajouter une carte</button>
        </div>
      </div>
    )
  }

  // Sort: priority desc, then alerts first
  const sorted = [...wishlist].sort((a, b) => {
    if (a.alertActive !== b.alertActive) return a.alertActive ? -1 : 1
    return b.priority - a.priority
  })

  return (
    <div>
      <SectionTitle>
        Wishlist · {wishlist.length} carte{wishlist.length > 1 ? 's' : ''}
        {agg.wishlistAlerts > 0 && (
          <span style={{
            marginLeft: '8px',
            padding: '2px 6px',
            background: 'var(--perf-up-soft)',
            color: 'var(--perf-up)',
            fontSize: '9px',
            fontWeight: 600,
            borderRadius: '4px',
            textTransform: 'none',
            letterSpacing: 0,
          }}>▲ {agg.wishlistAlerts} alerte{agg.wishlistAlerts > 1 ? 's' : ''}</span>
        )}
      </SectionTitle>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '40px 2.4fr 1fr 1fr 1fr auto',
          gap: '12px',
          padding: '10px 16px',
          background: '#FAFAFA',
          borderBottom: '1px solid var(--border)',
          fontSize: '9px',
          fontWeight: 600,
          color: 'var(--ink-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-display)',
        }}>
          <div style={{ textAlign: 'center' }}>★</div>
          <div>Carte</div>
          <div style={{ textAlign: 'right' }}>Prix cible</div>
          <div style={{ textAlign: 'right' }}>Prix actuel</div>
          <div style={{ textAlign: 'right' }}>État</div>
          <div></div>
        </div>

        {/* Rows */}
        {sorted.map((w, i) => (
          <WishRow
            key={w.id}
            wish={w}
            isLast={i === sorted.length - 1}
            onDelete={onDelete}
            onAcquire={onAcquire}
          />
        ))}

        {/* Add row at the end */}
        <button
          onClick={onAdd}
          style={{
            width: '100%',
            padding: '12px',
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid var(--border)',
            color: 'var(--ink-muted)',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'var(--font-display)',
            transition: 'all 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#FAFAFA'
            e.currentTarget.style.color = 'var(--ink)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--ink-muted)'
          }}
        >
          + Ajouter une carte
        </button>
      </div>
    </div>
  )
}

function WishRow({
  wish, isLast, onDelete, onAcquire,
}: {
  wish: EnrichedWish
  isLast: boolean
  onDelete: (id: string) => void
  onAcquire: (id: string) => void
}) {
  const stars = '★'.repeat(wish.priority) + '☆'.repeat(3 - wish.priority)
  const starColor = wish.priority === 3 ? 'var(--accent)'
                   : wish.priority === 2 ? 'var(--premium)'
                   : 'var(--ink-faint)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '40px 2.4fr 1fr 1fr 1fr auto',
      gap: '12px',
      padding: '12px 16px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      alignItems: 'center',
      transition: 'background 0.1s',
      background: wish.alertActive ? 'var(--perf-up-soft)' : 'transparent',
    }}
    onMouseEnter={e => {
      if (!wish.alertActive) e.currentTarget.style.background = 'rgba(0,0,0,0.015)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = wish.alertActive ? 'var(--perf-up-soft)' : 'transparent'
    }}
    >
      {/* Stars */}
      <div style={{
        textAlign: 'center',
        fontSize: '13px',
        fontFamily: 'var(--font-display)',
        color: starColor,
        letterSpacing: '-1px',
      }}>{stars}</div>

      {/* Card name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--ink)',
          fontFamily: 'var(--font-display)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: '2px',
        }}>{wish.card_name}</div>
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[wish.set_name, wish.lang, wish.rarity].filter(Boolean).join(' · ') || '—'}
          {wish.notes && <span style={{ fontStyle: 'italic' }}> · {wish.notes}</span>}
        </div>
      </div>

      {/* Target price */}
      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--ink)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>{wish.target_price ? formatEUR(wish.target_price) : '—'}</div>

      {/* Current price (placeholder for now) */}
      <div style={{
        textAlign: 'right',
        fontSize: '12px',
        color: 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
      }}>—</div>

      {/* Alert state */}
      <div style={{ textAlign: 'right' }}>
        {wish.alertActive ? (
          <span style={{
            padding: '2px 6px',
            background: 'var(--perf-up)',
            color: 'var(--surface)',
            fontSize: '9px',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            borderRadius: '4px',
          }}>▲ Achat</span>
        ) : (
          <span style={{
            fontSize: '10px',
            color: 'var(--ink-faint)',
            fontFamily: 'var(--font-display)',
          }}>En attente</span>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onAcquire(wish.id)}
          title="Marquer comme acquise"
          style={iconBtnStyle('perf-up')}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--perf-up-soft)'
            e.currentTarget.style.color = 'var(--perf-up)'
            e.currentTarget.style.borderColor = 'var(--green-border)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--ink-faint)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >✓</button>
        <button
          onClick={() => {
            if (window.confirm('Retirer cette carte de la wishlist ?')) onDelete(wish.id)
          }}
          title="Supprimer"
          style={iconBtnStyle('accent')}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--red-light)'
            e.currentTarget.style.color = 'var(--accent)'
            e.currentTarget.style.borderColor = 'var(--red-border)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--ink-faint)'
            e.currentTarget.style.borderColor = 'var(--border)'
          }}
        >×</button>
      </div>
    </div>
  )
}

function iconBtnStyle(_hoverToken: string): React.CSSProperties {
  return {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--ink-faint)',
    fontSize: '11px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.12s',
    fontFamily: 'var(--font-display)',
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '10px', fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, var(--border), transparent)',
      }} />
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
