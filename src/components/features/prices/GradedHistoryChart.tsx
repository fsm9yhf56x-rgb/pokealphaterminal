'use client'

/**
 * GradedHistoryChart — historique gradés OU raw multi-condition.
 * Source: /api/prices/graded-history (graded_prices_ppt.grades_history / raw_history).
 *
 * mode='graded' : selecteurs Societe + Note  (PSA 10, BGS 9.5, ...)
 * mode='raw'    : selecteur Etat              (Near Mint, Lightly Played, ...)
 *
 * Tout est data-driven : seules les dimensions reellement presentes s'affichent.
 * Devise = USD (PPT). Rendu SVG pur, zero dependance.
 */

import { useEffect, useMemo, useState } from 'react'

const SNOW = {
  bg: '#FFFFFF', surface: '#F5F5F7', borderSoft: '#E5E5EA', borderMid: '#C7C7CC',
  ink: '#1D1D1F', muted: '#6E6E73', dim: '#86868B', accent: '#E03020',
  accentSoft: 'rgba(224,48,32,0.06)', green: '#1D9E75', red: '#E03020',
} as const

const MIN_POINTS = 5

interface Pt { date: string; price: number }
interface GradedSeries { key: string; company: string; grade: string; points: Pt[] }
interface RawSeries { key: string; variant: string; condition: string; points: Pt[] }

interface ApiResp {
  currency: string
  dimensions: {
    companies?: string[]
    grades?: Record<string, string[]>
    conditions?: string[]
    variants?: string[]
  }
  series: any[]
  _info?: string
}

export interface GradedHistoryChartProps {
  setId?: string | null
  localId?: string | null
  tcgCardId?: string | null
  mode?: 'graded' | 'raw'
  isPro?: boolean
  /** Rendu (placeholder vert) quand pas de data. Si fourni, prioritaire. */
  fallback?: React.ReactNode
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—'
  if (Math.abs(n) >= 1000) return `$${Math.round(n / 100) / 10}k`
  return `$${n.toFixed(2)}`
}
function fmtFull(n: number | null | undefined): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
function pct(from: number | null, to: number | null): { text: string; color: string } {
  if (from == null || to == null || from === 0) return { text: '—', color: SNOW.muted }
  const v = ((to - from) / from) * 100
  const sign = v > 0 ? '+' : ''
  return { text: `${sign}${v.toFixed(1)}%`, color: v > 0 ? SNOW.green : v < 0 ? SNOW.red : SNOW.muted }
}
function niceTicks(min: number, max: number, count = 3): number[] {
  if (!isFinite(min) || !isFinite(max) || min === max) return [min]
  const step = (max - min) / count
  return Array.from({ length: count + 1 }, (_, i) => min + step * i)
}

// ── Pill selector (segment control glass v7) ──
function PillSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: SNOW.surface, borderRadius: 7, padding: 3, flexWrap: 'wrap' }}>
      {options.map(o => {
        const active = o === value
        return (
          <button key={o} onClick={() => onChange(o)}
            style={{
              padding: '4px 11px', border: 0, borderRadius: 5,
              background: active ? SNOW.bg : 'transparent',
              color: active ? SNOW.ink : SNOW.muted,
              fontWeight: active ? 700 : 600, fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              boxShadow: active ? `0 1px 3px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)` : 'none',
              transition: 'all .15s cubic-bezier(.2,.85,.3,1)', letterSpacing: '-0.01em',
            }}>{o}</button>
        )
      })}
    </div>
  )
}

