'use client'
import type { PriceEntry } from '../useSpotlightData'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

interface KodoSig {
  fairValueEur: number | null
  fairValueMethod: string | null
  coteFrEur: number | null
}
interface Props {
  prices: { bySource: Record<string, PriceEntry[]>; marketEst: number | null }
  portfolio?: { condition?: string | null; graded?: boolean | null } | null
  kodo?: KodoSig | null
}

/** Convert "PSA 9" -> "psa_9", "CGC 9.5" -> "cgc_9_5" */
function conditionToVariantKey(cond: string): string {
  return cond.toLowerCase().replace(/\s+/g, '_').replace('.', '_')
}

export function SpotlightTLDR({ prices, portfolio, kodo }: Props) {
  const userGraded = portfolio?.graded || false
  const userCondition = portfolio?.condition

  // 1. Si user a un grade -> source = bySource.ppt_graded
  if (userGraded && userCondition) {
    const variantKey = conditionToVariantKey(userCondition)
    const gradedEntry = (prices.bySource.ppt_graded || []).find(p => p.variant === variantKey)

    if (gradedEntry) {
      const nbSales = gradedEntry.nb_sales || 0
      const headline = nbSales >= 5
        ? `Marché actif · ${userCondition}`
        : nbSales >= 1
          ? `Ventes ${userCondition} confirmées`
          : `Données ${userCondition} disponibles`

      return (
        <div className="kc-section-card" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ width: 28, height: 28, borderRadius: 10, background: '#EAF3DE', color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2 10L5 7L7.5 9.5L12 4M12 4H8.5M12 4V7.5" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: SNOW.ink, margin: '0 0 3px', lineHeight: 1.4 }}>{headline}</p>
            <p style={{ fontSize: 12, color: '#48484A', margin: 0, lineHeight: 1.5 }}>
              Prix observé : <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice(gradedEntry.price_avg, gradedEntry.currency)}</strong> sur eBay sold avec <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{nbSales} vente{nbSales > 1 ? 's' : ''} confirmée{nbSales > 1 ? 's' : ''}</strong> sur 90 jours.
            </p>
          </div>
        </div>
      )
    }
    // user a un grade mais aucune donnée pour ce grade -> on retourne rien (le drawer affiche déjà autre chose)
    return null
  }

  // 2. User raw (ou pas de portfolio) -> Kodo Engine en primaire
  const ebayNm = prices.bySource.ebay?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
  const cm = prices.bySource.cardmarket?.find(p => p.variant === 'raw')
  const fv = kodo?.fairValueEur ?? null
  if (fv == null && !ebayNm && !cm) return null

  const methodLabel = kodo?.fairValueMethod === 'cardmarket_trend' ? 'tendance Cardmarket'
    : kodo?.fairValueMethod === 'us_nm_fx' ? 'ventes US (Near Mint)'
    : kodo?.fairValueMethod === 'eu_asking_decote' ? 'annonces européennes'
    : 'multi-sources'
  const nbSales = ebayNm?.nb_sales || 0

  // Si Kodo a un fair value -> primaire. Sinon fallback ancien comportement.
  if (fv != null) {
    return (
      <div className="kc-section-card" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 28, height: 28, borderRadius: 10, background: '#EAF3DE', color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 10L5 7L7.5 9.5L12 4M12 4H8.5M12 4V7.5" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: SNOW.ink, margin: '0 0 3px', lineHeight: 1.4 }}>Valeur Kodo Engine</p>
          <p style={{ fontSize: 12, color: '#48484A', margin: 0, lineHeight: 1.5 }}>
            Estimation : <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice(fv, 'EUR')}</strong> <span style={{ color: '#86868B' }}>({methodLabel})</span>
            {kodo?.coteFrEur != null && <> · Cote FR : <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice(kodo.coteFrEur, 'EUR')}</strong></>}
            {nbSales >= 3 && ebayNm && <> · Aussi {fmtPrice(ebayNm.price_avg, ebayNm.currency)} sur eBay ({nbSales} ventes)</>}
          </p>
        </div>
      </div>
    )
  }

  // Fallback (pas de fair value Kodo): ancien comportement eBay/CM
  const headline = nbSales >= 3 ? 'Marché actif sur eBay' : 'Données de marché disponibles'
  const body = ebayNm
    ? <>Prix observé : <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice(ebayNm.price_avg, ebayNm.currency)}</strong> sur eBay avec <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{nbSales} ventes confirmées</strong> récentes.</>
    : <>Prix Cardmarket : <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{fmtPrice(cm?.price_avg, cm?.currency)}</strong>. Les prix eBay arriveront bientôt.</>

  return (
    <div className="kc-section-card" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <div style={{ width: 28, height: 28, borderRadius: 10, background: '#EAF3DE', color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
          <path d="M2 10L5 7L7.5 9.5L12 4M12 4H8.5M12 4V7.5" stroke="#27500A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: SNOW.ink, margin: '0 0 3px', lineHeight: 1.4 }}>{headline}</p>
        <p style={{ fontSize: 12, color: '#48484A', margin: 0, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  )
}
