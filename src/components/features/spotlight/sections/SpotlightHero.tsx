'use client'

import type { CardInfo, PriceEntry } from '../useSpotlightData'
import type { PortfolioContext } from '../SpotlightV2'
import { SNOW, FONT, fmtPrice } from '../snowTokens'
import { resolveDisplayPrice } from '@/lib/pricing/resolveDisplayPrice'
import { resolveCardImage } from '@/lib/images'
import { CardImg } from '@/components/ui/CardImg'
import { useState } from 'react'

const FLAG: Record<string, string> = { EN: '🇺🇸', FR: '🇫🇷', JP: '🇯🇵' }
const LANG: Record<string, string> = { EN: 'Anglais', FR: 'Français', JP: 'Japonais' }

const COND_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint',
  LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged',
  MINT: 'Mint',
}

const COND_SUB: Record<string, string> = {
  NEAR_MINT: 'comme neuf',
  LIGHTLY_PLAYED: 'légers défauts',
  MODERATELY_PLAYED: 'défauts visibles',
  HEAVILY_PLAYED: 'usure marquée',
  DAMAGED: 'abîmée',
}

const SRC_LABEL: Record<string, string> = {
  ebay: 'eBay',
  tcgplayer: 'TCGplayer',
  cardmarket: 'Cardmarket',
}
const METHOD_LABEL: Record<string, string> = {
  cardmarket_trend: 'Tendance Cardmarket',
  ebay_sold: 'eBay',
  tcgplayer: 'TCGplayer',
}

function normalizeCondition(c: string | null | undefined): string {
  if (!c) return 'NEAR_MINT'
  if (c === 'Raw') return 'NEAR_MINT'
  return c.toUpperCase().replace(/ /g, '_')
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) } catch { return '' }
}

// Prix de reference : Near Mint en priorite (standard), sinon volume max. Tie-break par ventes puis prix.
function pickReference(bySource: Record<string, PriceEntry[]>) {
  const all: { price: number; source: string; condition: string; sales: number; date: string | null }[] = []
  for (const src of Object.keys(bySource || {})) {
    if (src === 'ppt_graded') continue
    if (!Array.isArray(bySource[src])) continue
    for (const e of bySource[src] || []) {
      if ((e as any).variant !== 'raw') continue
      if ((e as any).condition === 'CARDMARKET_TREND') continue
      const sales = (e as any).nb_sales
      const price = (e as any).price_avg
      if (sales == null || sales <= 0) continue
      if (price == null || price <= 0) continue
      all.push({ price, source: src, condition: (e as any).condition || 'NEAR_MINT', sales, date: (e as any).fetched_at || null })
    }
  }
  if (all.length === 0) return null
  const best = (arr: typeof all) => arr.slice().sort((a, b) => b.sales - a.sales || b.price - a.price)[0]
  const nm = all.filter(x => x.condition === 'NEAR_MINT')
  return nm.length > 0 ? best(nm) : best(all)
}

interface Props {
  card: CardInfo
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  kodo?: { fairValueEur: number | null; fairValueMethod?: string | null; coteFrEur: number | null } | null
  portfolio?: PortfolioContext | null
  hideTitle?: boolean
  hidePrice?: boolean
}

