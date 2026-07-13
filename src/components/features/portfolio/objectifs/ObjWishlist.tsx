'use client'

import type { ObjAggregates, EnrichedWish } from './Objectifs'
import { SnowButton } from '@/components/ui/snow'
import { usePersona } from '@/lib/usePersona'

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
  const { isCollector } = usePersona()
  const wishlist = agg.enrichedWishlist

  if (wishlist.length === 0) {
    return (
      <div>
        <SectionTitle>{isCollector ? 'Cartes manquantes' : 'Wishlist'}</SectionTitle>
        <div style={{
          background: 'rgba(255,255,255,0.5)',
          backdropFilter: 'blur(12px) saturate(180%)',
          WebkitBackdropFilter: 'blur(12px) saturate(180%)',
          border: '2px dashed rgba(0,0,0,0.12)',
          borderRadius: 14,
          padding: '40px 24px',
          textAlign: 'center' as const,
        }}>
          <div style={{
            fontSize: 14,
            color: '#1D1D1F',
            fontWeight: 600,
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            marginBottom: 7,
            letterSpacing: '-0.01em',
          }}>{isCollector ? 'Aucune carte recherchee pour le moment' : 'Aucune carte dans votre wishlist'}</div>
          <div style={{
            fontSize: 12,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            marginBottom: 18,
          }}>{isCollector ? 'Note les cartes qu il te manque pour completer tes sets.' : 'Trackez les cartes que vous voulez acquerir avec un prix cible.'}</div>
          <SnowButton onClick={onAdd} variant="primary" size="md">+ Ajouter une carte</SnowButton>
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
        {isCollector ? 'Cartes manquantes' : 'Wishlist'} · {wishlist.length} carte{wishlist.length > 1 ? 's' : ''}
        {!isCollector && agg.wishlistAlerts > 0 && (
          <span style={{
            marginLeft: 8,
            padding: '3px 9px',
            background: 'rgba(29,158,117,0.12)',
            color: '#1D9E75',
            fontSize: 9.5,
            fontWeight: 700,
            borderRadius: 99,
            textTransform: 'none' as const,
            letterSpacing: 0,
            border: '1px solid rgba(29,158,117,0.2)',
          }}>▲ {agg.wishlistAlerts} alerte{agg.wishlistAlerts > 1 ? 's' : ''}</span>
        )}
      </SectionTitle>

      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 14,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isCollector ? '40px 3.4fr 1fr auto' : '40px 2.4fr 1fr 1fr 1fr auto',
          gap: 12,
          padding: '10px 18px',
          background: 'rgba(0,0,0,0.025)',
          borderBottom: '1px solid rgba(0,0,0,0.05)',
          fontSize: 9.5,
          fontWeight: 700,
          color: '#86868B',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.08em',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>
          <div style={{ textAlign: 'center' }}>{isCollector ? 'Envie' : '★'}</div>
          <div>Carte</div>
          {isCollector ? (
            <div style={{ textAlign: 'right' }}>Statut</div>
          ) : (
            <>
              <div style={{ textAlign: 'right' }}>Prix cible</div>
              <div style={{ textAlign: 'right' }}>Prix actuel</div>
              <div style={{ textAlign: 'right' }}>État</div>
            </>
          )}
          <div></div>
        </div>

        {/* Rows */}
        {sorted.map((w, i) => (
          <WishRow
            key={w.id}
            wish={w}
            isLast={i === sorted.length - 1}
            isCollector={isCollector}
            onDelete={onDelete}
            onAcquire={onAcquire}
          />
        ))}

        {/* Add row at the end */}
        <button
          onClick={onAdd}
          style={{
            width: '100%',
            padding: 14,
            background: 'transparent',
            border: 'none',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            color: '#86868B',
            fontSize: 12.5,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.4)'
            e.currentTarget.style.color = '#1D1D1F'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = '#86868B'
          }}
        >
          {isCollector ? '+ Ajouter une carte a chercher' : '+ Ajouter une carte'}
        </button>
      </div>
    </div>
  )
}

