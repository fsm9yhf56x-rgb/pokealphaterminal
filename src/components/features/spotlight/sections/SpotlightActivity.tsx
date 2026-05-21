'use client'

import { useEffect, useState } from 'react'
import { SNOW, FONT, fmtPrice, fmtRelative } from '../snowTokens'

interface ActivityEvent {
  kind: 'PRICE_UPDATE' | 'GRADED_DETECTED' | 'ALPHA_SIGNAL'
  variant?: string
  condition?: string | null
  source?: string
  price?: number
  currency?: string
  ts: string
  meta?: any
}

export function SpotlightActivity({ cardId }: { cardId: string }) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/activity?card_id=${encodeURIComponent(cardId)}&limit=8`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        setEvents(j?.events || [])
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId])

  if (loading || events.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>Activité du marché</h2>
        <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data }}>{events.length} événements</span>
      </div>
      <div style={{ background: SNOW.bg, border: `0.5px solid ${SNOW.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {events.map((e, i) => {
          const badge = e.kind === 'GRADED_DETECTED'
            ? { label: 'GRADED', bg: SNOW.pink, color: SNOW.pinkDark }
            : e.kind === 'ALPHA_SIGNAL'
            ? { label: 'ALPHA', bg: SNOW.purple, color: SNOW.purpleDark }
            : { label: 'PRICE', bg: SNOW.blueLight, color: SNOW.blueDark }
          const title = e.kind === 'ALPHA_SIGNAL'
            ? `Signal Alpha · ${e.meta?.tier || ''} · ${e.meta?.reason || ''}`
            : `${e.variant?.toUpperCase().replace('_', ' ')} · ${e.condition ? e.condition.replace(/_/g, ' ').toLowerCase() : ''}`
          return (
            <div key={i} style={{ padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: i < events.length - 1 ? `0.5px solid ${SNOW.borderSoft}` : 'none' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 11, color: SNOW.mutedLight, display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ padding: '2px 6px', background: badge.bg, color: badge.color, borderRadius: 4, fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: FONT.data }}>{badge.label}</span>
                  <span>{fmtRelative(e.ts)}</span>
                  {e.source ? <span>· {e.source}</span> : null}
                </div>
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT.data }}>
                {e.price != null ? fmtPrice(e.price, e.currency || 'EUR') : (e.meta?.target ? fmtPrice(e.meta.target, 'EUR') : '—')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
