'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { PerfAggregates } from './Performance'

import { useAuth } from '@/lib/useAuth'

const PERIODS = ['7J', '1M', '3M', '6M', '1A', 'Tout'] as const
// Plan Free: historique plafonne a 30j (verrou serveur dans /api/portfolio/history).
const FREE_PERIODS: readonly string[] = ['7J', '1M']
type Period = typeof PERIODS[number]

type HistPoint = { day: string; value: number; cost: number }

/**
 * Line chart Recharts : valeur reelle du portfolio dans le temps.
 * Source : /api/portfolio/history (snapshots quotidiens).
 * Si < 2 points : ligne plate au niveau de la valeur actuelle (historique en construction).
 */
export function PerfChart({ agg }: { agg: PerfAggregates }) {
  const { isPro } = useAuth() as any
  const [period, setPeriod] = useState<Period>('1M')
  const [upsell, setUpsell] = useState(false)
  const [points, setPoints] = useState<HistPoint[]>([])
  const [enough, setEnough] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(`/api/portfolio/history?period=${period}`)
      .then(r => r.ok ? r.json() : { points: [], hasEnoughData: false })
      .then(d => { if (alive) { setPoints(d.points || []); setEnough(!!d.hasEnoughData) } })
      .catch(() => { if (alive) { setPoints([]); setEnough(false) } })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [period])

  const isUp = agg.totalGain >= 0

  const chartData = useMemo(() => {
    if (enough && points.length >= 2) {
      return points.map(p => ({ label: formatDayLabel(p.day), value: Math.round(p.value) }))
    }
    // ligne plate : 2 points a la valeur actuelle
    return [
      { label: 'Début', value: Math.round(agg.totalValue) },
      { label: "Aujourd'hui", value: Math.round(agg.totalValue) },
    ]
  }, [enough, points, agg.totalValue])

  const lineColor = !enough ? '#AEAEB2' : (isUp ? '#1D9E75' : '#E03020')

  return (
    <div>
      <SectionTitle>Évolution de la valeur</SectionTitle>

      <div style={{
        background: 'rgba(255,255,255,0.65)',
        backdropFilter: 'blur(14px) saturate(180%)',
        WebkitBackdropFilter: 'blur(14px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.05)',
        borderRadius: 16,
        padding: 22,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <LegendItem color={!enough ? '#AEAEB2' : (isUp ? '#1D9E75' : '#E03020')} label="Mon portfolio" />
            <LegendItem color="#AEAEB2" label="Coût d'acquisition" dashed />
          </div>
          <div style={{ position: 'relative' }}>
            <PeriodSelector
              value={period}
              locked={isPro ? [] : PERIODS.filter(p => !FREE_PERIODS.includes(p))}
              onChange={(p) => {
                if (!isPro && !FREE_PERIODS.includes(p)) { setUpsell(true); return }
                setUpsell(false); setPeriod(p)
              }}
            />
            {upsell && (
              <a href="/abonnement" style={{
                position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20,
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(29,29,31,0.92)',
                backdropFilter: 'blur(16px) saturate(180%)',
                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                color: 'rgba(255,255,255,0.95)', fontSize: 12, fontWeight: 600,
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                textDecoration: 'none', whiteSpace: 'nowrap' as const,
                boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                Historique complet avec Pro
                <span style={{ color: '#FF7A6E', fontWeight: 700 }}>→</span>
              </a>
            )}
          </div>
        </div>

        <div style={{ width: '100%', height: '240px', opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="#F0F0F0" strokeDasharray="0" vertical={false} />
              <XAxis
                dataKey="label" stroke="#AEAEB2" fontSize={10}
                tickLine={false} axisLine={false}
                style={{ fontFamily: 'var(--font-display)' }}
              />
              <YAxis
                stroke="#AEAEB2" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={v => formatEURcompact(v)} width={48}
                style={{ fontFamily: 'var(--font-data, var(--font-display))' }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E5E5EA', strokeDasharray: '4 4' }} />
              {agg.totalCost > 0 && (
                <ReferenceLine y={agg.totalCost} stroke="#AEAEB2" strokeDasharray="4 4" strokeWidth={1.5} />
              )}
              <Line
                type="monotone" dataKey="value"
                stroke={lineColor} strokeWidth={2.5}
                strokeDasharray={enough ? undefined : '6 5'}
                dot={enough ? { r: 3, fill: lineColor, strokeWidth: 0 } : false}
                activeDot={enough ? { r: 5, strokeWidth: 2, stroke: 'var(--surface)' } : false}
                isAnimationActive={true} animationDuration={400}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {!enough && (
          <div style={{
            marginTop: 14, padding: '10px 14px',
            background: 'rgba(255,255,255,0.55)',
            backdropFilter: 'blur(10px) saturate(180%)',
            WebkitBackdropFilter: 'blur(10px) saturate(180%)',
            border: '1px solid rgba(0,0,0,0.04)', borderRadius: 9,
            fontSize: 10.5, color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
          }}>
            <strong style={{ color: '#1D1D1F' }}>Ta courbe se construit :</strong> la valeur
            de ton portfolio est enregistrée chaque jour. Reviens demain pour voir
            l'évolution réelle apparaître.
          </div>
        )}
      </div>
    </div>
  )
}

function formatDayLabel(day: string): string {
  // day = 'YYYY-MM-DD' -> 'JJ/MM'
  const [, m, d] = day.split('-')
  return `${d}/${m}`
}

function PeriodSelector({ value, onChange, locked = [] }: { value: Period; onChange: (p: Period) => void; locked?: readonly string[] }) {
  return (
    <div style={{
      display: 'flex', gap: 2,
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      border: '1px solid rgba(0,0,0,0.04)', borderRadius: 9, padding: 3,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.75)',
    }}>
      {PERIODS.map(p => {
        const active = value === p
        const isLocked = locked.includes(p)
        return (
          <button key={p} onClick={() => onChange(p)} style={{
            padding: '6px 14px', borderRadius: 999, border: 'none',
            background: active ? 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.75) 100%)' : 'transparent',
            color: active ? '#1D1D1F' : '#86868B',
            fontSize: 11.5, fontWeight: active ? 600 : 500, cursor: 'pointer',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
            boxShadow: active ? '0 2px 8px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 4,
            opacity: isLocked ? 0.55 : 1,
          }}
            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.color = '#1D1D1F' } }}
            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#86868B' } }}
          >
            {p}
            {isLocked && (
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            )}
          </button>
        )
      })}
    </div>
  )
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{
        width: '14px', height: '2px',
        background: dashed ? 'transparent' : color,
        borderTop: dashed ? `1.5px dashed ${color}` : 'none',
        borderRadius: '2px',
      }} />
      <span style={{ fontSize: 11.5, color: '#86868B', fontFamily: 'var(--font-sora, Sora, sans-serif)', fontWeight: 500 }}>{label}</span>
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255,255,255,0.6)', borderRadius: 10,
      padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
      fontFamily: 'var(--font-sora, Sora, sans-serif)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1D1D1F', fontFamily: 'var(--font-data, "Space Mono", monospace)' }}>{formatEUR(p.value)}</div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#C42E1F', flexShrink: 0 }} />
      <span style={{ fontSize: 10.5, fontWeight: 600, color: '#86868B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)' }} />
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v)
}

function formatEURcompact(v: number): string {
  if (v >= 1_000_000) return `€${Number(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `€${Number(v / 1_000).toFixed(1)}K`
  return `€${v.toFixed(0)}`
}