// ── SVG chart body ──
function ChartSVG({ points }: { points: Pt[] }) {
  const [hover, setHover] = useState<{ x: number; y: number; price: number; date: string } | null>(null)
  const { path, areaPath, dots, xLabels, yLabels, bounds } = useMemo(() => {
    const VB = { w: 300, h: 130 }
    const PAD = { left: 30, right: 5, top: 8, bottom: 18 }
    const innerW = VB.w - PAD.left - PAD.right
    const innerH = VB.h - PAD.top - PAD.bottom
    const prices = points.map(p => p.price)
    const minP = Math.min(...prices), maxP = Math.max(...prices)
    const range = maxP - minP || 1, padR = range * 0.15
    const yMin = Math.max(0, minP - padR), yMax = maxP + padR
    const n = points.length
    const xFor = (i: number) => PAD.left + (innerW * i) / Math.max(1, n - 1)
    const yFor = (pr: number) => PAD.top + innerH - ((pr - yMin) / (yMax - yMin)) * innerH
    const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.price), price: p.price, date: p.date }))
    const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x},${c.y}`).join(' ')
    const areaPath = path + ` L ${coords[coords.length - 1].x},${PAD.top + innerH} L ${coords[0].x},${PAD.top + innerH} Z`
    const yLabels = niceTicks(yMin, yMax, 3).map(v => ({ y: yFor(v), text: fmt(v) }))
    const xIdx = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
    const xLabels = xIdx.map(i => ({ x: xFor(i), text: fmtDate(points[i].date) }))
    return { path, areaPath, dots: coords, xLabels, yLabels, bounds: { yMin, yMax, PAD, innerW, innerH, VB } }
  }, [points])

  const onMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xVB = ((e.clientX - rect.left) / rect.width) * bounds.VB.w
    let near = dots[0], nd = Math.abs(dots[0].x - xVB)
    for (const d of dots) { const dist = Math.abs(d.x - xVB); if (dist < nd) { near = d; nd = dist } }
    setHover(near)
  }

  return (
    <div style={{ height: 150, position: 'relative', marginBottom: 6 }}>
      <svg viewBox="0 0 300 130" width="100%" height="130" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
        {yLabels.map((yl, i) => (<text key={'yt' + i} x="2" y={yl.y + 3} fontFamily="var(--font-data, monospace)" fontSize="8" fill={SNOW.dim}>{yl.text}</text>))}
        {yLabels.map((yl, i) => (
          <line key={'yl' + i} x1={bounds.PAD.left} y1={yl.y} x2={bounds.VB.w - bounds.PAD.right} y2={yl.y}
            stroke={i === 0 || i === yLabels.length - 1 ? SNOW.borderMid : SNOW.borderSoft} strokeWidth="0.5"
            strokeDasharray={i === 0 || i === yLabels.length - 1 ? undefined : '1,3'} />
        ))}
        <path d={areaPath} fill={SNOW.accentSoft} />
        <path d={path} stroke={SNOW.accent} strokeWidth="1.5" fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {dots.map((d, i) => {
          const last = i === dots.length - 1
          return (<g key={'d' + i}>{last && <circle cx={d.x} cy={d.y} r="6" fill={SNOW.accent} fillOpacity="0.15" />}<circle cx={d.x} cy={d.y} r={last ? 2.5 : 1.5} fill={SNOW.accent} /></g>)
        })}
        {hover && (
          <g>
            <line x1={hover.x} y1={bounds.PAD.top} x2={hover.x} y2={bounds.VB.h - bounds.PAD.bottom} stroke={SNOW.borderMid} strokeWidth="0.5" strokeDasharray="2,2" />
            <circle cx={hover.x} cy={hover.y} r="4" fill={SNOW.bg} stroke={SNOW.accent} strokeWidth="1.5" />
          </g>
        )}
        {xLabels.map((xl, i) => (
          <text key={'xl' + i} x={xl.x} y={bounds.VB.h - 4} fontFamily="var(--font-data, monospace)" fontSize="8" fill={SNOW.dim}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}>{xl.text}</text>
        ))}
        <rect x={bounds.PAD.left} y={bounds.PAD.top} width={bounds.innerW} height={bounds.innerH} fill="transparent"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }} />
      </svg>
      {hover && (
        <div style={{
          position: 'absolute', left: `${(hover.x / bounds.VB.w) * 100}%`, top: 0, transform: 'translate(-50%,-100%)',
          background: SNOW.ink, color: SNOW.bg, fontFamily: 'var(--font-data, monospace)', fontSize: 10,
          padding: '4px 8px', borderRadius: 4, whiteSpace: 'nowrap', pointerEvents: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontWeight: 500 }}>{fmtFull(hover.price)}</div>
          <div style={{ color: SNOW.dim, fontSize: 9 }}>{fmtDate(hover.date)}</div>
        </div>
      )}
    </div>
  )
}

// ── Main ──
export function GradedHistoryChart({ setId, localId, tcgCardId, mode = 'graded', isPro = false, fallback }: GradedHistoryChartProps) {
  const [resp, setResp] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<string>('')
  const [grade, setGrade] = useState<string>('')
  const [condition, setCondition] = useState<string>('')

  const qs = useMemo(() => {
    const p = new URLSearchParams()
    p.set('mode', mode)
    if (tcgCardId) p.set('tcg_card_id', tcgCardId)
    else if (setId && localId) {
      // calque /api/prices/graded : tcg_card_id = "{setId}-{localId}", resolu serveur-side
      p.set('tcg_card_id', `${setId}-${localId}`)
    }
    return p.toString()
  }, [setId, localId, tcgCardId, mode])

  useEffect(() => {
    let alive = true
    setLoading(true); setResp(null)
    fetch(`/api/prices/graded-history?${qs}`, { cache: 'default' })
      .then(r => r.json())
      .then(d => { if (alive) { setResp(d); setLoading(false) } })
      .catch(() => { if (alive) { setResp(null); setLoading(false) } })
    return () => { alive = false }
  }, [qs])

  // Init selecteurs sur premiere valeur dispo
  useEffect(() => {
    if (!resp) return
    if (mode === 'graded') {
      const comps = resp.dimensions?.companies || []
      const c = comps.includes(company) ? company : comps[0] || ''
      if (c !== company) setCompany(c)
      const grds = (resp.dimensions?.grades || {})[c] || []
      // PSA 10 par defaut si dispo
      const preferred = grds.includes('10') ? '10' : grds[0] || ''
      if (!grds.includes(grade)) setGrade(preferred)
    } else {
      const conds = resp.dimensions?.conditions || []
      if (!conds.includes(condition)) setCondition(conds.includes('Near Mint') ? 'Near Mint' : conds[0] || '')
    }
  }, [resp, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Quand on change de societe, re-defaut la note
  useEffect(() => {
    if (mode !== 'graded' || !resp) return
    const grds = (resp.dimensions?.grades || {})[company] || []
    if (!grds.includes(grade)) setGrade(grds.includes('10') ? '10' : grds[0] || '')
  }, [company]) // eslint-disable-line react-hooks/exhaustive-deps

  const activePoints: Pt[] = useMemo(() => {
    if (!resp) return []
    if (mode === 'graded') {
      const s = (resp.series as GradedSeries[]).find(x => x.company === company && x.grade === grade)
      return s?.points || []
    }
    // raw : agrege toutes variants pour la condition (max prix par date)
    const byDate = new Map<string, number>()
    for (const s of resp.series as RawSeries[]) {
      if (s.condition !== condition) continue
      for (const p of s.points) byDate.set(p.date, Math.max(byDate.get(p.date) ?? 0, p.price))
    }
    return Array.from(byDate.entries()).map(([date, price]) => ({ date, price })).sort((a, b) => (a.date < b.date ? -1 : 1))
  }, [resp, mode, company, grade, condition])

  const hasDimensions = mode === 'graded'
    ? (resp?.dimensions?.companies?.length ?? 0) > 0
    : (resp?.dimensions?.conditions?.length ?? 0) > 0

  // Loading
  if (loading) {
    return (
      <div style={{ height: 200, borderRadius: 10, background: `linear-gradient(90deg, ${SNOW.surface} 25%, ${SNOW.bg} 50%, ${SNOW.surface} 75%)`, backgroundSize: '200% 100%', animation: 'pka-shimmer 1.5s ease-in-out infinite' }}>
        <style>{`@keyframes pka-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    )
  }

  // Pas de data exploitable -> fallback (placeholder vert)
  if (!resp || !hasDimensions || activePoints.length < MIN_POINTS) {
    return <>{fallback ?? <div style={{ padding: 20, textAlign: 'center', color: SNOW.muted, fontSize: 12, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>Pas encore assez de données historiques.</div>}</>
  }

  const current = activePoints[activePoints.length - 1].price
  const ath = Math.max(...activePoints.map(p => p.price))
  const atl = Math.min(...activePoints.map(p => p.price))
  const now = Date.now()
  const findNear = (daysAgo: number) => {
    const t = now - daysAgo * 864e5
    let best: Pt | null = null, bd = Infinity
    for (const p of activePoints) { const diff = Math.abs(new Date(p.date).getTime() - t); if (diff < bd) { bd = diff; best = p } }
    return best?.price ?? null
  }
  const c7 = pct(findNear(7), current)
  const c30 = pct(findNear(30), current)

  const grades = mode === 'graded' ? ((resp.dimensions?.grades || {})[company] || []) : []
  const companies = resp.dimensions?.companies || []
  const conditions = resp.dimensions?.conditions || []

  return (
    <div style={{
      background: SNOW.bg, border: `0.5px solid ${SNOW.borderSoft}`, borderRadius: 10, padding: 16,
      fontFamily: 'var(--font-sans, system-ui)', color: SNOW.ink, animation: 'pka-fade-in 300ms ease-out',
    }}>
      <style>{`@keyframes pka-fade-in { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Selecteurs */}
      {mode === 'graded' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 8.5, color: SNOW.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>Société</div>
            <PillSelect options={companies} value={company} onChange={setCompany} />
          </div>
          <div>
            <div style={{ fontSize: 8.5, color: SNOW.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>Note</div>
            <PillSelect options={grades} value={grade} onChange={setGrade} />
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 8.5, color: SNOW.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 5, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>État</div>
          <PillSelect options={conditions} value={condition} onChange={setCondition} />
        </div>
      )}

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: '-0.015em' }}>{fmtFull(current)}</span>
        <span style={{ fontSize: 12, color: c30.color, fontFamily: 'var(--font-data, monospace)', fontWeight: 500 }}>{c30.text}</span>
        <span style={{ fontSize: 10, color: SNOW.muted, fontFamily: 'var(--font-data, monospace)' }}>30d</span>
      </div>
      <div style={{ fontSize: 10, color: SNOW.muted, fontFamily: 'var(--font-data, monospace)', marginBottom: 12 }}>
        {mode === 'graded' ? `${company} ${grade}` : condition} · {activePoints.length} points
      </div>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: `0.5px solid ${SNOW.borderSoft}`, borderBottom: `0.5px solid ${SNOW.borderSoft}`, marginBottom: 12 }}>
        {[
          { label: 'Var 7j', value: c7.text, color: c7.color },
          { label: 'Var 30j', value: c30.text, color: c30.color },
          { label: 'ATH', value: fmt(ath), color: SNOW.ink },
          { label: 'ATL', value: fmt(atl), color: SNOW.ink },
        ].map((c, i) => (
          <div key={c.label} style={{ padding: '8px 6px', borderRight: i < 3 ? `0.5px solid ${SNOW.borderSoft}` : 'none', fontFamily: 'var(--font-data, monospace)' }}>
            <div style={{ fontSize: 8, color: SNOW.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 2 }}>{c.label}</div>
            <div style={{ fontSize: 12, fontWeight: 500, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <ChartSVG points={activePoints} />

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTop: `0.5px dashed ${SNOW.borderSoft}`, marginTop: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 5, height: 5, background: SNOW.accent, borderRadius: '50%' }} />
          <span style={{ fontSize: 9, color: SNOW.muted, fontFamily: 'var(--font-data, monospace)' }}>{mode === 'graded' ? 'graded sold avg' : 'tcgplayer market'}</span>
        </div>
        <span style={{ fontSize: 9, color: SNOW.dim, fontFamily: 'var(--font-data, monospace)' }}>USD · PokeTrace</span>
      </div>
    </div>
  )
}

export default GradedHistoryChart
