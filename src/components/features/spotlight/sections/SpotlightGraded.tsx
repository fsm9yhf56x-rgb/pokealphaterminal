'use client'

import { GradedPriceTable } from '@/components/features/prices/GradedPriceTable'
import { SNOW, FONT } from '../snowTokens'

export function SpotlightGraded({ cardId, lang }: { cardId: string; lang?: string | null }) {
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>Cartes gradées · Listings actifs</h2>
      </div>
      <GradedPriceTable tcgCardId={cardId} lang={lang as any} hideWhenEmpty />
    </div>
  )
}
