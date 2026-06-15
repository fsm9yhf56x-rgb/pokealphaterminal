'use client'

import { useRef, useState } from 'react'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

interface HistoryPoint { date: string; price: number }
interface Point { day: string; price: number }
type Tab = '7j' | '30j' | '90j' | '1a'

interface Props {
  history?: HistoryPoint[]
}

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted,
  textTransform: 'uppercase' as const, letterSpacing: '0.08em',
}

export function SpotlightChart({ history }: Props) {
  const [tab, setTab] = useState<Tab>('30j')
  const [tooltip, setTooltip] = useState<{ x: number; price: number; day: string } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  const points: Point[] = (history || []).map(p => ({ day: p.date, price: p.price })).filter(p => p.price > 0)

  const days = tab === '7j' ? 7 : tab === '30j' ? 30 : tab === '90j' ? 90 : 365
  const cutoff = Date.now() - days * 86400000
  const filtered = points.filter(p => new Date(p.day).getTime() >= cutoff)
  const used = filtered.length >= 2 ? filtered : points

  const prices = used.map(p => p.price)
  const min = prices.length ? Math.min(...prices) : 0
  const max = prices.length ? Math.max(...prices) : 0
  const flat = used.length < 2 || max === min

  const periodTabs = (
    <div style={{ marginLeft: 'auto', display: 'inline-flex', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)', border: 'none', borderRadius: 10, padding: 3, gap: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
      {(['7j', '30j', '90j', '1a'] as Tab[]).map(t => (
        <button key={t} onClick={() => setTab(t)} style={{
          padding: '4px 9px', fontSize: 11, fontWeight: 500,
          color: tab === t ? SNOW.ink : SNOW.muted,
          background: tab === t ? 'rgba(255,255,255,0.95)' : 'transparent',
          border: 'none', borderRadius: 7, cursor: 'pointer',
          boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,1)' : 'none',
          fontFamily: FONT.display, textTransform: 'uppercase' as const,
          transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
        }}>{t}</button>
      ))}
    </div>
  )

  if (flat) {
    return (
      <div style={{ marginTop: 0, padding: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={SECTION_LABEL}>Historique de prix</div>
          {periodTabs}
        </div>
        <div style={{ marginTop: 12, height: 110, borderRadius: 10, background: SNOW.surface, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center' as const, padding: '0 24px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m7 14 3-3 3 3 5-5"/></svg>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: SNOW.muted, fontFamily: FONT.display }}>Pas encore assez d&apos;historique</div>
          <div style={{ fontSize: 11.5, color: SNOW.mutedLight, lineHeight: 1.4 }}>Les variations s&apos;afficheront à mesure que les ventes s&apos;accumulent.</div>
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

  const W = 600, H = 110, pad = 10
  const xStep = used.length > 1 ? W / (used.length - 1) : 0
  const yScale = (p: number) => H - pad - ((p - min) / Math.max(1, max - min)) * (H - 2 * pad)
  const linePath = used.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * xStep).toFixed(1)} ${yScale(p.price).toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L ${W} ${H} L 0 ${H} Z`
  const isUp = delta >= 0
  const color = isUp ? '#00A368' : '#E03020'

  const onMove = (e: React.MouseEvent) => {
    if (wrapRef.current === null) return
    const rect = wrapRef.current.getBoundingClientRect()
    const rx = (e.clientX - rect.left) / rect.width
    const idx = Math.max(0, Math.min(used.length - 1, Math.round(rx * (used.length - 1))))
    const pt = used[idx]
    setTooltip({ x: idx * xStep / W * 100, price: pt.price, day: new Date(pt.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) })
  }

  const gridLines = [0.25, 0.5, 0.75]

  return (
    <div style={{ marginTop: 0, padding: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={SECTION_LABEL}>Historique de prix</div>
        {periodTabs}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 7, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 15, fontWeight: 600, color, fontFamily: FONT.display }}>
          <span style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', [isUp ? 'borderBottom' : 'borderTop']: `7px solid ${color}` } as any} />
          {isUp ? '+ ' : '- '}{Math.abs(deltaAbs).toFixed(2).replace('.', ',')} € ({isUp ? '+' : ''}{delta.toFixed(1).replace('.', ',')} %)
        </span>
        <span style={{ fontSize: 12.5, color: SNOW.mutedLight }}>en {tab === '1a' ? '1 an' : tab}</span>
      </div>

      <div ref={wrapRef} onMouseMove={onMove} onMouseLeave={() => setTooltip(null)} style={{ marginTop: 10, position: 'relative', cursor: 'crosshair' }}>
        {tooltip ? (
          <div style={{ position: 'absolute', left: `${tooltip.x}%`, top: -4, transform: 'translateX(-50%)', background: SNOW.ink, color: '#fff', fontFamily: FONT.data, fontSize: 11, padding: '5px 8px', borderRadius: 6, whiteSpace: 'nowrap', zIndex: 5, pointerEvents: 'none' }}>
            {fmtPrice(tooltip.price, 'EUR')} · {tooltip.day}
          </div>
        ) : null}
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: 110, display: 'block', overflow: 'visible' as const }}>
          <defs>
            <linearGradient id="kcGradV6" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.18" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {gridLines.map((g, i) => (
            <line key={i} x1="0" x2={W} y1={H * g} y2={H * g} stroke={SNOW.borderSoft} strokeWidth="0.5" strokeDasharray="3 4" />
          ))}
          <path d={areaPath} fill="url(#kcGradV6)" />
          <path d={linePath} stroke={color} strokeWidth="2" fill="none" />
          <circle cx={maxIdx * xStep} cy={yScale(max)} r="3" fill={SNOW.ink} />
          <circle cx={minIdx * xStep} cy={yScale(min)} r="3" fill={SNOW.muted} />
          <circle cx={(used.length - 1) * xStep} cy={yScale(last)} r="5" fill={color} />
        </svg>
        <div style={{ position: 'absolute', left: `${(maxIdx / Math.max(1, used.length - 1)) * 100}%`, top: -2, transform: 'translateX(-50%) translateY(-100%)', fontSize: 10, color: SNOW.ink, fontFamily: FONT.data, fontWeight: 500, whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, background: '#fff', padding: '1px 5px', borderRadius: 4, border: `0.5px solid ${SNOW.borderSoft}` }}>↑ {fmtPrice(max, 'EUR')}</div>
        <div style={{ position: 'absolute', left: `${(minIdx / Math.max(1, used.length - 1)) * 100}%`, bottom: -2, transform: 'translateX(-50%) translateY(100%)', fontSize: 10, color: SNOW.muted, fontFamily: FONT.data, fontWeight: 500, whiteSpace: 'nowrap' as const, pointerEvents: 'none' as const, background: '#fff', padding: '1px 5px', borderRadius: 4, border: `0.5px solid ${SNOW.borderSoft}` }}>↓ {fmtPrice(min, 'EUR')}</div>
      </div>
    </div>
  )
}
