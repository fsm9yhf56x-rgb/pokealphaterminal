'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

type Lang = 'FR' | 'EN' | 'JP'
type SetItem = { name: string; lang: Lang; releaseDate: string; releaseDateLocale: string; imageUrl: string | null; isReleased: boolean; pptId: string }

const LANG_COLOR: Record<Lang, string> = { FR: '#2A82DD', EN: '#E03020', JP: '#D4AF37' }

/**
 * HubReleases - "L'actu des sorties". Consomme /api/releases (fusion TCGdex + PPT).
 * Aperçu : 2 a venir + 3 sortis recemment.
 */
export function HubReleases() {
  const router = useRouter()
  const [recent, setRecent] = useState<SetItem[]>([])
  const [upcoming, setUpcoming] = useState<SetItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/releases')
      .then(r => r.json())
      .then((d) => {
        if (!alive) return
        const sets: SetItem[] = d.sets || []
        setUpcoming(sets.filter(s => !s.isReleased).slice(0, 2))
        setRecent(sets.filter(s => s.isReleased).slice(0, 3))
        setLoading(false)
      })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  if (loading || (recent.length === 0 && upcoming.length === 0)) return null

  return (
    <div style={{
      padding: '20px 22px', borderRadius: 18,
      background: 'linear-gradient(135deg, rgba(42,130,221,0.06), rgba(255,255,255,0.6))',
      backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(42,130,221,0.16)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.04), inset 0 0 0 0.5px rgba(255,255,255,0.7)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#2A82DD' }} />
          <span style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, color: '#2A82DD', textTransform: 'uppercase', letterSpacing: '0.07em' }}>L’actu des sorties</span>
        </div>
        <button onClick={() => router.push('/releases')} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: '#2A82DD', fontSize: 12, fontWeight: 600, fontFamily: FONT.display, padding: 0 }}>
          Tout le calendrier
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcoming.map(s => <ReleaseRow key={s.pptId} set={s} />)}
        {recent.map(s => <ReleaseRow key={s.pptId} set={s} />)}
      </div>
    </div>
  )
}

function ReleaseRow({ set }: { set: SetItem }) {
  const isUpcoming = !set.isReleased
  const tagColor = isUpcoming ? '#E07B39' : '#1D9E75'
  const tagText = isUpcoming ? 'À venir' : 'Sorti'
  const lc = LANG_COLOR[set.lang]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 12px', borderRadius: 12,
      background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)',
    }}>
      <div style={{ flexShrink: 0, width: 64, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {set.imageUrl
          ? <img src={set.imageUrl} alt={set.name} loading="lazy" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          : <span style={{ fontFamily: FONT.display, fontSize: 11, color: SNOW.mutedLight }}>{set.lang}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: SNOW.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{set.name}</span>
          <span style={{ flexShrink: 0, padding: '1px 6px', borderRadius: RADIUS.pill, background: lc + '1A', border: `1px solid ${lc}44`, color: lc, fontSize: 9, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.04em' }}>{set.lang}</span>
        </div>
        <div style={{ fontFamily: FONT.body, fontSize: 12, color: SNOW.muted, marginTop: 2 }}>{set.releaseDateLocale}</div>
      </div>
      <span style={{ flexShrink: 0, padding: '3px 9px', borderRadius: RADIUS.pill, background: tagColor + '1A', border: `1px solid ${tagColor}44`, color: tagColor, fontSize: 10, fontWeight: 700, fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tagText}</span>
    </div>
  )
}