export function SpotlightHero({ card, prices, portfolio, hideTitle, hidePrice, kodo }: Props) {
  const [imgError, setImgError] = useState(false)
  const heroImg = resolveCardImage({ lang: card.lang, setId: card.set_id, localId: card.local_id, fallbackUrl: card.image_url ?? undefined })
  const showPortfolio = portfolio != null
  const userCondition = portfolio?.condition ? normalizeCondition(portfolio.condition) : 'NEAR_MINT'
  const userGraded = portfolio?.graded || false

  let userPriceEntry: PriceEntry | null = null
  if (userGraded && portfolio?.condition) {
    const variantKey = portfolio.condition.toLowerCase().replace(/\s+/g, '_').replace('.', '_')
    userPriceEntry = (prices.bySource.ppt_graded || []).find(p => (p as any).variant === variantKey) || null
  } else if (!userGraded) {
    userPriceEntry = (prices.bySource.ebay || []).find(p => (p as any).variant === 'raw' && (p as any).condition === userCondition) || null
  }

  const ebayNm = prices.bySource.ebay?.find(p => (p as any).variant === 'raw' && (p as any).condition === 'NEAR_MINT')
  const cm = prices.bySource.cardmarket?.find(p => (p as any).variant === 'raw')
  const isFr = String(card.lang || '').toUpperCase() === 'FR'
  const kodoVal = isFr ? (kodo?.coteFrEur ?? kodo?.fairValueEur ?? null) : (kodo?.fairValueEur ?? null)

  // Mode marche : reference = max-volume raw (identique a la grille). Mode portfolio : exemplaire de l'user.
  const maxVol = !showPortfolio ? pickReference(prices.bySource) : null

  const insufficient = (kodo?.fairValueMethod === 'insufficient_data') && !userGraded
  // Marche grade (ventes reelles) a remonter quand le raw n'est pas fiable.
  // Transparence: on montre la vraie valeur gradee SANS laisser croire qu'un raw vaut autant.
  const gradeFromVar = (v: any): { lab: string } | null => {
    const m = String(v || '').match(/^(psa|cgc|bgs|sgc|pca|ccc)_(\d+(?:_\d)?)$/i)
    if (!m) return null
    return { lab: m[1].toUpperCase() + ' ' + m[2].replace('_', '.') }
  }
  const gradedMarket = (prices.bySource.ppt_graded || prices.bySource.ebay || [])
    .map((e: any) => {
      const g = gradeFromVar(e.variant)
      return g && e.price_avg > 0 ? { lab: g.lab, price: e.price_avg, sales: e.nb_sales || 0 } : null
    })
    .filter((x: any): x is { lab: string; price: number; sales: number } => x !== null)
    .sort((a, b) => b.sales - a.sales || b.price - a.price)
    .slice(0, 3)
  const gradedLocked = (prices.bySource as any).__gradedLocked === true
  const gradedHidden = Number((prices.bySource as any).__gradedHiddenCount || 0)
  const showGradedFallback = insufficient && gradedMarket.length > 0
  let heroPrice: number | null = null
  let sourceChip: { label: string; sub: string | null } | null = null

  if (showPortfolio) {
    heroPrice = insufficient ? null : ((portfolio?.curPrice ?? null) ?? userPriceEntry?.price_avg ?? kodoVal ?? ebayNm?.price_avg ?? prices.marketEst ?? cm?.price_avg ?? null)
  } else {
    const resolved = resolveDisplayPrice(card.lang, prices, kodo)
    heroPrice = resolved.price
    if (heroPrice != null && !isFr && maxVol && Math.abs(maxVol.price - heroPrice) < 0.01) {
      const dateStr = fmtDate(maxVol.date)
      sourceChip = {
        label: `${SRC_LABEL[maxVol.source] || maxVol.source} · ${COND_LABEL[maxVol.condition] || maxVol.condition}`,
        sub: `${maxVol.sales} vente${maxVol.sales > 1 ? 's' : ''}${dateStr ? ' · ' + dateStr : ''}`,
      }
    } else {
      sourceChip = resolved.source
    }
  }

  const flag = FLAG[card.lang] || '🌐'
  const lang = LANG[card.lang] || card.lang
  const year = card.release_date ? new Date(card.release_date).getFullYear() : null

  const formatPrice = (v: number | null) => {
    if (v == null) return { main: '—', cents: '' }
    const rounded = Math.floor(v)
    const cents = Math.round((v - rounded) * 100)
    return { main: rounded.toLocaleString('fr-FR'), cents: cents > 0 ? `,${cents.toString().padStart(2, '0')} €` : ' €' }
  }
  const { main: priceMain, cents: priceCents } = formatPrice(heroPrice)

  const userStateLabel = userGraded ? 'Gradé' : COND_LABEL[userCondition] || 'Near Mint'

  let roi: number | null = null
  if (portfolio && portfolio.buyPrice && portfolio.buyPrice > 0 && heroPrice != null) {
    roi = ((heroPrice - portfolio.buyPrice) / portfolio.buyPrice) * 100
  }

  return (
    <div className="spot-hero-clean" style={{ padding: 0, display: 'flex', gap: 14, alignItems: 'stretch' }}>
      {/* Image de la carte a gauche (collection: on voit la carte). Cachee en mode hideTitle. */}
      {!hideTitle && heroImg && !imgError ? (
        <div style={{
          flexShrink: 0, width: 88, alignSelf: 'flex-start',
          borderRadius: 8, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 1px 3px rgba(0,0,0,0.08)',
          background: 'rgba(0,0,0,0.03)',
        }}>
          <CardImg
            setId={card.set_id}
            localId={card.local_id ?? undefined}
            lang={card.lang}
            image={card.image_url}
            name={card.name}
            number={card.local_id ?? undefined}
            variant="full"
            imgStyle={{ height: 'auto' }}
          />
        </div>
      ) : null}
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
      {!hideTitle ? (
        <>
          <div style={{ fontFamily: FONT.display, fontSize: 10.5, fontWeight: 600, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13 }}>{flag}</span>
            <span>{lang}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span>{card.set_name}{year ? ` ${year}` : ''}</span>
            <span style={{ color: '#D8D8DD' }}>·</span>
            <span style={{ fontFamily: FONT.data }}>#{card.local_id}</span>
            {(card.rarity || card.rarity_normalized) ? (<><span style={{ color: '#D8D8DD' }}>·</span><span>{card.rarity || String(card.rarity_normalized).split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}</span></>) : null}
          </div>
          <h1 style={{ fontFamily: FONT.display, fontSize: 25, fontWeight: 600, letterSpacing: '-0.022em', lineHeight: 1.15, margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.name}</h1>
        </>
      ) : null}
      {!hidePrice ? (
      <div style={{
        marginTop: hideTitle ? 0 : 14, paddingTop: hideTitle ? 0 : 14,
        borderTop: hideTitle ? 'none' : '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          <div style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display }}>
            {showPortfolio ? 'Ton exemplaire' : 'Prix de marché'}
          </div>
          <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.display, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {showGradedFallback ? (userStateLabel + ' — pas de vente fiable') : (showPortfolio ? userStateLabel : (sourceChip?.label || '—'))}
          </div>
        </div>
        <div style={{ textAlign: 'right' as const, flexShrink: 0, whiteSpace: 'nowrap' as const }}>
          {showGradedFallback ? (
            <div style={{ textAlign: 'right' as const, maxWidth: 230 }}>
              <div style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display, marginBottom: 3 }}>Marché gradé</div>
              {gradedMarket.map((g, i) => (
                <div key={i} style={{ fontSize: 12.5, fontFamily: FONT.display, color: SNOW.ink, fontWeight: 500, lineHeight: 1.5 }}>
                  <span style={{ color: SNOW.muted, fontWeight: 600 }}>{g.lab}</span>{' · '}{Math.round(g.price).toLocaleString('fr-FR')} $
                </div>
              ))}
              {gradedLocked && gradedHidden > 0 ? (
                <div style={{ fontSize: 10.5, color: SNOW.red, fontWeight: 600, fontFamily: FONT.display, marginTop: 3 }}>+ {gradedHidden} notes · Premium</div>
              ) : null}
              <div style={{ fontSize: 9.5, color: SNOW.mutedLight, fontStyle: 'italic' as const, marginTop: 4, whiteSpace: 'normal' as const, lineHeight: 1.3 }}>Ventes gradées — ton exemplaire non gradé peut valoir nettement moins</div>
            </div>
          ) : insufficient ? (
            <div style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, color: SNOW.mutedLight, fontStyle: 'italic' as const, maxWidth: 180, whiteSpace: 'normal' as const, textAlign: 'right' as const, lineHeight: 1.3 }}>{isFr ? 'Données insuffisantes' : 'Pas de cote occidentale'}</div>
          ) : (
          <div>
            <span style={{ fontFamily: FONT.display, fontSize: 30, fontWeight: 600, letterSpacing: '-0.028em', lineHeight: 1, color: SNOW.ink }}>{priceMain}</span>
            <span style={{ fontSize: 18, color: SNOW.mutedLight, fontWeight: 400, fontFamily: FONT.display }}>{priceCents}</span>
            {!isFr && !showPortfolio && heroPrice != null && (prices as any).fxUsdEur > 0 ? (
              <span style={{ display: 'block', fontSize: 12, color: SNOW.mutedLight, fontWeight: 600, fontFamily: FONT.data, letterSpacing: '-0.01em', marginTop: 2 }}>~${(heroPrice / (prices as any).fxUsdEur).toFixed(2)}</span>
            ) : null}
          </div>
          )}
          {showPortfolio ? (
            <>
              {roi != null ? (
                <div style={{ fontSize: 11.5, marginTop: 4, color: roi >= 0 ? '#00A368' : SNOW.red, fontWeight: 600 }}>
                  {roi >= 0 ? '+' : ''}{roi.toFixed(1).replace('.', ',')} % <span style={{ color: SNOW.mutedLight, fontWeight: 400 }}>depuis achat</span>
                </div>
              ) : null}
              {portfolio!.qty > 1 ? (
                <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 3 }}>
                  ×{portfolio!.qty} = <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice((heroPrice || 0) * portfolio!.qty, 'EUR')}</strong>
                </div>
              ) : null}
            </>
          ) : (
            sourceChip?.sub ? (
              <div style={{ fontSize: 11, color: SNOW.mutedLight, marginTop: 4, fontFamily: FONT.display }}>{sourceChip.sub}</div>
            ) : null
          )}
        </div>
      </div>
      ) : null}
    </div>
    </div>
  )
}
