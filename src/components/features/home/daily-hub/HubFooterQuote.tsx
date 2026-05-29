'use client'

import { useMemo } from 'react'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

const QUOTES: Array<{ text: string; author: string }> = [
  { text: "Le marché TCG, c'est comme un Pokémon : il évolue toujours.", author: 'Sagesse de collectionneur' },
  { text: "Une carte sous-cotée aujourd'hui, une légende demain.", author: 'Tom Tomura' },
  { text: "L'investisseur patient récolte ce que le trader impatient sème.", author: 'Adage TCG' },
  { text: "La rareté se mesure aux yeux qui la contemplent.", author: 'Anonyme' },
  { text: "Collectionner, c'est se souvenir de qui on était.", author: 'Maxime de collectionneur' },
  { text: "Le plus précieux dans une collection, ce n'est pas la valeur — c'est l'histoire.", author: 'Adage Kodo' },
  { text: "Patience, étude, conviction : trois piliers d'un collectionneur sérieux.", author: 'Sagesse du marché' },
  { text: "Un Master Set complet vaut mille cartes éparpillées.", author: 'Maxime collectionneur' },
]

/**
 * Footer Daily Hub Snow+ : citation du jour (rotation deterministe sur la date).
 * Glass minimal centré, italique, signature subtle.
 */
export function HubFooterQuote() {
  const quote = useMemo(() => {
    // Rotation deterministe sur le jour de l'annee
    const start = new Date(new Date().getFullYear(), 0, 0)
    const diff = (Date.now() - start.getTime()) / 86400000
    const dayOfYear = Math.floor(diff)
    return QUOTES[dayOfYear % QUOTES.length]
  }, [])

  return (
    <div style={{
      textAlign: 'center',
      padding: '24px 16px 16px',
      marginTop: 8,
      animation: 'fadeIn .6s ease both',
    }}>
      {/* Decorative quote mark */}
      <div style={{
        fontSize: 36,
        color: SNOW.mutedExtraLight,
        lineHeight: 0.5,
        marginBottom: 12,
        fontFamily: FONT.display,
        opacity: 0.5,
        userSelect: 'none',
      }}>
        “
      </div>

      <p style={{
        fontSize: 13,
        color: SNOW.muted,
        fontFamily: FONT.body,
        fontStyle: 'italic',
        margin: '0 auto 10px',
        maxWidth: 560,
        lineHeight: 1.6,
        letterSpacing: '-0.1px',
      }}>
        {quote.text}
      </p>

      <p style={{
        fontSize: 10,
        color: SNOW.mutedLight,
        fontFamily: FONT.display,
        margin: 0,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        fontWeight: 600,
      }}>
        — {quote.author}
      </p>
    </div>
  )
}
