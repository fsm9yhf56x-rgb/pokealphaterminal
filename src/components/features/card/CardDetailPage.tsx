'use client'
/**
 * CardDetailPage — la fiche de reference complete d'une carte.
 * Palier 1 : squelette + routing + chargement des donnees.
 * Sections a venir : Hero, Section Carte (signaux/historique/etats/pop),
 * gating, Section Ma Collection, polish/SEO.
 */
import { useSpotlightData } from '@/components/features/spotlight/useSpotlightData'
import { SNOW, FONT } from '@/lib/design/snow'

// Derive la langue depuis le prefixe de l'id Kodo (en-base1-1 -> EN)
function langFromId(id: string): 'EN' | 'FR' | 'JP' {
  const p = id.split('-')[0]?.toLowerCase()
  if (p === 'fr') return 'FR'
  if (p === 'jp') return 'JP'
  return 'EN'
}

export function CardDetailPage({ cardId }: { cardId: string }) {
  const lang = langFromId(cardId)
  const { data, loading, error } = useSpotlightData(cardId, lang)

  if (loading) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ height: 420, borderRadius: 20, background: SNOW.surface, animation: 'kcPulse 1.4s ease-in-out infinite' }} />
        <style>{`@keyframes kcPulse{0%,100%{opacity:.6}50%{opacity:1}}`}</style>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, marginBottom: 8 }}>Carte introuvable</div>
        <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body }}>{error || 'Cette carte n\u2019existe pas ou n\u2019est pas encore r\u00e9f\u00e9renc\u00e9e.'}</div>
      </div>
    )
  }

  const { card } = data

  // PALIER 1 : preuve de chargement. Hero + sections arrivent au Palier 2.
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} style={{ width: 280, borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.16)' }} />
        ) : null}
        <div style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>
            {card.set_name} {card.local_id ? `\u00b7 #${card.local_id}` : ''}
          </div>
          <h1 style={{ fontSize: 34, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em', margin: '0 0 12px' }}>{card.name}</h1>
          <div style={{ fontSize: 14, color: SNOW.muted, fontFamily: FONT.body }}>
            {card.rarity_normalized} {card.lang ? `\u00b7 ${card.lang}` : ''}
          </div>
          {data.prices.marketEst != null ? (
            <div style={{ fontSize: 28, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, marginTop: 20 }}>
              {data.prices.marketEst.toFixed(2)} {data.prices.primaryCurrency}
            </div>
          ) : null}
        </div>
      </div>
      <div style={{ marginTop: 40, padding: 20, borderRadius: 14, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, fontSize: 13, color: SNOW.muted, fontFamily: FONT.body }}>
        Palier 1 : la page charge et affiche la carte. Les sections compl\u00e8tes (signaux, historique, prix par \u00e9tat, population, gating, collection) arrivent aux paliers suivants.
      </div>
    </div>
  )
}
