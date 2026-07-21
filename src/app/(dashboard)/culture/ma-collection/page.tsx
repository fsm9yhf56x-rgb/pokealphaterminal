'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/lib/usePortfolio'
import { deriveEra } from '@/components/features/portfolio/allocation/Allocation'
import { fetchCardDetail } from '@/lib/tcgApi'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'
import { useIsMobile } from '@/lib/useIsMobile'

const ERA_ICONS: Record<string, string> = {
  crown: 'M3 17l2-9 4 5 3-7 3 7 4-5 2 9H3z',
  gem: 'M6 3h12l3 6-9 12L3 9l3-6zM3 9h18M9 3l3 6 3-6',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 3v2M12 19v2M3 12h2M19 12h2',
  bolt: 'M13 2L4 14h6l-1 8 9-12h-6l1-8z',
  flower: 'M12 9.6a2.4 2.4 0 100 4.8 2.4 2.4 0 000-4.8zM12 9.6c0-3 1-5 0-7-1 2 0 4 0 7zM12 14.4c0 3-1 5 0 7 1-2 0-4 0-7z',
  wave: 'M3 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0',
  sword: 'M14.5 4l5.5 1-1 5.5-9 9-4.5-4.5 9-9zM6 16l-3 3 2 2 3-3',
  flame: 'M12 2c1 4 5 6 5 10a5 5 0 01-10 0c0-2 1-3 1-3 1 2 2 2 2 0 0-3 1-5 2-7z',
}

const ERA_ORDER: { era: string; label?: string; color: string; period: string; icon: string; short: string }[] = [
  { era: 'Vintage WOTC',     color: '#D4AF37', period: '1996-2003', icon: 'crown',  short: 'WOTC' },
  { era: 'EX',               color: '#2A82DD', period: '2003-2007', icon: 'gem',    short: 'EX' },
  { era: 'DPP / HGSS',       color: '#0E9E8E', period: '2007-2011', icon: 'sun',    short: 'DPP' },
  { era: 'Black & White',    label: 'Noir & Blanc',    color: '#5C6270', period: '2011-2013', icon: 'bolt',   short: 'B&W' },
  { era: 'XY',               color: '#C44E8E', period: '2013-2016', icon: 'flower', short: 'XY' },
  { era: 'Sun & Moon',       label: 'Soleil & Lune',       color: '#E07B39', period: '2017-2019', icon: 'wave',   short: 'S&M' },
  { era: 'Sword & Shield',   label: 'Épée & Bouclier',   color: '#4F5FC4', period: '2020-2022', icon: 'sword',  short: 'SWSH' },
  { era: 'Scarlet & Violet', label: 'Écarlate & Violet', color: '#D93A3A', period: '2023-...',  icon: 'flame',  short: 'SV' },
]
const ERA_INDEX = new Map(ERA_ORDER.map((e, i) => [e.era, i]))

const PROFILES: Record<string, { title: string; line: string }> = {
  'Vintage WOTC':     { title: 'Gardien du Vintage',          line: 'Tu chéris les origines — l’âge d’or WOTC, là où la légende a commencé.' },
  'EX':               { title: 'Collectionneur de l’ère EX',  line: 'Tu explores l’âge des holos numériques et des Crystal Types.' },
  'DPP / HGSS':       { title: 'Explorateur Diamant & Perle',  line: 'Tu cultives une époque sous-cotée, les prochains vintages.' },
  'Black & White':    { title: 'Amateur de la refonte BW',     line: 'Tu collectionnes la grande modernisation du jeu.' },
  'XY':               { title: 'Chasseur de Méga-Évolutions',  line: 'Tu vises l’ère des premières cartes texturées.' },
  'Sun & Moon':       { title: 'Collectionneur GX',            line: 'Tu surfes sur les Rainbow Rares et les Tag Team.' },
  'Sword & Shield':   { title: 'Collectionneur moderne',       line: 'Tu vis le grand boom et ses Alternate Arts.' },
  'Scarlet & Violet': { title: 'Collectionneur contemporain',  line: 'Tu suis le TCG dans sa forme la plus actuelle.' },
}
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), 40 + delay); return () => clearTimeout(t) }, [delay])
  return <div style={{ opacity: shown ? 1 : 0, transform: shown ? 'translateY(0)' : 'translateY(18px)', transition: 'opacity .6s ease, transform .65s cubic-bezier(.2,.85,.3,1)' }}>{children}</div>
}

