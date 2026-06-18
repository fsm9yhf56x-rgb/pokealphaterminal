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
const SRC_LABEL: Record<string, string> = { ebay: 'eBay', tcgplayer: 'TCGplayer', cardmarket: 'Cardmarket' }

function gradeFromVariant(v: string): { tier: string; n: string; lab: string } | null {
  const m = v.match(/^(psa|cgc|bgs|sgc|pca|ccc)_(\d+(?:_\d)?)$/i)
  if (m === null) return null
  const tier = m[1].toUpperCase()
  const n = m[2].replace('_', '.')
  return { tier, n, lab: `${tier} ${n}` }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' }
}

type RawBest = { entry: PriceEntry; source: string; sales: number }

// Pour chaque etat raw : la source au plus gros volume, toutes sources confondues (== grille).
function bestRawByCond(bySource: Record<string, PriceEntry[]>): Record<string, RawBest> {
  const out: Record<string, RawBest> = {}
  for (const src of Object.keys(bySource || {})) {
    if (src === 'ppt_graded') continue
    if (!Array.isArray(bySource[src])) continue
    for (const e of bySource[src]) {
      if ((e as any).variant !== 'raw') continue
      const cond = (e as any).condition
      if (!cond || !COND_LABEL[cond]) continue
      const sales = (e as any).nb_sales ?? 0
      const cur = out[cond]
      if (!cur || sales > cur.sales) out[cond] = { entry: e, source: src, sales }
    }
  }
  return out
}

interface Props {
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  portfolio?: import('../SpotlightV2').PortfolioContext | null
  kodo?: { fairValueEur: number | null; fairValueMethod?: string | null; coteFrEur: number | null } | null
}

export function SpotlightStates({ prices, kodo }: Props) {
  const [expanded, setExpanded] = useState(false)

  const bestRaw = bestRawByCond(prices.bySource)
  const nmInsufficient = kodo?.fairValueMethod === 'insufficient_data'
  const nmBest = nmInsufficient ? null : (bestRaw.NEAR_MINT || null)
  const nm = nmBest?.entry || null

  const graded = (prices.bySource.ppt_graded || prices.bySource.ebay || []).filter(p => gradeFromVariant((p as any).variant))
  const gradedLocked = (prices.bySource as any).__gradedLocked === true
  const gradedHiddenCount = Number((prices.bySource as any).__gradedHiddenCount || 0)

  const sortedGraded = [...graded].sort((a, b) => b.price_avg - a.price_avg)
  const topGraded = sortedGraded[0]
  const topG = topGraded ? gradeFromVariant((topGraded as any).variant) : null

  const otherRawConds = ['LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED'] as const
  const otherRaw: RawBest[] = otherRawConds.filter(c => bestRaw[c]).map(c => bestRaw[c])
  const otherGraded = sortedGraded.slice(1)
  const hasMore = otherRaw.length + otherGraded.length > 0

  if (nm == null && topGraded == null) return null

  // Liste combinee pour la section "autres etats" (raw d'abord, puis gradees).
  const combined: Array<
    | { kind: 'raw'; entry: PriceEntry; source: string; sales: number }
    | { kind: 'graded'; entry: PriceEntry; sales: number }
  > = [
    ...otherRaw.map(o => ({ kind: 'raw' as const, entry: o.entry, source: o.source, sales: o.sales })),
    ...otherGraded.map(e => ({ kind: 'graded' as const, entry: e, sales: (e as any).nb_sales || 0 })),
  ]

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
      <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: '0 0 12px', lineHeight: 1.4 }}>Moyenne des ventes confirmées, par source</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {nm && nmBest ? (
          <StateCard
            label="Near Mint"
            value={fmtPrice(nm.price_avg, nm.currency)}
            source={nmBest.source}
            salesCount={nmBest.sales}
            date={(nm as any).fetched_at}
          />
        ) : null}
        {topGraded && topG ? (
          <StateCard
            label={`${topG.tier} ${topG.n}`}
            value={fmtPrice(topGraded.price_avg, topGraded.currency)}
            highlight={topG.tier === 'PSA' && topG.n === '10'}
            salesCount={(topGraded as any).nb_sales || 0}
            graded
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
            {expanded ? 'Masquer les autres états' : `Voir les ${combined.length} autres états`}
          </button>

          {expanded ? (
            <div style={{ marginTop: 8 }}>
              {combined.map((row, i, arr) => {
                const variant = (row.entry as any).variant
                const cond = (row.entry as any).condition
                const g = gradeFromVariant(variant)
                const ts = tagStyle(variant)
                const dateStr = fmtDate((row.entry as any).fetched_at)
                return (
                  <div key={`${variant}-${cond || ''}-${i}`} style={{
                    display: 'grid', gridTemplateColumns: '64px 1fr 100px', gap: 14,
                    alignItems: 'center', padding: '10px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none',
                  }}>
                    <span style={{ padding: '3px 7px', borderRadius: 5, fontSize: 11, fontWeight: 500, fontFamily: FONT.data, textAlign: 'center', background: ts.background, color: ts.color, display: 'inline-block' }}>
                      {g ? g.lab : COND_SHORT[cond || ''] || String(variant).toUpperCase()}
                    </span>
                    <div>
                      <div style={{ fontSize: 13, color: SNOW.ink }}>
                        {g ? `Note ${g.n}/10` : COND_LABEL[cond || '']}{' '}
                        <span style={{ fontFamily: 'Times New Roman, serif', fontStyle: 'italic', color: SNOW.mutedLight, fontWeight: 400 }}>
                          {g ? g.tier : COND_SUB[cond || '']}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 1 }}>
                        {row.kind === 'graded'
                          ? `${row.sales} listings · prix demandé`
                          : `${SRC_LABEL[row.source] || row.source} · ${row.sales} vente${row.sales > 1 ? 's' : ''}${dateStr ? ' · ' + dateStr : ''}`}
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 500, fontFamily: FONT.data, textAlign: 'right' as const }}>{fmtPrice(row.entry.price_avg, row.entry.currency)}</span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div style={{ marginTop: 12, fontSize: 10, color: SNOW.mutedLight, letterSpacing: '0.01em' }}>
        Source au plus gros volume affichée pour chaque état · 90 derniers jours
      </div>
    </div>
  )
}

function StateCard({ label, value, salesCount, highlight, source, date, graded }: { label: string; value: string; salesCount: number; highlight?: boolean; source?: string; date?: string | null; graded?: boolean }) {
  let sub: string
  if (graded) {
    sub = `${salesCount} vente${salesCount > 1 ? 's' : ''}`
  } else if (source) {
    const d = fmtDate(date)
    sub = `${SRC_LABEL[source] || source} · ${salesCount} vente${salesCount > 1 ? 's' : ''}${d ? ' · ' + d : ''}`
  } else {
    sub = `${salesCount} vente${salesCount > 1 ? 's' : ''}`
  }
  return (
    <div style={{ padding: '12px 14px', background: '#FAFAFB', borderRadius: 10 }}>
      <div style={{ fontSize: 10.5, color: SNOW.mutedLight, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 600, fontFamily: FONT.display }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 600, fontFamily: FONT.display, letterSpacing: '-0.02em', marginTop: 6, color: highlight ? '#A32D2D' : SNOW.ink }}>{value}</div>
      <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
    </div>
  )
}
