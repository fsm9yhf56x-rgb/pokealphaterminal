"use client"
// Section GRADE, pleine largeur. Le grade vivait dans une colonne etroite du
// hero : libelles tronques, legende en italique 9px sur deux lignes, et une
// mention "ventes gradees" alors que la donnee peut etre des ANNONCES.
//
// Ici chaque ligne dit ce qu'elle est : "dès X" + "3 annonces en cours" pour un
// ask, "X" + "12 ventes" pour une vente conclue. Un collectionneur qui lit 592 EUR
// doit savoir si quelqu'un a PAYE ce prix ou si trois vendeurs le DEMANDENT.
import { SNOW, FONT } from "@/lib/design/snow"

export interface GradedRow {
  variant: string
  price: number
  currency?: string | null
  sales?: number | null
  isAsk?: boolean
}

const LABEL = (v: string) => {
  const m = String(v || '').match(/^(psa|cgc|bgs|sgc|pca|ccc|ace|tag|aog|cca|egs)_(\d+(?:_\d)?)$/i)
  return m ? m[1].toUpperCase() + ' ' + m[2].replace('_', '.') : String(v || '').toUpperCase()
}
// Les tokens 'Slabs' de snow.ts sont faits pour ca. PCA et CCC comptent autant
// que PSA sur le marche FR : les omettre les renvoyait au gris par defaut.
const TONE: Record<string, { bg: string; fg: string }> = {
  PSA: { bg: SNOW.blue, fg: SNOW.blueDark },
  CGC: { bg: SNOW.pink, fg: SNOW.pinkDark },
  BGS: { bg: SNOW.greenLight, fg: SNOW.green },
  SGC: { bg: SNOW.purple, fg: SNOW.purpleDark },
  PCA: { bg: SNOW.teal, fg: SNOW.tealDark },
  CCC: { bg: SNOW.redLight, fg: SNOW.redDark },
}
const fmt = (v: number, cur?: string | null) =>
  Math.round(v).toLocaleString('fr-FR') + ' ' + (String(cur || 'EUR') === 'USD' ? '$' : '\u20AC')

export function SpotlightGraded({ rows, locked, hiddenCount, onUpgrade }: {
  rows: GradedRow[]
  locked?: boolean
  hiddenCount?: number
  onUpgrade?: () => void
}) {
  if (!rows.length) return null
  const asks = rows.filter(r => r.isAsk).length

  return (
    <div className="kc-section-card" style={{ background: 'transparent', border: 'none', padding: '2px 2px', marginTop: 22 }}>
      <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 2px' }}>
        Prix gradés
      </div>
      <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: '0 0 12px', lineHeight: 1.4 }}>
        {asks === rows.length
          ? "Annonces en cours — un prix demandé, pas une vente conclue"
          : asks > 0
            ? "Ventes conclues et annonces en cours, ligne par ligne"
            : "Ventes conclues, par société et par note"}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 0 }}>
        {rows.map((r, i) => {
          const lab = LABEL(r.variant)
          const tone = TONE[lab.split(' ')[0]] || { bg: SNOW.surface, fg: SNOW.ink }
          return (
            <div key={r.variant + i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: i < rows.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
              <div>
                <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: 7, background: tone.bg, color: tone.fg, fontSize: 11.5, fontWeight: 700, fontFamily: FONT.display, letterSpacing: '0.02em' }}>
                  {lab}
                </span>
                {r.sales ? (
                  <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data, letterSpacing: '0.02em', marginTop: 5 }}>
                    {r.sales} {r.isAsk ? 'annonce' : 'vente'}{r.sales > 1 ? 's' : ''}{r.isAsk ? ' en cours' : ''}
                  </div>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                {r.isAsk ? <span style={{ fontSize: 11, fontWeight: 500, color: SNOW.mutedLight, fontFamily: FONT.body }}>dès</span> : null}
                <span style={{ fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmt(r.price, r.currency)}</span>
              </div>
            </div>
          )
        })}
      </div>

      {locked && (hiddenCount || 0) > 0 ? (
        <button onClick={onUpgrade} style={{ width: '100%', marginTop: 10, padding: '10px', background: SNOW.ink, color: '#FFF', border: 'none', borderRadius: 10, fontSize: 12, fontFamily: FONT.display, fontWeight: 600, cursor: 'pointer' }}>
          Débloquer {hiddenCount} notes de plus · Premium
        </button>
      ) : null}
    </div>
  )
}
export default SpotlightGraded
