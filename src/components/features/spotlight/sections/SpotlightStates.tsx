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
  if (!m) return null
  const tier = m[1].toUpperCase()
  const n = m[2].replace('_', '.')
  return { tier, n, lab: `${tier} ${n}` }
}

interface Props {
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  portfolio?: import('../SpotlightV2').PortfolioContext | null
}

export function SpotlightStates({ prices, portfolio }: Props) {
  const [expanded, setExpanded] = useState(false)

  const rawByCond: Record<string, PriceEntry> = {}
  for (const r of prices.bySource.ebay || []) {
    if (r.variant === 'raw' && r.condition && COND_LABEL[r.condition]) {
      rawByCond[r.condition] = r
    }
  }
  const graded = (prices.bySource.ebay || []).filter(p => gradeFromVariant(p.variant))

  const nm = rawByCond.NEAR_MINT
  const sortedGraded = [...graded].sort((a, b) => b.price_avg - a.price_avg)
  const topGraded = sortedGraded[0]
  const otherRaw = (['LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED'] as const).filter(c => rawByCond[c]).map(c => rawByCond[c])
  const otherGraded = sortedGraded.slice(1)
  const hasMore = otherRaw.length + otherGraded.length > 0

  if (!nm && !topGraded) return null

  const tagStyle = (variant: string) => {
    const g = gradeFromVariant(variant)
    if (!g) return { background: SNOW.surface, color: '#48484A' }
    const map: Record<string, { background: string; color: string }> = {
      PSA: { background: SNOW.blueLight, color: '#042C53' },
      CGC: { background: SNOW.pink, color: SNOW.pinkDark },
      BGS: { background: SNOW.greenLight, color: '#173404' },
      SGC: { background: SNOW.purple, color: SNOW.purpleDark },
    }
    return map[g.tier] || { background: SNOW.surface, color: SNOW.ink }
  }

  return (
    <div className="kc-section-card" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(28px) saturate(200%)', WebkitBackdropFilter: 'blur(28px) saturate(200%)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', padding: '14px 18px' }}>
      <h2 style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 500, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' as const, paddingLeft: 12 }}>
        <span style={{ position: 'absolute' as const, left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 12, background: '#1D1D1F', borderRadius: 2 }} />
        Prix par état
      </h2>
      <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: '0 0 8px', lineHeight: 1.5 }}>
        Une carte en parfait état (<strong style={{ color: SNOW.ink, fontWeight: 500 }}>Near Mint</strong>) ou notée par un organisme (<strong style={{ color: SNOW.ink, fontWeight: 500 }}>PSA, CGC</strong>) vaut beaucoup plus qu'une carte abîmée.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {nm ? (
          <StateCard
            label="État Near Mint"
            tagText="Prix réel"
            tagKind="real"
            value={fmtPrice(nm.price_avg, nm.currency)}
            sub={`${nm.nb_sales || 0} ventes confirmées sur eBay`}
            subItalic="90 derniers jours"
          />
        ) : null}
        {topGraded ? (
          <StateCard
            label={`Notée ${gradeFromVariant(topGraded.variant)!.n}/10 (${gradeFromVariant(topGraded.variant)!.tier})`}
            tagText="Prix demandé"
            tagKind="ask"
            value={fmtPrice(topGraded.price_avg, topGraded.currency)}
            highlight={gradeFromVariant(topGraded.variant)!.tier === 'CGC' && gradeFromVariant(topGraded.variant)!.n === '10'}
            sub={`${topGraded.nb_sales || 0} listings actifs`}
            subItalic="attention : prix demandés, pas vendus"
          />
        ) : null}
      </div>

      {hasMore ? (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setExpanded(v => !v)}
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
            {expanded ? 'Masquer les autres états' : `Voir les ${otherRaw.length + otherGraded.length} autres états observés`}
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
                        {g ? `${r.nb_sales || 0} listings · prix demandé` : `${r.nb_sales || 0} ventes eBay 90j`}
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
    </div>
  )
}

function StateCard({ label, tagText, tagKind, value, sub, subItalic, highlight }: { label: string; tagText: string; tagKind: 'real' | 'ask'; value: string; sub: string; subItalic?: string; highlight?: boolean }) {
  const tagBg = tagKind === 'real' ? '#EAF3DE' : '#FFF8E5'
  const tagFg = tagKind === 'real' ? '#27500A' : '#8A6500'
  return (
    <div style={{ padding: '10px 12px', background: '#FAFAFB', borderRadius: 10, border: '1px solid transparent', transition: 'all .2s cubic-bezier(.2,.8,.2,1)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, fontFamily: FONT.display }}>{label}</span>
        <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 500, fontFamily: FONT.data, background: tagBg, color: tagFg }}>{tagText}</span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 500, fontFamily: FONT.display, letterSpacing: '-0.015em', marginTop: 5, color: highlight ? '#A32D2D' : SNOW.ink }}>{value}</div>
      <p style={{ fontSize: 11, color: SNOW.mutedLight, margin: '2px 0 0' }}>
        {sub}
        {subItalic ? <> <span style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic' }}>{subItalic}</span></> : null}
      </p>
    </div>
  )
}
