'use client'

import { useState } from 'react'
import { SNOW, FONT, fmtPrice } from '../snowTokens'

interface KodoSignals {
  fairValueEur: number | null
  fairValueMethod: string | null
  coteFrEur: number | null
  coteLang: any | null
  liquidityScore: number | null
  spreadUsEuPct: number | null
  gradeEvPsa10Eur: number | null
}

const LANG_NAME: Record<string, string> = {
  FR: 'FR', EN: 'EN', DE: 'DE', IT: 'IT', ES: 'ES', JP: 'JP', PT: 'PT', NL: 'NL',
}

function liqLabel(s: number): string {
  if (s >= 70) return 'Très liquide'
  if (s >= 40) return 'Liquidité moyenne'
  return 'Peu liquide'
}
function liqColor(s: number): string {
  if (s >= 70) return '#00A368'
  if (s >= 40) return '#C77700'
  return SNOW.muted
}

// Petite infobulle au survol (explication en clair, zero jargon)
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, borderRadius: '50%', border: `1px solid ${SNOW.mutedLight}`, color: SNOW.mutedLight, fontSize: 9, fontWeight: 700, fontFamily: FONT.display, cursor: 'help', lineHeight: 1 }}>i</span>
      {open ? (
        <span style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)', width: 220, background: 'rgba(29,29,31,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, fontFamily: FONT.body, padding: '9px 12px', borderRadius: 9, boxShadow: '0 6px 22px rgba(0,0,0,0.28)', zIndex: 20, textTransform: 'none', letterSpacing: 0, textAlign: 'left', pointerEvents: 'none' }}>
          {text}
          <span style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: '5px solid rgba(29,29,31,0.96)' }} />
        </span>
      ) : null}
    </span>
  )
}

const TIP_LIQUIDITE = 'Facilité à acheter ou revendre cette carte rapidement, selon le volume de ventes récentes. 100 = très facile à échanger.'
const TIP_ECART_PSA = "Différence entre le prix d'un exemplaire noté PSA 10 et un exemplaire brut. Indicatif : ne tient pas compte des frais de gradation ni de la probabilité d'obtenir un 10."

export function SpotlightEngine({ kodo, onEvDetail }: { kodo: KodoSignals | null; onEvDetail?: () => void }) {
  if (!kodo) return null
  const { liquidityScore, gradeEvPsa10Eur } = kodo

  // Cote FR = deja portee par le headline "Prix de marche". On ne duplique pas ici.
  // Le bloc "cote par langue" historique melangeait des PAYS (BE, DE...) a des
  // niveaux .ALL incoherents -> retire. Une fiche FR montre la cote FR, une fois.

  const tiles: { label: string; value: React.ReactNode; sub: string; color?: string; tip?: string }[] = []
  if (liquidityScore != null) {
    tiles.push({
      label: 'Liquidité',
      value: <>{liquidityScore}<span style={{ fontSize: 13, color: SNOW.mutedLight, fontWeight: 400 }}>/100</span></>,
      sub: liqLabel(liquidityScore),
      color: liqColor(liquidityScore),
      tip: TIP_LIQUIDITE,
    })
  }
  if (gradeEvPsa10Eur != null) {
    const positive = gradeEvPsa10Eur >= 0
    tiles.push({
      label: 'Écart PSA 10',
      value: `${positive ? '+' : '−'}${fmtPrice(Math.abs(gradeEvPsa10Eur), 'EUR')}`,
      sub: 'hors frais et probabilité de note',
      color: SNOW.ink,
      tip: TIP_ECART_PSA,
    })
  }

  if (tiles.length === 0) return null

  const CARD: React.CSSProperties = {
    background: 'transparent',
    borderRadius: 0,
    padding: '2px 2px',
    border: 'none',
  }

  return (
    <div style={CARD}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: FONT.display }}>
          Signaux Kodo
        </div>
        <div style={{ fontSize: 9.5, color: SNOW.mutedLight, fontFamily: FONT.display }}>
          agrégés multi-sources
        </div>
      </div>

      {tiles.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length === 1 ? 1 : tiles.length === 2 ? 2 : 3}, 1fr)`, gap: 10 }}>
          {tiles.map((t, idx) => (
            <div key={idx} style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 12, padding: '11px 13px', boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)', overflow: 'visible' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</span>
                {t.tip ? <InfoTip text={t.tip} /> : null}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.color || SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em', lineHeight: 1 }}>{t.value}</div>
              <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, marginTop: 4 }}>{t.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {onEvDetail && gradeEvPsa10Eur != null ? (
          <button onClick={onEvDetail} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: SNOW.muted, fontFamily: FONT.display }}>
            Faut-il la grader ? Voir le calcul complet
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </button>
        ) : null}

    </div>
  )
}
