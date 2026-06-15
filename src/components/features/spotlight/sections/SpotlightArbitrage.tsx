'use client'

import { useEffect, useRef, useState } from 'react'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

type Side = { priceEur: number; source: string; basis: string; sales: number | null; date: string | null } | null
interface ArbData { us: Side; eu: Side; gapPct: number | null; gapEur: number | null }

const SRC_LABEL: Record<string, string> = {
  ebay: 'eBay', ppt_ebay: 'eBay', tcgplayer: 'TCGplayer', ppt_tcgplayer: 'TCGplayer', cardmarket: 'Cardmarket', cardmarket_unsold: 'Cardmarket',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' }
}

function sideSub(s: NonNullable<Side>): string {
  const src = SRC_LABEL[s.source] || s.source
  const parts = [src, s.basis]
  if (s.sales != null) parts.push(`${s.sales} vente${s.sales > 1 ? 's' : ''}`)
  const d = fmtDate(s.date)
  if (d) parts.push(d)
  return parts.join(' · ')
}

export function SpotlightArbitrage({ cardId }: { cardId: string }) {
  const [data, setData] = useState<ArbData | null>(null)
  const reqRef = useRef(0)

  useEffect(() => {
    const my = ++reqRef.current
    setData(null)
    fetch(`/api/market/arbitrage?card_id=${encodeURIComponent(cardId)}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(j => { if (my === reqRef.current) setData(j) })
      .catch(() => { if (my === reqRef.current) setData(null) })
  }, [cardId])

  // L'arbitrage n'a de sens qu'avec les deux marches.
  if (!data || !data.us || !data.eu) return null

  const { us, eu, gapPct, gapEur } = data
  const usCheaper = us.priceEur < eu.priceEur
  const cheaperSide = usCheaper ? 'US' : 'EU'
  const reco = usCheaper ? 'Moins cher aux États-Unis' : 'Moins cher en Europe'
  const absPct = gapPct != null ? Math.abs(gapPct) : null

  const CARD: React.CSSProperties = {
    background: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    borderRadius: 16,
    padding: '14px 18px',
    border: 'none',
    boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
  }

  const Col = ({ flag, label, side, cheaper }: { flag: string; label: string; side: NonNullable<Side>; cheaper: boolean }) => (
    <div style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: cheaper ? 'rgba(0,163,104,0.08)' : 'rgba(255,255,255,0.5)', borderRadius: 12, boxShadow: cheaper ? 'inset 0 1px 0 rgba(255,255,255,0.9)' : 'inset 0 1px 0 rgba(255,255,255,0.9)', border: cheaper ? '1px solid rgba(0,163,104,0.2)' : '1px solid transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: FONT.display }}>
        <span style={{ fontSize: 13 }}>{flag}</span><span>{label}</span>
      </div>
      <div style={{ fontSize: 21, fontWeight: 700, color: cheaper ? '#00A368' : SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em', marginTop: 6, lineHeight: 1 }}>
        {fmtPrice(side.priceEur, 'EUR')}
      </div>
      <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {sideSub(side)}
      </div>
    </div>
  )

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT.display }}>
          Arbitrage US ↔ EU
        </div>
        <div style={{ fontSize: 9.5, color: SNOW.mutedLight, fontFamily: FONT.display }}>ventes confirmées</div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <Col flag="🇺🇸" label="États-Unis" side={us} cheaper={usCheaper} />
        <Col flag="🇪🇺" label="Europe" side={eu} cheaper={!usCheaper} />
      </div>

      {gapPct != null && gapEur != null ? (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 10, background: 'rgba(0,163,104,0.1)', border: '1px solid rgba(0,163,104,0.2)' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#00A368', fontFamily: FONT.data }}>{absPct} %</span>
            <span style={{ fontSize: 12, color: '#007D4F', fontFamily: FONT.data }}>{fmtPrice(Math.abs(gapEur), 'EUR')}</span>
          </div>
          <div style={{ fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.display }}>
            {reco} <span style={{ color: SNOW.mutedLight }}>· écart entre marchés</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
