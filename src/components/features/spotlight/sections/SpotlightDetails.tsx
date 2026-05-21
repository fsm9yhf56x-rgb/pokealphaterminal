'use client'

import type { CardInfo } from '../useSpotlightData'
import { SNOW, FONT } from '../snowTokens'

const FLAG: Record<string, string> = { EN: '🇺🇸', FR: '🇫🇷', JP: '🇯🇵' }
const LANG_LABEL: Record<string, string> = { EN: 'Anglais', FR: 'Français', JP: 'Japonais' }

export function SpotlightDetails({ card }: { card: CardInfo }) {
  const rows: Array<[string, string]> = [
    ['Carte', card.name],
    ['Numéro', `${card.local_id}`],
    ['Set', card.set_name || '—'],
    ['Année', card.release_date ? new Date(card.release_date).getFullYear().toString() : '—'],
    ['Langue', `${LANG_LABEL[card.lang] || card.lang} ${FLAG[card.lang] || ''}`.trim()],
    ['Rareté', card.rarity_normalized || '—'],
  ]
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: SNOW.muted, margin: 0 }}>Détails</h2>
      </div>
      <div style={{ background: SNOW.bg, border: `0.5px solid ${SNOW.border}`, borderRadius: 12, padding: '14px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {rows.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: FONT.display, marginBottom: 4 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
