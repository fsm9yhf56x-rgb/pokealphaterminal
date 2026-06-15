'use client'

import { useState } from 'react'
import type { PriceEntry } from '../useSpotlightData'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

const COND_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint',
  LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged',
}
const COND_SUB: Record<string, string> = {
  NEAR_MINT: 'comme neuf',
  LIGHTLY_PLAYED: 'légers défauts',
  MODERATELY_PLAYED: 'défauts visibles',
  HEAVILY_PLAYED: 'usure marquée',
  DAMAGED: 'abîmée',
}
const COND_SHORT: Record<string, string> = { NEAR_MINT: 'NM', LIGHTLY_PLAYED: 'LP', MODERATELY_PLAYED: 'MP', HEAVILY_PLAYED: 'HP', DAMAGED: 'DMG' }

function gradeFromVariant(v: string): { tier: string; n: string; lab: string } | null {
  const m = v.match(/^(psa|cgc|bgs|sgc|pca|ccc)_(\d+(?:_\d)?)$/i)
  if (m === null) return null
  const tier = m[1].toUpperCase()
  const n = m[2].replace('_', '.')
  return { tier, n, lab: `${tier} ${n}` }
}

interface Props {
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  portfolio?: import('../SpotlightV2').PortfolioContext | null
}

export function SpotlightStates({ prices }: Props) {
  const [expanded, setExpanded] = useState(false)

  const rawByCond: Record<string, PriceEntry> = {}
  for (const r of prices.bySource.ebay || []) {
    if (r.variant === 'raw' && r.condition && COND_LABEL[r.condition]) {
      rawByCond[r.condition] = r
    }
  }
  const graded = (prices.bySource.ppt_graded || prices.bySource.ebay || []).filter(p => gradeFromVariant(p.variant))
  const gradedLocked = (prices.bySource as any).__gradedLocked === true
  const gradedHiddenCount = Number((prices.bySource as any).__gradedHiddenCount || 0)

  const nm = rawByCond.NEAR_MINT
  const sortedGraded = [...graded].sort((a, b) => b.price_avg - a.price_avg)
  const topGraded = sortedGraded[0]
  const topG = topGraded ? gradeFromVariant(topGraded.variant) : null
  const otherRaw = (['LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED'] as const).filter(c => rawByCond[c]).map(c => rawByCond[c])
  const otherGraded = sortedGraded.slice(1)
  const hasMore = otherRaw.length + otherGraded.length > 0

  if (nm == null && topGraded == null) return null

  const tagStyle = (variant: string) => {
    const g = gradeFromVariant(variant)
    if (g === null) return { background: SNOW.surface, color: '#48484A' }
    const map: Record<string, { background: string; color: string }> = {
      PSA: { background: SNOW.blueLight, color: '#042C53' },
      CGC: { background: SNOW.pink, color: SNOW.pinkDark },
      BGS: { background: SNOW.greenLight, color: '#173404' },
      SGC: { background: SNOW.purple, color: SNOW.purpleDark },
    }
    return map[g.tier] || { background: SNOW.surface, color: SNOW.ink }
  }

  return (
    <div className="kc-section-card" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', padding: '14px 18px' }}>
      <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 2px' }}>Prix par état</div>
      <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: '0 0 12px', lineHeight: 1.4 }}>Moyenne des ventes confirmées</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {nm ? (
          <StateCard label="Near Mint" value={fmtPrice(nm.price_avg, nm.currency)} salesCount={nm.nb_sales || 0} />
        ) : null}
        {topGraded && topG ? (
          <StateCard
            label={`${topG.tier} ${topG.n}`}
            value={fmtPrice(topGraded.price_avg, topGraded.currency)}
            highlight={topG.tier === 'PSA' && topG.n === '10'}
            salesCount={topGraded.nb_sales || 0}
          />
        ) : null}
      </div>

      {gradedLocked ? (
        <div style={{ marginTop: 12 }}>
          <a
            href="/abonnement"
            className="kc-glass-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              background: 'rgba(29,29,31,0.92)',
              backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)',
              border: '1px solid rgba(0,0,0,0.2)',
              fontSize: 12, color: '#fff', fontWeight: 600,
              padding: '8px 16px', borderRadius: 10,
              fontFamily: FONT.display, textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)',
              transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {gradedHiddenCount > 0
              ? `${gradedHiddenCount} autre${gradedHiddenCount > 1 ? 's' : ''} note${gradedHiddenCount > 1 ? 's' : ''} gradée${gradedHiddenCount > 1 ? 's' : ''} avec Premium`
              : 'Toutes les notes gradées avec Premium'}
            <span style={{ color: '#FF7A6E', fontWeight: 700 }}>→</span>
          </a>
        </div>
      ) : hasMore ? (
        <div style={{ marginTop: 12 }}>
          <button
            onClick={() => setExpanded(v => v ? false : true)}
            className="kc-glass-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(0,163,104,0.12)',
              backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)',
              border: '1px solid rgba(0,163,104,0.25)',
              fontSize: 12, color: '#007D4F', fontWeight: 500, cursor: 'pointer',
              padding: '8px 16px', borderRadius: 10,
              fontFamily: FONT.display,
              boxShadow: '0 2px 8px rgba(0,163,104,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
              transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
            }}
          >
            <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .2s ease', fontSize: 10 }}>▶</span>
            {expanded ? 'Masquer les autres états' : `Voir les ${otherRaw.length + otherGraded.length} autres états`}
          </button>

          {expanded ? (
            <div style={{ marginTop: 8 }}>
              {[...otherRaw, ...otherGraded].map((r, i, arr) => {
                const g = gradeFromVariant(r.variant)
                const ts = tagStyle(r.variant)
                return (
                  <div key={`${r.variant}-${r.condition || ''}`} style={{
                    display: 'grid', gridTemplateColumns: '64px 1fr 100px', gap: 14,
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none',
                  }}>
                    <span style={{ padding: '3px 7px', borderRadius: 5, fontSize: 11, fontWeight: 500, fontFamily: FONT.data, textAlign: 'center', background: ts.background, color: ts.color, display: 'inline-block' }}>
                      {g ? g.lab : COND_SHORT[r.condition || ''] || r.variant.toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, color: SNOW.ink }}>
                        {g ? `Note ${g.n}/10` : COND_LABEL[r.condition || '']}{' '}
                        <span style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic', color: SNOW.mutedLight, fontWeight: 400 }}>
                          {g ? g.tier : COND_SUB[r.condition || '']}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 1 }}>
                        {g ? `${r.nb_sales || 0} listings · prix demandé` : `${r.nb_sales || 0} ventes`}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT.data, textAlign: 'right' as const }}>{fmtPrice(r.price_avg, r.currency)}</span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 12, fontSize: 10, color: SNOW.mutedLight, letterSpacing: '0.01em' }}>
        Source : ventes eBay · 90 derniers jours
      </div>
    </div>
  )
}

function StateCard({ label, value, salesCount, highlight }: { label: string; value: string; salesCount: number; highlight?: boolean }) {
  return (
    <div style={{ padding: '12px 14px', background: '#FAFAFB', borderRadius: 10 }}>
      <div style={{ fontSize: 10.5, color: SNOW.mutedLight, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600, fontFamily: FONT.display }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 600, fontFamily: FONT.display, letterSpacing: '-0.02em', marginTop: 6, color: highlight ? '#A32D2D' : SNOW.ink }}>{value}</div>
      <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 3 }}>{salesCount} vente{salesCount > 1 ? 's' : ''}</div>
    </div>
  )
}
