'use client'

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

export function SpotlightEngine({ kodo }: { kodo: KodoSignals | null }) {
  if (!kodo) return null
  const { liquidityScore, gradeEvPsa10Eur, coteFrEur, coteLang } = kodo

  const coteEntries: { lang: string; avg: number }[] = []
  const seenLang = new Set<string>()
  if (coteFrEur != null) { coteEntries.push({ lang: 'FR', avg: coteFrEur }); seenLang.add('FR') }
  if (coteLang && typeof coteLang === 'object') {
    for (const lg of Object.keys(coteLang)) {
      const code = LANG_NAME[lg] || lg
      if (seenLang.has(code)) continue
      const node = coteLang[lg]?.ALL
      if (node && node.avg != null) { coteEntries.push({ lang: code, avg: Number(node.avg) }); seenLang.add(code) }
    }
  }

  const tiles: { label: string; value: React.ReactNode; sub: string; color?: string }[] = []
  if (liquidityScore != null) {
    tiles.push({
      label: 'Liquidité',
      value: <>{liquidityScore}<span style={{ fontSize: 13, color: SNOW.mutedLight, fontWeight: 400 }}>/100</span></>,
      sub: liqLabel(liquidityScore),
      color: liqColor(liquidityScore),
    })
  }
  if (gradeEvPsa10Eur != null) {
    const positive = gradeEvPsa10Eur >= 0
    tiles.push({
      label: 'Écart PSA 10',
      value: `${positive ? '+' : '−'}${fmtPrice(Math.abs(gradeEvPsa10Eur), 'EUR')}`,
      sub: 'hors frais et probabilité de note',
      color: positive ? '#00A368' : SNOW.red,
    })
  }

  if (tiles.length === 0 && coteEntries.length === 0) return null

  // Design a plat: bloc transparent (le panneau est la seule surface glass).
  // Les sous-tuiles stats gardent un micro-cadre subtil (DA dashboard), le gros fond gris part.
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
            <div key={idx} style={{ background: 'rgba(255,255,255,0.55)', borderRadius: 12, padding: '11px 13px', boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)' }}>
              <div style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: t.color || SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em', lineHeight: 1 }}>{t.value}</div>
              <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, marginTop: 4 }}>{t.sub}</div>
            </div>
          ))}
        </div>
      ) : null}

      {coteEntries.length > 0 ? (
        <div style={{ marginTop: tiles.length > 0 ? 12 : 0, paddingTop: tiles.length > 0 ? 12 : 0, borderTop: tiles.length > 0 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
          <div style={{ fontSize: 9.5, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: FONT.display, marginBottom: 8 }}>Cote par langue</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {coteEntries.map((c, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: 5, background: 'rgba(255,255,255,0.5)', borderRadius: 9, padding: '5px 10px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9)' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.data, letterSpacing: '0.04em' }}>{c.lang}</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.data }}>{fmtPrice(c.avg, 'EUR')}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
