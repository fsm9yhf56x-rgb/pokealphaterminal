'use client'

import { useEffect, useState } from 'react'
import { SNOW, FONT } from '../snowTokens'

interface Variant { psa_spec_id: string; grades: Record<string, number>; total: number }

const SHOWN_GRADES = ['10', '9.5', '9', '8.5', '8', '7', '6', '5']

export function SpotlightPopReport({ cardId }: { cardId: string }) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSpec, setSelectedSpec] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/pop-report?card_id=${encodeURIComponent(cardId)}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        const v = j?.variants || []
        setVariants(v)
        if (v[0]) setSelectedSpec(v[0].psa_spec_id)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId])

  if (loading || variants.length === 0) return null

  const sel = variants.find(v => v.psa_spec_id === selectedSpec) || variants[0]
  const grandTotal = variants.reduce((s, v) => s + v.total, 0)

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>Population Report</h2>
        <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data }}>{grandTotal.toLocaleString('fr-FR')} gradés totaux</span>
      </div>
      <div style={{ background: SNOW.bg, border: `0.5px solid ${SNOW.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {/* Variant tabs */}
        {variants.length > 1 ? (
          <div style={{ display: 'flex', gap: 4, padding: '10px 14px', borderBottom: `0.5px solid ${SNOW.borderSoft}`, overflowX: 'auto' }}>
            {variants.map(v => (
              <button key={v.psa_spec_id} onClick={() => setSelectedSpec(v.psa_spec_id)} style={{
                padding: '4px 10px', fontSize: 11, borderRadius: 6, fontFamily: FONT.display, fontWeight: 500,
                background: v.psa_spec_id === sel.psa_spec_id ? SNOW.ink : SNOW.surface,
                color: v.psa_spec_id === sel.psa_spec_id ? SNOW.bg : SNOW.ink,
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
                Spec {v.psa_spec_id} · {v.total.toLocaleString('fr-FR')}
              </button>
            ))}
          </div>
        ) : null}
        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${SHOWN_GRADES.length}, 1fr)`, gap: 0 }}>
          <div style={{ fontSize: 10, color: SNOW.muted, padding: '8px 14px', fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, borderBottom: `0.5px solid ${SNOW.borderSoft}` }}>PSA</div>
          {SHOWN_GRADES.map(g => (
            <div key={g} style={{ fontSize: 10, color: SNOW.muted, padding: '8px 4px', textAlign: 'center', fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, borderBottom: `0.5px solid ${SNOW.borderSoft}` }}>{g}</div>
          ))}
          <div style={{ fontSize: 11, color: SNOW.ink, padding: '10px 14px', fontWeight: 500, display: 'flex', alignItems: 'center' }}>PSA</div>
          {SHOWN_GRADES.map(g => {
            const count = sel.grades[g] || 0
            const pct = sel.total > 0 ? (count / sel.total) * 100 : 0
            const intensity = Math.min(1, count / Math.max(...Object.values(sel.grades)))
            const bg = count === 0 ? 'transparent' : `rgba(39, 80, 10, ${0.08 + intensity * 0.45})`
            const color = intensity > 0.6 ? SNOW.bg : SNOW.ink
            return (
              <div key={g} title={`PSA ${g} · ${count.toLocaleString('fr-FR')} cartes · ${pct.toFixed(2)}%`} style={{
                padding: '10px 4px', textAlign: 'center' as const, fontSize: 11, fontFamily: FONT.data,
                background: bg, color, fontWeight: 500,
              }}>
                {count > 0 ? count.toLocaleString('fr-FR') : '—'}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
