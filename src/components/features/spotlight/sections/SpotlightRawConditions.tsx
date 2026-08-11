'use client'

import type { PriceEntry } from '../useSpotlightData'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

const COND_ORDER = ['NEAR_MINT', 'EXCELLENT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED']
const COND_SHORT: Record<string, string> = { NEAR_MINT: 'NM', EXCELLENT: 'EX', LIGHTLY_PLAYED: 'GD', MODERATELY_PLAYED: 'LP', HEAVILY_PLAYED: 'PL', DAMAGED: 'PO' }
const COND_LABEL: Record<string, string> = { NEAR_MINT: 'Near Mint', EXCELLENT: 'Excellent', LIGHTLY_PLAYED: 'Good', MODERATELY_PLAYED: 'Light Played', HEAVILY_PLAYED: 'Played', DAMAGED: 'Poor' }

export function SpotlightRawConditions({ ebayRows }: { ebayRows: PriceEntry[] }) {
  const byCond: Record<string, PriceEntry> = {}
  for (const r of ebayRows) {
    if (r.condition && COND_ORDER.includes(r.condition)) {
      byCond[r.condition] = r
    }
  }
  const present = COND_ORDER.filter(c => byCond[c])
  if (present.length === 0) return null

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>Prix par condition · Raw</h2>
        <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data }}>eBay sold</span>
      </div>
      <div style={{ background: SNOW.bg, border: `0.5px solid ${SNOW.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {present.map((cond, i) => {
          const r = byCond[cond]
          return (
            <div key={cond} style={{ display: 'grid', gridTemplateColumns: '70px 1fr auto auto', gap: 12, alignItems: 'center', padding: '11px 16px', borderBottom: i < present.length - 1 ? `0.5px solid ${SNOW.borderSoft}` : 'none' }}>
              <span style={{ padding: '3px 8px', background: SNOW.surface, color: SNOW.ink, fontSize: 11, fontWeight: 500, borderRadius: 6, textAlign: 'center', fontFamily: FONT.data }}>{COND_SHORT[cond]}</span>
              <span style={{ fontSize: 12, color: SNOW.mutedLight }}>{COND_LABEL[cond]}{r.nb_sales ? ` · ${r.nb_sales} ventes` : ''}</span>
              <span style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, padding: '2px 6px', background: SNOW.surface, borderRadius: 4 }}>eBay sold</span>
              <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT.data, textAlign: 'right' as const }}>{fmtPrice(r.price_avg, r.currency)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
