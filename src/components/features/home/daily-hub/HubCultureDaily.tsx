
'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/lib/usePortfolio'
import { deriveEra } from '@/components/features/portfolio/allocation/Allocation'
import { getCultureDaily } from '@/lib/cultureDaily'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

/**
 * Bloc "Culture du jour" du Daily Hub collectionneur.
 * Pepite (anecdote / artiste / ere) en rotation quotidienne deterministe,
 * reliee a la collection quand pertinent ("X dans ta collection").
 */
export function HubCultureDaily() {
  const router = useRouter()
  const { cards } = usePortfolio()
  const item = useMemo(() => getCultureDaily(), [])

  // Compte les cartes liees a la pepite (par ere) pour le pont collection.
  const ownedCount = useMemo(() => {
    const list = (cards ?? []) as any[]
    if (item.era) {
      return list.reduce((n, c) => n + (deriveEra(c.set_name ?? null) === item.era ? (Number(c.qty) || 1) : 0), 0)
    }
    return 0
  }, [cards, item])

  const kindLabel = item.kind === 'anecdote' ? 'Curiosite' : item.kind === 'artiste' ? 'Artiste' : 'Ere'

  return (
    <button
      onClick={() => router.push(item.href)}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%', position: 'relative', overflow: 'hidden',
        background: `linear-gradient(135deg, ${item.color}16, rgba(255,255,255,0.62))`,
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${item.color}30`, borderRadius: RADIUS.lg, padding: '20px 22px',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
        transition: 'transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s',
        display: 'flex', alignItems: 'center', gap: 18,
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 16px 36px ${item.color}26` }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.85)' }}
    >
      <div aria-hidden style={{ position: 'absolute', top: -60, right: -50, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${item.color}1F, transparent 68%)`, pointerEvents: 'none' }} />

      {/* Icone livre ouvert (Culture) */}
      <div style={{ width: 46, height: 46, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${item.color}, ${item.color}CC)`, boxShadow: `0 6px 16px ${item.color}40` }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 6c-1.5-1.2-3.5-2-6-2-1 0-2 .2-2 .2v13s1-.2 2-.2c2.5 0 4.5.8 6 2 1.5-1.2 3.5-2 6-2 1 0 2 .2 2 .2v-13s-1-.2-2-.2c-2.5 0-4.5.8-6 2zM12 6v14" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>

      <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, color: item.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.eyebrow}</span>
          <span style={{ fontFamily: FONT.body, fontSize: 9.5, fontWeight: 600, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '2px 7px', borderRadius: 999, background: 'rgba(0,0,0,0.04)' }}>{kindLabel}</span>
          {ownedCount > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT.body, fontSize: 10.5, fontWeight: 700, color: '#B8860B', padding: '2px 8px', borderRadius: 999, background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.3)' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ownedCount} dans ta collection
            </span>
          )}
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.02em', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, lineHeight: 1.5 }}>{item.text}</div>
      </div>

      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, color: SNOW.mutedLight, alignSelf: 'center' }}><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  )
}
