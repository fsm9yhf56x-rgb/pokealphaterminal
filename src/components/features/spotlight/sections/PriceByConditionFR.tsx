// Prix par etat FR — source UNIQUE pour les 2 vues (drawer + fiche).
// Donnees = annonces Cardmarket FR (ASKING, pas du vendu). Chaque prix est
// identifie comme "demande" (pill warning + tooltip <AskingHint>). Placeholder
// honnete si rien de fiable. null si carte non-FR -> le parent gere son bloc US.
// Se remplit tout seul quand un etat FR passe le seuil (saleCount>=3) cote API.
'use client'
import { SNOW, FONT } from '@/lib/design/snow'
import { SnowPill } from '@/components/ui/snow/SnowPill'

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

// Pastille "i" + tooltip glass (pattern DA Engine) — reutilisable partout ou
// un prix asking est affiche, pour le distinguer du vendu.
export function AskingHint() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', cursor: 'help' }} className="asking-hint">
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 13, height: 13, borderRadius: '50%', border: `1px solid ${SNOW.mutedLight}`, color: SNOW.mutedLight, fontSize: 9, fontWeight: 700, fontFamily: FONT.display, lineHeight: 1 }}>i</span>
      <span className="asking-tip" style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%) translateY(-8px)', width: 220, background: 'rgba(29,29,31,0.96)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', color: '#fff', fontSize: 11.5, lineHeight: 1.5, fontWeight: 400, fontFamily: FONT.body, padding: '9px 12px', borderRadius: 9, boxShadow: '0 6px 22px rgba(0,0,0,0.28)', zIndex: 20, textAlign: 'left', pointerEvents: 'none', opacity: 0, transition: 'opacity .15s' }}>
        Prix demandés par les vendeurs sur Cardmarket France. Ce ne sont pas des ventes conclues.
      </span>
      <style>{`.asking-hint:hover .asking-tip{opacity:1}`}</style>
    </span>
  )
}

const Title = ({ hint }: { hint?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px' }}>
    <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
      {hint ? 'Offres · Cardmarket FR' : 'Prix par état'}
    </span>
    {hint ? <AskingHint /> : null}
  </div>
)

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

  if (rows.length === 0) {
    return (
      <div>
        <Title />
        <div style={{ padding: '16px 18px', borderRadius: 14, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
          Le détail par état en français se construit à mesure que les ventes FR s'accumulent. On l'affichera dès qu'il sera fiable.
        </div>
      </div>
    )
  }

  return (
    <div>
      <Title hint />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {rows.map((r, gi) => (
          <div key={r.cond} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: gi < rows.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{r.label}</div>
              <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data, letterSpacing: '0.02em', marginTop: 3 }}>
                {r.saleCount} annonce{r.saleCount > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 500, color: SNOW.mutedLight, fontFamily: FONT.body }}>dès</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display }}>{fmtEur(r.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
