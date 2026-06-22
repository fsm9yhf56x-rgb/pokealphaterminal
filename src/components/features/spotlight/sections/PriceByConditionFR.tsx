// Prix par etat FR — source UNIQUE pour les 2 vues (drawer + fiche).
// Affiche les etats FR depuis prices.frByCondition (annonces Cardmarket FR, asking),
// sinon un placeholder honnete. Retourne null si la carte n'est PAS FR
// -> le parent affiche alors son propre bloc US (qui diverge legitimement).
//
// Se remplit tout seul quand un etat FR passe le seuil (saleCount>=3) cote API.
import { SNOW, FONT } from '@/lib/design/snow'

type FrCond = { price: number; saleCount: number; isAsking: boolean }

const COND_ORDER = ['NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED']
const COND_FR: Record<string, string> = {
  NEAR_MINT: 'Near Mint', LIGHTLY_PLAYED: 'Lightly Played', MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played', DAMAGED: 'Damaged',
}

function fmtEur(v: number | null | undefined): string {
  if (v == null) return '—'
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

/**
 * @returns le bloc FR (etats ou placeholder), ou null si carte non-FR.
 */
export function PriceByConditionFR({
  lang,
  frByCondition,
}: {
  lang?: string | null
  frByCondition?: Record<string, FrCond> | null
}) {
  const isFr = String(lang || '').toUpperCase() === 'FR'
  if (!isFr) return null

  const fbc = frByCondition || {}
  const rows = COND_ORDER
    .filter(c => fbc[c] && fbc[c].price > 0)
    .map(c => ({ cond: c, label: COND_FR[c], ...fbc[c] }))

  // Placeholder honnete si aucun etat FR fiable.
  if (rows.length === 0) {
    return (
      <div>
        <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 8px' }}>Prix par état</div>
        <div style={{ padding: '16px 18px', borderRadius: 14, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
          Le détail par état en français se construit à mesure que les ventes FR s'accumulent. On l'affichera dès qu'il sera fiable.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 4px' }}>Prix par état</div>
      <p style={{ fontSize: 11.5, color: SNOW.mutedLight, margin: '0 0 14px', lineHeight: 1.4 }}>Annonces Cardmarket France · par état</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((r, gi) => (
          <div key={r.cond} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', padding: '11px 0', borderBottom: gi < rows.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{r.label}</div>
              <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.display, marginTop: 1 }}>
                annonce FR · {r.saleCount} offre{r.saleCount > 1 ? 's' : ''}
              </div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: gi === 0 ? SNOW.ink : '#48484A', fontFamily: FONT.display, textAlign: 'right' }}>{fmtEur(r.price)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
