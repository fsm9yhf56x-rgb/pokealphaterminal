// Prix par etat FR — source UNIQUE pour les 2 vues (drawer + fiche).
// Donnees brutes = annonces Cardmarket FR (ASKING). Donnees gradees = annonces
// eBay FR decotees (CCC/PCA). Chaque prix est identifie comme "demande" (AskingHint).
// Onglet Prix = "combien ca vaut" (brut + grade par note), distinct de l'onglet
// Gradation = "faut-il grader" (Graded.ev + population). Placeholder si rien de fiable.
// null si carte non-FR -> le parent gere son bloc US.
'use client'
import { SNOW, FONT } from '@/lib/design/snow'
import { SnowPill } from '@/components/ui/snow/SnowPill'

type FrCond = { price: number; saleCount: number; isAsking: boolean; derived?: boolean }
type FrGradedRow = { variant: string; price: number; saleCount: number }

// Decode un variant CCC/PCA en libelle lisible : "ccc_9_5" -> "CCC 9.5", "ccc_10_gold" -> "CCC 10 Gold".
function gradedLabel(variant: string): string {
  const parts = String(variant || '').split('_')
  if (parts.length < 2) return variant.toUpperCase()
  const company = parts[0].toUpperCase()
  const num = parts[1].replace('-', '.')
  const suffix = parts.slice(2).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  return `${company} ${num}${suffix ? ' ' + suffix : ''}`
}

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

const SectionTitle = ({ label, hint }: { label: string; hint?: boolean }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '0 0 12px' }}>
    <span style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 600, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>{label}</span>
    {hint ? <AskingHint /> : null}
  </div>
)

export function PriceByConditionFR({
  lang,
  frByCondition,
  frGraded,
  frGradedLocked,
  frGradedHiddenCount,
}: {
  lang?: string | null
  frByCondition?: Record<string, FrCond> | null
  frGraded?: FrGradedRow[] | null
  frGradedLocked?: boolean
  frGradedHiddenCount?: number
}) {
  const isFr = String(lang || '').toUpperCase() === 'FR'
  if (!isFr) return null

  const fbc = frByCondition || {}
  const graded = (frGraded || []).filter(g => g.price > 0)
  const rows = COND_ORDER
    .filter(c => fbc[c] && fbc[c].price > 0)
    .map(c => ({ cond: c, label: COND_FR[c], ...fbc[c] }))

  const hasBrut = rows.length > 0
  const hasGraded = graded.length > 0

  // Rien de fiable ni en brut ni en gradé -> placeholder unique.
  if (!hasBrut && !hasGraded) {
    return (
      <div>
        <SectionTitle label="Prix par état" />
        <div style={{ padding: '16px 18px', borderRadius: 14, background: SNOW.surfaceSoft, border: `1px solid ${SNOW.border}`, fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5 }}>
          Le détail par état en français se construit à mesure que les ventes FR s'accumulent. On l'affichera dès qu'il sera fiable.
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Prix par etat FR : offres Cardmarket reelles (dès X€) OU prix derives (~X€) */}
      {hasBrut ? (
        <div style={{ marginBottom: hasGraded ? 24 : 0 }}>
          <SectionTitle label={rows.every(r => r.derived) ? "Prix par état" : "Offres · Cardmarket FR"} hint={!rows.every(r => r.derived)} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {rows.map((r, gi) => (
              <div key={r.cond} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: gi < rows.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display }}>{r.label}</div>
                  {!r.derived ? (
                    <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data, letterSpacing: '0.02em', marginTop: 3 }}>
                      {r.saleCount} annonce{r.saleCount > 1 ? 's' : ''}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  {r.derived ? (
                    <span style={{ fontSize: 15, fontWeight: 500, color: SNOW.mutedLight, fontFamily: FONT.display }}>~</span>
                  ) : (
                    <span style={{ fontSize: 11, fontWeight: 500, color: SNOW.mutedLight, fontFamily: FONT.body }}>dès</span>
                  )}
                  <span style={{ fontSize: 16, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display }}>{fmtEur(r.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Gradé FR (CCC/PCA) par note : combien ca vaut grade */}
      {hasGraded ? (
        <div>
          <SectionTitle label="Prix gradés · CCC" hint />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {graded.map((g, gi) => (
              <div key={g.variant} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: gi < graded.length - 1 ? `1px solid ${SNOW.borderSoft}` : 'none' }}>
                <div><SnowPill tone="danger" size="sm">{gradedLabel(g.variant)}</SnowPill></div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 11, fontWeight: 500, color: SNOW.mutedLight, fontFamily: FONT.body }}>dès</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display }}>{fmtEur(g.price)}</span>
                </div>
              </div>
            ))}
          </div>
          {frGradedLocked ? (
            <a href="/abonnement" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 12, background: 'rgba(29,29,31,0.92)', backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)', border: '1px solid rgba(0,0,0,0.2)', fontSize: 12, color: '#fff', fontWeight: 600, padding: '8px 16px', borderRadius: 10, fontFamily: FONT.display, textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              {(frGradedHiddenCount ?? 0) > 0
                ? `${frGradedHiddenCount} autre${(frGradedHiddenCount ?? 0) > 1 ? 's' : ''} note${(frGradedHiddenCount ?? 0) > 1 ? 's' : ''} gradée${(frGradedHiddenCount ?? 0) > 1 ? 's' : ''} avec Premium`
                : 'Toutes les notes gradées avec Premium'}
              <span style={{ color: '#FF7A6E', fontWeight: 700 }}>→</span>
            </a>
          ) : null}
          <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 10, lineHeight: 1.4 }}>
            Prix issus d'annonces eBay FR (décotées), affichés quand au moins deux annonces concordent.
          </div>
        </div>
      ) : null}
    </div>
  )
}
