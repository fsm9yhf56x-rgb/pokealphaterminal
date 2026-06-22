'use client'

import { useRef, useState, useEffect } from 'react'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

interface HistoryPoint { date: string; price: number }
interface Point { day: string; price: number; t: number }
type Tab = '7j' | '30j' | '90j' | '1a'
interface SeriesOpt { key: string; label: string }

interface Props {
  history?: HistoryPoint[]
  /** Free : verrouille les periodes longues (90j, 1a). Defaut false. */
  lockLongRange?: boolean
  /** Si fourni : active le selecteur etat/note (refetch /api/price-series). */
  cardId?: string
  lang?: string
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted,
  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
}

function smoothPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  return d
}

export function SpotlightChart({ history, lockLongRange = false, cardId, lang }: Props) {
  const [tab, setTab] = useState<Tab>('90j')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [showUpsell, setShowUpsell] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const hasSelector = !!cardId
  const [series, setSeries] = useState<string>('NEAR_MINT')
  const [seriesLabel, setSeriesLabel] = useState<string>('Near Mint')
  const [avail, setAvail] = useState<{ raw: SeriesOpt[]; graded: SeriesOpt[] }>({ raw: [], graded: [] })
  const [fetched, setFetched] = useState<HistoryPoint[] | null>(null)
  const [sparse, setSparse] = useState(false)
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [gradedByCompany, setGradedByCompany] = useState<Record<string, Array<{ key: string; label: string; grade: string }>>>({})
  const [companies, setCompanies] = useState<string[]>([])
  const [activeCompany, setActiveCompany] = useState<string>('PSA')
  const [stateMenuOpen, setStateMenuOpen] = useState(false)
  const [noteMenuOpen, setNoteMenuOpen] = useState(false)
  // Zone active : 'raw' (etat) ou 'graded' (societe+note)
  const isGradedSeries = !['NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED'].includes(series)
  const activeZone: 'raw' | 'graded' = isGradedSeries ? 'graded' : 'raw' 

  useEffect(() => {
    if (!cardId) return
    let off = false
    setLoadingSeries(true)
    const url = `/api/price-series?card_id=${encodeURIComponent(cardId)}&lang=${encodeURIComponent(lang || '')}&series=${encodeURIComponent(series)}`
    fetch(url).then(r => r.json()).then(j => {
      if (off || j.error) { if (!off) setLoadingSeries(false); return }
      setFetched(Array.isArray(j.history) ? j.history : [])
      setSparse(!!j.sparse)
      setSeriesLabel(j.seriesLabel || series)
      if (j.availableSeries) setAvail(j.availableSeries)
      if (j.gradedByCompany) setGradedByCompany(j.gradedByCompany)
      if (Array.isArray(j.companies)) {
        setCompanies(j.companies)
        // Si la societe active n'existe pas, prend la premiere dispo
        if (j.companies.length > 0 && !j.companies.includes(activeCompany)) setActiveCompany(j.companies[0])
      }
      setLoadingSeries(false)
    }).catch(() => { if (!off) setLoadingSeries(false) })
    return () => { off = true }
  }, [cardId, lang, series])

  const sourceHistory: HistoryPoint[] = hasSelector ? (fetched || []) : (history || [])

  const points: Point[] = sourceHistory
    .map(p => ({ day: p.date, price: p.price, t: new Date(p.date).getTime() }))
    .filter(p => p.price > 0 && !Number.isNaN(p.t))
    .sort((a, b) => a.t - b.t)

  const effectiveTab: Tab = lockLongRange && (tab === '90j' || tab === '1a') ? '30j' : tab
  const days = effectiveTab === '7j' ? 7 : effectiveTab === '30j' ? 30 : effectiveTab === '90j' ? 90 : 365
  const lastT = points.length ? points[points.length - 1].t : Date.now()
  const cutoff = lastT - days * 86400000
  const filtered = points.filter(p => p.t >= cutoff)
  const used = filtered.length >= 2 ? filtered : points

  const prices = used.map(p => p.price)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const flat = used.length < 2 || max === min

  const PERIODS: Tab[] = ['7j', '30j', '90j', '1a']
  const isLocked = (t: Tab) => lockLongRange && (t === '90j' || t === '1a')

  // Helpers libelles
  const rawLabelOf = (k: string) => (avail.raw.find(o => o.key === k)?.label) || k
  const stateLabel = activeZone === 'raw' ? rawLabelOf(series) : 'Near Mint'
  const notesForCompany = gradedByCompany[activeCompany] || []
  const activeNoteKey = activeZone === 'graded' ? series : ''

  // ZONE ETAT (raw) : menu deroulant
  const zoneRaw = hasSelector && avail.raw.length > 0 ? (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 8px 6px 12px', borderRadius: 11, background: activeZone === 'raw' ? 'rgba(224,48,32,0.06)' : 'rgba(255,255,255,0.55)', border: `1px solid ${activeZone === 'raw' ? 'rgba(224,48,32,0.28)' : SNOW.border}`, transition: 'all .2s' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: activeZone === 'raw' ? '#E03020' : SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: FONT.display }}>État</span>
      <button onClick={() => setStateMenuOpen(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, background: 'transparent', border: 'none', fontSize: 12.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, cursor: 'pointer' }}>
        {stateLabel}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="2.6" style={{ transform: stateMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {stateMenuOpen ? (
        <>
          <div onClick={() => setStateMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 18 }} />
          <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, minWidth: 170, background: '#fff', borderRadius: 12, border: `1px solid ${SNOW.border}`, boxShadow: '0 12px 36px rgba(0,0,0,0.14)', zIndex: 19, padding: 6 }}>
            {avail.raw.map(o => (
              <button key={o.key} onClick={() => { setSeries(o.key); setStateMenuOpen(false); setShowUpsell(false) }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', background: series === o.key ? 'rgba(224,48,32,0.08)' : 'transparent', color: series === o.key ? '#E03020' : SNOW.ink, fontSize: 12.5, fontWeight: series === o.key ? 700 : 500, fontFamily: FONT.display, cursor: 'pointer' }}>{o.label}</button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  ) : null

  // ZONE GRADE : pills societe + menu note
  const COMPANY_COLOR: Record<string, string> = { PSA: '#E03020', CGC: '#2A6FDB', BGS: '#1D1D1F', SGC: '#0E8A5F', ACE: '#7A4FC4', TAG: '#C77700' }
  const zoneGraded = hasSelector && companies.length > 0 ? (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 11, background: activeZone === 'graded' ? 'rgba(224,48,32,0.06)' : 'rgba(255,255,255,0.55)', border: `1px solid ${activeZone === 'graded' ? 'rgba(224,48,32,0.28)' : SNOW.border}`, transition: 'all .2s', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: activeZone === 'graded' ? '#E03020' : SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '.05em', fontFamily: FONT.display }}>Gradé</span>
      <div style={{ display: 'inline-flex', gap: 3 }}>
        {companies.map(co => {
          const on = activeCompany === co
          const col = COMPANY_COLOR[co] || SNOW.muted
          return (
            <button key={co} onClick={() => {
              setActiveCompany(co)
              const notes = gradedByCompany[co] || []
              if (notes.length > 0) { setSeries(notes[0].key); setShowUpsell(false) }
            }} style={{ padding: '3px 9px', borderRadius: 7, fontSize: 11, fontWeight: 700, fontFamily: FONT.data, letterSpacing: '.02em', cursor: 'pointer', border: 'none', background: on ? col : 'rgba(0,0,0,0.04)', color: on ? '#fff' : SNOW.muted, transition: 'all .15s' }}>{co}</button>
          )
        })}
      </div>
      {notesForCompany.length > 0 ? (
        <div style={{ position: 'relative' }}>
          <button onClick={() => setNoteMenuOpen(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 7, background: 'rgba(255,255,255,0.8)', border: `1px solid ${SNOW.border}`, fontSize: 11.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data, cursor: 'pointer' }}>
            {activeNoteKey && activeCompany === (activeNoteKey.match(/^[a-z]+/i)?.[0]?.toUpperCase()) ? (notesForCompany.find(n => n.key === activeNoteKey)?.grade || 'Note') : 'Note'}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="2.6" style={{ transform: noteMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {noteMenuOpen ? (
            <>
              <div onClick={() => setNoteMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 18 }} />
              <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 6, minWidth: 90, maxHeight: 260, overflowY: 'auto', background: '#fff', borderRadius: 10, border: `1px solid ${SNOW.border}`, boxShadow: '0 12px 36px rgba(0,0,0,0.14)', zIndex: 19, padding: 5 }}>
                {notesForCompany.map(n => (
                  <button key={n.key} onClick={() => { setSeries(n.key); setNoteMenuOpen(false); setShowUpsell(false) }} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '6px 10px', borderRadius: 7, border: 'none', background: series === n.key ? 'rgba(224,48,32,0.08)' : 'transparent', color: series === n.key ? '#E03020' : SNOW.ink, fontSize: 12.5, fontWeight: series === n.key ? 700 : 500, fontFamily: FONT.data, cursor: 'pointer' }}>{n.grade}</button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  ) : null

  const periodTabs = (
    <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)', border: 'none', borderRadius: 10, padding: 3, gap: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
      {PERIODS.map(t => {
        const locked = isLocked(t)
        const active = effectiveTab === t && !locked
        return (
          <button key={t} onClick={() => { if (locked) { setShowUpsell(true); return } setShowUpsell(false); setTab(t) }} title={locked ? 'Historique long avec Pro' : undefined} style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            padding: '4px 9px', fontSize: 11, fontWeight: 500,
            color: locked ? SNOW.mutedLight : active ? SNOW.ink : SNOW.muted,
            background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
            border: 'none', borderRadius: 7, cursor: 'pointer',
            boxShadow: active ? '0 1px 4px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,1)' : 'none',
            fontFamily: FONT.display, textTransform: 'uppercase' as const,
            transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
          }}>
            {t}
            {locked ? <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> : null}
          </button>
        )
      })}
    </div>
  )

  const header = (
    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={SECTION_LABEL}>Historique de prix</div>
        <div style={{ marginLeft: 'auto' }}>{periodTabs}</div>
      </div>
      {hasSelector && (zoneRaw || zoneGraded) ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {zoneRaw}
          {zoneGraded}
        </div>
      ) : null}
    </div>
  )

  const upsellOverlay = showUpsell ? (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', borderRadius: 12, zIndex: 8, textAlign: 'center' as const, padding: '0 28px' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: '50%', background: SNOW.ink }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
      </div>
      <div style={{ fontSize: 14.5, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>Historique complet avec Pro</div>
      <div style={{ fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.45, maxWidth: 280 }}>Le plan Gratuit affiche les 30 derniers jours. Passe Pro pour voir l&apos;évolution sur 90 jours et 1 an.</div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <a href="/abonnement" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: '#E03020', color: '#fff', fontSize: 12.5, fontWeight: 700, fontFamily: FONT.display, textDecoration: 'none', boxShadow: '0 4px 14px rgba(224,48,32,0.28)' }}>
          Passer Pro
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
        <button onClick={() => setShowUpsell(false)} style={{ padding: '9px 16px', borderRadius: 10, background: 'transparent', border: `1px solid ${SNOW.border}`, color: SNOW.muted, fontSize: 12.5, fontWeight: 600, fontFamily: FONT.display, cursor: 'pointer' }}>Retour</button>
      </div>
    </div>
  ) : null

  if (hasSelector && loadingSeries) {
    return (
      <div style={{ marginTop: 0, padding: 0 }}>
        {header}
        <div style={{ marginTop: 14, height: 240, borderRadius: 12, background: SNOW.surface, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'kcPulseChart 1.2s ease-in-out infinite' }}>
          <span style={{ fontSize: 12, color: SNOW.mutedLight, fontFamily: FONT.display }}>Chargement…</span>
        </div>
        <style>{`@keyframes kcPulseChart{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      </div>
    )
  }

  if (hasSelector && sparse) {
    const pts = used.slice(-5).reverse()
    return (
      <div style={{ marginTop: 0, padding: 0 }}>
        {header}
        <div style={{ marginTop: 14, borderRadius: 12, background: SNOW.surface, padding: '24px 22px', textAlign: 'center' as const }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 5 }}>Historique en cours de construction</div>
          <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5, maxWidth: 360, margin: '0 auto 14px' }}>
            {pts.length > 0
              ? <>Encore peu de ventes enregistrées en <strong style={{ color: SNOW.ink, fontWeight: 600 }}>{seriesLabel}</strong>. La courbe s&apos;affichera à mesure qu&apos;elles s&apos;accumulent.</>
              : <>Aucune vente <strong style={{ color: SNOW.ink, fontWeight: 600 }}>{seriesLabel}</strong> enregistrée pour l&apos;instant. Les données arriveront avec les prochaines ventes.</>}
          </div>
          {pts.length > 0 ? (
            <div style={{ display: 'inline-flex', flexDirection: 'column' as const, gap: 0, background: '#fff', borderRadius: 10, border: `1px solid ${SNOW.border}`, overflow: 'hidden', minWidth: 220 }}>
              {pts.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18, padding: '9px 14px', borderBottom: i < pts.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
                  <span style={{ fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.data }}>{new Date(p.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtPrice(p.price, 'EUR')}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  if (flat) {
    return (
      <div style={{ marginTop: 0, padding: 0 }}>
        {header}
        <div style={{ position: 'relative', marginTop: 14 }}>
          {upsellOverlay}
          <div style={{ height: 200, borderRadius: 12, background: SNOW.surface, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' as const, padding: '0 24px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-5"/></svg>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: SNOW.muted, fontFamily: FONT.display }}>Pas encore assez d&apos;historique</div>
            <div style={{ fontSize: 11.5, color: SNOW.mutedLight, lineHeight: 1.4 }}>Les variations s&apos;afficheront à mesure que les ventes s&apos;accumulent.</div>
          </div>
        </div>
      </div>
    )
  }

  const minIdx = prices.indexOf(min)
  const maxIdx = prices.indexOf(max)
  const first = prices[0]
  const last = prices[prices.length - 1]
  const delta = ((last - first) / first) * 100
  const deltaAbs = last - first
  const isUp = delta >= 0
  const color = isUp ? '#00A368' : '#E03020'

  const W = 640, H = 240
  const padL = 4, padR = 14, padT = 16, padB = 26
  const plotW = W - padL - padR
  const plotH = H - padT - padB
  const xAt = (i: number) => padL + (used.length > 1 ? (i / (used.length - 1)) * plotW : 0)
  const yAt = (p: number) => padT + (1 - (p - min) / Math.max(1e-9, max - min)) * plotH

  const linePts = used.map((p, i) => ({ x: xAt(i), y: yAt(p.price) }))
  const linePath = smoothPath(linePts)
  const areaPath = linePath + ` L ${xAt(used.length - 1).toFixed(2)} ${(padT + plotH).toFixed(2)} L ${padL} ${(padT + plotH).toFixed(2)} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => min + f * (max - min))
  const xTickCount = Math.min(5, used.length)
  const xTicks = Array.from({ length: xTickCount }, (_, k) => {
    const idx = Math.round((k / Math.max(1, xTickCount - 1)) * (used.length - 1))
    return { idx, label: new Date(used[idx].day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) }
  })

  const onMove = (e: React.MouseEvent) => {
    if (!wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / rect.width
    const idx = Math.max(0, Math.min(used.length - 1, Math.round(rx * (used.length - 1))))
    setHoverIdx(idx)
  }

  const hov = hoverIdx != null ? used[hoverIdx] : null
  const hovX = hoverIdx != null ? xAt(hoverIdx) : 0
  const hovY = hov ? yAt(hov.price) : 0

  return (
    <div style={{ marginTop: 0, padding: 0 }}>
      {header}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 16, fontWeight: 600, color, fontFamily: FONT.display }}>
          <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', [isUp ? 'borderBottom' : 'borderTop']: `7px solid ${color}` } as any} />
          {isUp ? '+ ' : '- '}{Math.abs(deltaAbs).toFixed(2).replace('.', ',')} € ({isUp ? '+' : ''}{delta.toFixed(1).replace('.', ',')} %)
        </span>
        <span style={{ fontSize: 12.5, color: SNOW.mutedLight }}>sur {effectiveTab === '1a' ? '1 an' : effectiveTab} · {used.length} relevés</span>
      </div>

      <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setHoverIdx(null)} style={{ marginTop: 14, position: 'relative', cursor: showUpsell ? 'default' : 'crosshair' }}>
        {upsellOverlay}
        {hov && !showUpsell ? (
          <div style={{ position: 'absolute', left: `${(hovX / W) * 100}%`, top: -2, transform: `translateX(${hoverIdx! > used.length * 0.8 ? '-100%' : hoverIdx! < used.length * 0.2 ? '0' : '-50%'})`, background: SNOW.ink, color: '#fff', fontFamily: FONT.data, fontSize: 11.5, padding: '6px 9px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 6, pointerEvents: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.18)' }}>
            <span style={{ fontWeight: 700 }}>{fmtPrice(hov.price, 'EUR')}</span>
            <span style={{ opacity: 0.7, marginLeft: 6 }}>{new Date(hov.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: '2-digit' })}</span>
          </div>
        ) : null}

        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block', overflow: 'visible' as const }}>
          <defs>
            <linearGradient id="kcAreaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.16" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((val, i) => {
            const y = yAt(val)
            return (
              <g key={i}>
                <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={SNOW.borderSoft} strokeWidth="0.5" strokeDasharray={i === 0 || i === yTicks.length - 1 ? '0' : '3 4'} />
                <text x={W - padR + 4} y={y + 3} fontSize="9.5" fill={SNOW.mutedLight} fontFamily={FONT.data} textAnchor="start">{Math.round(val)}€</text>
              </g>
            )
          })}

          {xTicks.map((t, i) => (
            <text key={i} x={xAt(t.idx)} y={H - 8} fontSize="9.5" fill={SNOW.mutedLight} fontFamily={FONT.data} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}>{t.label}</text>
          ))}

          <path d={areaPath} fill="url(#kcAreaGrad)" />
          <path d={linePath} stroke={color} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          <circle cx={xAt(maxIdx)} cy={yAt(max)} r="3" fill={SNOW.ink} />
          <circle cx={xAt(minIdx)} cy={yAt(min)} r="3" fill={SNOW.mutedLight} />
          <circle cx={xAt(used.length - 1)} cy={yAt(last)} r="4.5" fill={color} stroke="#fff" strokeWidth="1.5" />

          {hov && !showUpsell ? (
            <g>
              <line x1={hovX} x2={hovX} y1={padT} y2={padT + plotH} stroke={SNOW.muted} strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
              <circle cx={hovX} cy={hovY} r="4.5" fill="#fff" stroke={color} strokeWidth="2.5" />
            </g>
          ) : null}
        </svg>

        <div style={{ position: 'absolute', left: `${(xAt(maxIdx) / W) * 100}%`, top: `${(yAt(max) / H) * 100}%`, transform: 'translate(-50%, -160%)', fontSize: 10, color: SNOW.ink, fontFamily: FONT.data, fontWeight: 600, whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, background: '#fff', padding: '1px 6px', borderRadius: 5, border: `0.5px solid ${SNOW.borderSoft}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: showUpsell ? 0 : 1 }}>{fmtPrice(max, 'EUR')}</div>
        <div style={{ position: 'absolute', left: `${(xAt(minIdx) / W) * 100}%`, top: `${(yAt(min) / H) * 100}%`, transform: 'translate(-50%, 60%)', fontSize: 10, color: SNOW.muted, fontFamily: FONT.data, fontWeight: 600, whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, background: '#fff', padding: '1px 6px', borderRadius: 5, border: `0.5px solid ${SNOW.borderSoft}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', opacity: showUpsell ? 0 : 1 }}>{fmtPrice(min, 'EUR')}</div>
      </div>
    </div>
  )
}
