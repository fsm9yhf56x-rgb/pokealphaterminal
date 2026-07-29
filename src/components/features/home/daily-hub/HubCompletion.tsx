'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/lib/usePortfolio'
import { getSets, type StaticSet } from '@/lib/cardDb'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

/**
 * HubCompletion - "Ta quete du jour" : le set le plus proche de la completion
 * (hors 100%). Hook collector quotidien. Donnees : portfolio + totaux getSets.
 */
export function HubCompletion() {
  const { cards } = usePortfolio()
  const router = useRouter()
  const [setsMap, setSetsMap] = useState<Record<string, StaticSet>>({})

  useEffect(() => {
    Promise.all([
      getSets('FR').catch(() => []),
      getSets('EN').catch(() => []),
      getSets('JP').catch(() => []),
    ]).then(([fr, en, jp]) => {
      const m: Record<string, StaticSet> = {}
      for (const s of [...fr, ...en, ...jp]) m[s.id] = s
      setSetsMap(m)
    })
  }, [])

  // Regroupe les cartes possedees par set_id, calcule owned/total/pct.
  const best = useMemo(() => {
    // On compte les cartes DISTINCTES : 3 exemplaires d'Artikodin ne font pas
    // avancer la serie de 3. Sans ca, une progression peut depasser le total.
    const seen: Record<string, Set<string>> = {}
    const owned: Record<string, { name: string; owned: number }> = {}
    for (const c of cards ?? []) {
      const sid = (c as any).set_id
      if (!sid) continue
      const num = String((c as any).card_number ?? '').replace(/^0+(?=\d)/, '').toLowerCase()
      if (!num) continue
      if (!seen[sid]) seen[sid] = new Set()
      if (seen[sid].has(num)) continue
      seen[sid].add(num)
      const e = owned[sid] || { name: (c as any).set_name || sid, owned: 0 }
      e.owned += 1
      owned[sid] = e
    }
    const enriched = Object.entries(owned).map(([setId, v]) => {
      const total = setsMap[setId]?.total || 0
      const pct = total > 0 ? Math.min((v.owned / total) * 100, 100) : 0
      const logo = setsMap[setId]?.logo || null
      return { setId, name: v.name, owned: v.owned, total, pct, logo }
    })
    // Le plus avance, strictement < 100%, avec un total connu.
    const inProgress = enriched.filter(s => s.total > 0 && s.pct < 100)
    inProgress.sort((a, b) => b.pct - a.pct)
    return inProgress[0] || null
  }, [cards, setsMap])

  if (!best) return null

  const remaining = Math.max(0, best.total - best.owned)
  const R = 26
  const C = 2 * Math.PI * R
  const dash = C * (best.pct / 100)
  const accent = '#E03020'

  return (
    <button
      onClick={() => router.push('/portfolio/objectifs')}
      style={{
        display: 'flex', alignItems: 'center', gap: 18, width: '100%', textAlign: 'left',
        padding: '18px 22px', borderRadius: 18, cursor: 'pointer',
        background: 'linear-gradient(135deg, rgba(224,48,32,0.06), rgba(255,255,255,0.6))',
        backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(224,48,32,0.18)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 0 0 0.5px rgba(255,255,255,0.7)',
        transition: 'transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(224,48,32,0.14), inset 0 0 0 0.5px rgba(255,255,255,0.7)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04), inset 0 0 0 0.5px rgba(255,255,255,0.7)' }}
    >
      {/* Anneau de progression */}
      <div style={{ position: 'relative', flexShrink: 0, width: 64, height: 64 }}>
        <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(0,0,0,0.07)" strokeWidth="5" />
          <circle cx="32" cy="32" r={R} fill="none" stroke={accent} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={`${dash} ${C}`} style={{ transition: 'stroke-dasharray .6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 14, fontWeight: 700, color: SNOW.ink }}>
          {best.pct.toFixed(0)}%
        </div>
      </div>

      {/* Texte */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent }} />
          <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Ta quête du jour</span>
        </div>
        <div style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{best.name}</div>
        <div style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted, marginTop: 3 }}>
          {remaining === 0 ? 'Set presque complet !' : <>Plus que <strong style={{ color: accent, fontWeight: 700 }}>{remaining}</strong> carte{remaining > 1 ? 's' : ''} pour finir — {best.owned}/{best.total}</>}
        </div>
      </div>

      {/* Fleche */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ color: accent, flexShrink: 0 }}>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