function EraIcon({ icon, size = 18, color }: { icon: string; size?: number; color: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color }}><path d={ERA_ICONS[icon]} stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" /></svg>
}

function ProgressRing({ value, total, color }: { value: number; total: number; color: string }) {
  const [p, setP] = useState(0)
  useEffect(() => { const t = setTimeout(() => setP(value / total), 300); return () => clearTimeout(t) }, [value, total])
  const R = 46, C = 2 * Math.PI * R
  return (
    <div style={{ position: 'relative', width: 116, height: 116, flexShrink: 0 }}>
      <svg width="116" height="116" viewBox="0 0 116 116" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="58" cy="58" r={R} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="9" />
        <circle cx="58" cy="58" r={R} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} style={{ transition: 'stroke-dasharray 1.1s cubic-bezier(.2,.85,.3,1)' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}<span style={{ fontSize: 16, color: SNOW.mutedLight }}>/{total}</span></div>
        <div style={{ fontFamily: FONT.body, fontSize: 10.5, color: SNOW.muted, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>ères</div>
      </div>
    </div>
  )
}

export default function MaCollectionCulturePage() {
  const isMobile = useIsMobile()
  const router = useRouter()
  const { cards, loading } = usePortfolio()
  const [topArtist, setTopArtist] = useState<{ name: string; count: number } | null>(null)
  const [artistLoading, setArtistLoading] = useState(false)

  const stats = useMemo(() => {
    const list = (cards ?? []) as any[]
    const totalCards = list.reduce((s, c) => s + (Number(c.qty) || 1), 0)
    const setIds = new Set(list.map(c => String(c.set_id ?? '').replace(/^jp-|^en-/, '')).filter(Boolean))
    const byEra = new Map<string, number>()
    list.forEach(c => { const era = deriveEra(c.set_name ?? null); if (era === 'N/A') return; byEra.set(era, (byEra.get(era) ?? 0) + (Number(c.qty) || 1)) })

    const eraData = ERA_ORDER.map(e => ({ ...e, count: byEra.get(e.era) ?? 0 }))
    const maxCount = eraData.reduce((m, e) => Math.max(m, e.count), 0) || 1
    const eraRows = eraData.filter(e => e.count > 0).sort((a, b) => b.count - a.count)
    const erasOwned = eraData.filter(e => e.count > 0)
    const erasMissing = eraData.filter(e => e.count === 0)
    const ownedIdx = ERA_ORDER.map((e, i) => ((byEra.get(e.era) ?? 0) > 0 ? i : -1)).filter(i => i >= 0)
    const periodLabel = ownedIdx.length ? `${ERA_ORDER[ownedIdx[0]].period.split('-')[0]} - ${ERA_ORDER[ownedIdx[ownedIdx.length - 1]].period.split('-')[1] || 'auj.'}` : '-'
    const spanYears = ownedIdx.length >= 1 ? (() => { const sY = parseInt(ERA_ORDER[ownedIdx[0]].period.slice(0, 4)) || 1996; const eS = ERA_ORDER[ownedIdx[ownedIdx.length - 1]].period.split('-')[1]; const eY = eS && /\d{4}/.test(eS) ? parseInt(eS) : new Date().getFullYear(); return Math.max(1, eY - sY) })() : 0
    const dominant = eraRows[0]?.era ?? null
    const nextMissing = erasMissing.length ? erasMissing.slice().sort((a, b) => { const c = ownedIdx.length ? ownedIdx[ownedIdx.length - 1] : 0; return Math.abs(ERA_INDEX.get(a.era)! - c) - Math.abs(ERA_INDEX.get(b.era)! - c) })[0] : null

    return { totalCards, setCount: setIds.size, eraData, eraRows, maxCount, erasOwned, erasMissing, periodLabel, spanYears, dominant, nextMissing, totalEras: ERA_ORDER.length }
  }, [cards])

  useEffect(() => {
    const list = (cards ?? []) as any[]; if (list.length === 0) return
    let alive = true; setArtistLoading(true)
    const sample = list.slice(0, 60)
    ;(async () => {
      const counts = new Map<string, number>()
      const lang = (sample[0]?.lang === 'EN' ? 'EN' : 'FR')
      for (let i = 0; i < sample.length; i += 6) {
        if (!alive) return
        const batch = sample.slice(i, i + 6)
        const res = await Promise.all(batch.map(async (c) => {
          const setId = String(c.set_id ?? '').replace(/^jp-|^en-/, ''); const num = String(c.card_number ?? '').replace(/^0+/, '')
          if (!setId || !num) return null
          try { const d = await fetchCardDetail(lang, `${setId}-${num}`); return d?.illustrator ?? null } catch { return null }
        }))
        res.forEach(ill => { if (ill) counts.set(ill, (counts.get(ill) ?? 0) + 1) })
      }
      if (!alive) return
      const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]
      setTopArtist(top ? { name: top[0], count: top[1] } : null); setArtistLoading(false)
    })()
    return () => { alive = false }
  }, [cards])

  const dom = stats.dominant ? PROFILES[stats.dominant] : null
  const domColor = stats.eraRows[0]?.color ?? '#E03020'

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: isMobile ? '20px 14px 90px' : '32px 20px 100px' }}>
      <button onClick={() => router.push('/culture')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20, background: 'transparent', border: 'none', cursor: 'pointer', color: SNOW.muted, fontSize: 13, fontFamily: FONT.body, padding: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Culture
      </button>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: SNOW.muted, fontFamily: FONT.body }}>Chargement...</div>
      ) : stats.totalCards === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', background: 'rgba(255,255,255,0.55)', borderRadius: RADIUS.xl, border: `1px solid ${SNOW.border}` }}>
          <p style={{ fontFamily: FONT.body, fontSize: 15, color: SNOW.muted, margin: '0 0 18px' }}>Ta collection est vide. Ajoute des cartes pour révéler ta carte de collectionneur.</p>
          <button onClick={() => router.push('/cartes')} style={{ padding: '11px 22px', borderRadius: RADIUS.pill, background: '#1D1D1F', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 600, fontSize: 14 }}>Explorer le catalogue</button>
        </div>
      ) : (
        <>
          <Reveal>
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: RADIUS.xl, marginBottom: 18, background: `linear-gradient(135deg, ${domColor}1A, rgba(255,255,255,0.66) 60%)`, backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', border: `1px solid ${domColor}33`, boxShadow: `0 20px 60px ${domColor}1A, inset 0 1px 0 rgba(255,255,255,0.9)`, padding: '30px 32px' }}>
              <div aria-hidden style={{ position: 'absolute', top: -80, right: -60, width: 320, height: 320, borderRadius: '50%', background: `radial-gradient(circle, ${domColor}26, transparent 68%)`, pointerEvents: 'none' }} />
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                <ProgressRing value={stats.erasOwned.length} total={stats.totalEras} color={domColor} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <span style={{ display: 'inline-block', marginBottom: 11, padding: '5px 13px', borderRadius: RADIUS.pill, background: `${domColor}1F`, border: `1px solid ${domColor}45`, color: SNOW.ink, fontSize: 10.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Ta carte de collectionneur</span>
                  <h1 style={{ fontFamily: FONT.display, fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.035em', margin: '0 0 10px', lineHeight: 1.02 }}>{dom?.title ?? 'Collectionneur'}</h1>
                  <p style={{ fontFamily: FONT.body, fontSize: 15.5, color: SNOW.inkSoft, margin: 0, maxWidth: '52ch', lineHeight: 1.55 }}>{dom?.line}{stats.spanYears > 1 ? ` Ta collection traverse ${stats.spanYears} ans d’histoire.` : ''}</p>
                </div>
              </div>
              <div style={{ position: 'relative', display: 'flex', gap: 28, flexWrap: 'wrap', marginTop: 26, paddingTop: 22, borderTop: `1px solid ${domColor}26` }}>
                {[{ label: 'Cartes', value: stats.totalCards }, { label: 'Séries différentes', value: stats.setCount }, { label: 'Période', value: stats.periodLabel }, { label: 'Ère dominante', value: stats.dominant ?? '-' }].map(k => (
                  <div key={k.label}>
                    <div style={{ fontFamily: FONT.display, fontSize: 21, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{k.value}</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: SNOW.muted, marginTop: 1 }}>{k.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 38 }}>
              {(artistLoading || topArtist) && (
                <button onClick={() => topArtist && router.push(`/culture/artistes/${encodeURIComponent(topArtist.name)}`)} disabled={!topArtist} style={{ textAlign: 'left', cursor: topArtist ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 15, position: 'relative', background: 'linear-gradient(135deg, rgba(224,48,32,0.09), rgba(255,255,255,0.62))', border: '1px solid rgba(224,48,32,0.22)', borderRadius: RADIUS.lg, padding: '18px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(160deg, #E03020, #E03020CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, color: '#E03020', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Ton artiste signature</div>
                    {artistLoading && !topArtist ? (
                      <div style={{ fontFamily: FONT.body, fontSize: 14, color: SNOW.muted }}>Identification...</div>
                    ) : topArtist ? (
                      <>
                        <div style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{topArtist.name}</div>
                        <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: SNOW.muted }}>{topArtist.count} carte{topArtist.count > 1 ? 's' : ''} · voir sa fiche</div>
                      </>
                    ) : null}
                  </div>
                </button>
              )}
              {stats.nextMissing && (
                <button onClick={() => router.push('/culture/eres')} style={{ textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 15, position: 'relative', background: `linear-gradient(135deg, ${stats.nextMissing.color}16, rgba(255,255,255,0.62))`, border: `1px solid ${stats.nextMissing.color}33`, borderRadius: RADIUS.lg, padding: '18px 20px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(160deg, ${stats.nextMissing.color}, ${stats.nextMissing.color}CC)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <EraIcon icon={stats.nextMissing.icon} size={24} color="#fff" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 700, color: stats.nextMissing.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Ta prochaine conquête</div>
                    <div style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 800, color: SNOW.ink, letterSpacing: '-0.02em' }}>{(ERA_ORDER.find(e => e.era === stats.nextMissing!.era)?.label) ?? stats.nextMissing.era}</div>
                    <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: SNOW.muted }}>{stats.nextMissing.period} · explore-la</div>
                  </div>
                </button>
              )}
            </div>
          </Reveal>

          <Reveal delay={220}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <h2 style={{ fontFamily: FONT.display, fontSize: 19, fontWeight: 700, color: SNOW.ink, letterSpacing: '-0.02em', margin: 0 }}>Ta traversée des ères</h2>
              <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: SNOW.mutedLight }}>volume par époque</span>
            </div>
            <p style={{ fontFamily: FONT.body, fontSize: 13.5, color: SNOW.muted, margin: '0 0 22px' }}>Chaque colonne est une ère. Pleine si tu la possèdes, fantôme sinon. Clique pour explorer.</p>
            <div style={{ position: 'relative', padding: '18px 16px 14px', borderRadius: RADIUS.lg, background: 'linear-gradient(180deg, rgba(245,245,247,0.5), rgba(245,245,247,0.15))', border: `1px solid ${SNOW.borderSoft}`, marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: isMobile ? 4 : 'clamp(6px,1.5vw,14px)', height: isMobile ? 130 : 200 }}>
              {stats.eraData.map((e, i) => {
                const owned = e.count > 0
                const h = owned ? Math.max(40, (e.count / stats.maxCount) * 140) : 28
                return (
                  <button key={e.era} onClick={() => router.push(owned ? '/portfolio' : '/culture/eres')} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, height: '100%' }}>
                    {owned && <span style={{ fontFamily: FONT.display, fontSize: 12.5, fontWeight: 700, color: SNOW.ink }}>{e.count}</span>}
                    <div style={{ width: '100%', maxWidth: 64, height: h, borderRadius: '8px 8px 4px 4px', background: owned ? `linear-gradient(180deg, ${e.color}, ${e.color}B0)` : 'rgba(0,0,0,0.05)', border: owned ? 'none' : `1.5px dashed ${SNOW.borderHover}`, boxShadow: owned ? `0 6px 16px ${e.color}40` : 'none', transition: `height .8s cubic-bezier(.2,.85,.3,1) ${i * 60}ms` }} />
                    <div style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: owned ? `${e.color}1A` : 'transparent', opacity: owned ? 1 : 0.4 }}>
                      <EraIcon icon={e.icon} size={16} color={owned ? e.color : SNOW.mutedLight} />
                    </div>
                    <span style={{ fontFamily: FONT.body, fontSize: 10.5, fontWeight: 600, color: owned ? SNOW.ink : SNOW.mutedLight, textAlign: 'center', lineHeight: 1.1 }}>{e.short}</span>
                  </button>
                )
              })}
            </div>
            <div style={{ height: 2, background: `linear-gradient(90deg, ${ERA_ORDER.map(e => e.color).join(',')})`, borderRadius: 2, opacity: 0.3, margin: '0 16px' }} />
            </div>
          </Reveal>
        </>
      )}
    </div>
  )
}
