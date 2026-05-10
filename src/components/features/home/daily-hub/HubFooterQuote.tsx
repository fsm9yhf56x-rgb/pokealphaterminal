'use client'

import { useMemo } from 'react'

const QUOTES: Array<{ text: string; author: string }> = [
  { text: "Le marché TCG, c'est comme un Pokémon : il évolue toujours.", author: 'Sagesse de collectionneur' },
  { text: "Une carte sous-cotée aujourd'hui, une légende demain.", author: 'Tom Tomura' },
  { text: "L'investisseur patient récolte ce que le trader impatient sème.", author: 'Adage TCG' },
  { text: "Mieux vaut un Charizard PSA 9 dans la main qu'un PSA 10 dans le rêve.", author: 'Proverbe collector' },
  { text: "Le marché récompense la conviction, pas la spéculation.", author: 'Warren Pikachu' },
  { text: "Diversifier, c'est ne pas mettre tous ses Pokémon dans la même Pokéball.", author: 'Adage moderne' },
  { text: "Une 1ère édition, c'est une histoire qu'on possède.", author: 'Sage du vintage' },
  { text: "Le temps est l'allié du collectionneur, l'ennemi du trader pressé.", author: 'Maxime TCG' },
  { text: "Acheter ce qu'on aime, vendre ce que les autres aiment.", author: 'Stratégie classique' },
  { text: "La rareté ne se décrète pas, elle se révèle.", author: 'Pop report wisdom' },
  { text: "Le grading, c'est un jugement. La passion, c'est une certitude.", author: 'Collector zen' },
  { text: "Un set complet, c'est un musée personnel ; chaque carte raconte un chapitre.", author: 'Sage du Master Set' },
]

export function HubFooterQuote() {
  const quote = useMemo(() => {
    const today = new Date()
    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
    )
    return QUOTES[dayOfYear % QUOTES.length]
  }, [])

  return (
    <div style={{
      marginTop: '24px',
      padding: '24px 32px',
      textAlign: 'center',
      borderTop: '1px solid var(--border)',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{
        fontSize: '13px',
        color: 'var(--ink-muted)',
        fontStyle: 'italic',
        lineHeight: 1.5,
        maxWidth: '520px',
        margin: '0 auto',
        letterSpacing: '-0.1px',
      }}>
        <span style={{ color: 'var(--accent)', marginRight: '6px' }}>«</span>
        {quote.text}
        <span style={{ color: 'var(--accent)', marginLeft: '6px' }}>»</span>
      </div>
      <div style={{
        fontSize: '10px',
        color: 'var(--ink-faint)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        fontWeight: 500,
        marginTop: '8px',
      }}>— {quote.author}</div>
    </div>
  )
}