function WishRow({
  wish, isLast, isCollector, onDelete, onAcquire,
}: {
  wish: EnrichedWish
  isLast: boolean
  isCollector: boolean
  onDelete: (id: string) => void
  onAcquire: (id: string) => void
}) {
  const stars = '★'.repeat(wish.priority) + '☆'.repeat(3 - wish.priority)
  const starColor = wish.priority === 3 ? '#C42E1F'
                   : wish.priority === 2 ? '#C9A84C'
                   : '#AEAEB2'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isCollector ? '40px 3.4fr 1fr auto' : '40px 2.4fr 1fr 1fr 1fr auto',
      gap: 12,
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)',
      alignItems: 'center',
      transition: 'background .15s',
      background: (!isCollector && wish.alertActive) ? 'rgba(29,158,117,0.08)' : 'transparent',
    }}
    onMouseEnter={e => {
      if (isCollector || !wish.alertActive) e.currentTarget.style.background = 'rgba(255,255,255,0.4)'
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = (!isCollector && wish.alertActive) ? 'rgba(29,158,117,0.08)' : 'transparent'
    }}
    >
      {/* Stars */}
      <div style={{
        textAlign: 'center' as const,
        fontSize: 13,
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        color: starColor,
        letterSpacing: '-1px',
      }}>{stars}</div>

      {/* Card name + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1D1D1F',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
          letterSpacing: '-0.01em',
        }}>{wish.card_name}</div>
        <div style={{
          fontSize: 10.5,
          color: '#86868B',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          whiteSpace: 'nowrap' as const,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {[wish.set_name, wish.lang, wish.rarity].filter(Boolean).join(' · ') || '—'}
          {wish.notes && <span style={{ fontStyle: 'italic' as const }}> · {wish.notes}</span>}
        </div>
      </div>

      {isCollector ? (
        /* Collector : statut de recherche, zero prix/alerte */
        <div style={{ textAlign: 'right' as const }}>
          <span style={{
            padding: '3px 10px',
            background: 'rgba(0,0,0,0.04)',
            color: '#86868B',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            borderRadius: 99,
            border: '1px solid rgba(0,0,0,0.06)',
          }}>Recherchee</span>
        </div>
      ) : (
        <>
          {/* Target price */}
          <div style={{
            textAlign: 'right' as const,
            fontSize: 12.5,
            fontWeight: 600,
            color: '#1D1D1F',
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
          }}>{wish.target_price ? formatEUR(wish.target_price) : '—'}</div>

          {/* Current price (cote actuelle Kodo) */}
          <div style={{
            textAlign: 'right' as const,
            fontSize: 12.5,
            fontWeight: wish.alertActive ? 700 : 400,
            color: wish.current_price != null ? (wish.alertActive ? '#1D9E75' : '#1D1D1F') : '#AEAEB2',
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
          }}>{wish.current_price != null ? formatEUR(wish.current_price) : '—'}</div>

          {/* Alert state */}
          <div style={{ textAlign: 'right' as const }}>
            {wish.alertActive ? (
              <span style={{
                padding: '3px 9px',
                background: '#1D9E75',
                color: '#FFFFFF',
                fontSize: 9.5,
                fontWeight: 700,
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.06em',
                borderRadius: 99,
                boxShadow: '0 2px 6px rgba(29,158,117,0.3)',
              }}>▲ Achat</span>
            ) : (
              <span style={{
                fontSize: 10.5,
                color: '#AEAEB2',
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
              }}>En attente</span>
            )}
          </div>
        </>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px' }}>
        <button
          onClick={() => onAcquire(wish.id)}
          title={isCollector ? "Je l'ai trouvee - ajouter a ma collection" : "Marquer comme acquise"}
          style={iconBtnStyle()}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(29,158,117,0.12)'
            e.currentTarget.style.color = '#1D9E75'
            e.currentTarget.style.borderColor = 'rgba(29,158,117,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.color = '#AEAEB2'
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
          }}
        >✓</button>
        <button
          onClick={() => {
            if (window.confirm('Retirer cette carte de la wishlist ?')) onDelete(wish.id)
          }}
          title="Supprimer"
          style={iconBtnStyle()}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(196,46,31,0.1)'
            e.currentTarget.style.color = '#C42E1F'
            e.currentTarget.style.borderColor = 'rgba(196,46,31,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.color = '#AEAEB2'
            e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'
          }}
        >×</button>
      </div>
    </div>
  )
}

function iconBtnStyle(): React.CSSProperties {
  return {
    width: 26,
    height: 26,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.5)',
    border: '1px solid rgba(0,0,0,0.08)',
    color: '#AEAEB2',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all .15s cubic-bezier(.2,.85,.3,1)',
    fontFamily: 'var(--font-sora, Sora, sans-serif)',
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: '#C42E1F',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)',
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
