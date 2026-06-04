'use client'

import { useEffect, useState } from 'react'
import { SNOW, FONT } from '../snowTokens'

interface Variant { psa_spec_id: string; variety: string | null; grades: Record<string, number>; total: number }

/**
 * Convertit `variety` PSA en label lisible.
 * Convention PSA : variety=null = "Unlimited" (édition standard sans variété spéciale)
 * Sinon : la variety telle quelle ("1st Edition", "Shadowless", "Reverse Holo", etc.)
 */
function varietyLabel(variety: string | null): string {
  if (!variety || variety === 'null') return 'Unlimited'
  return variety
}

const SHOWN = ['10', '9', '8.5', '8', '7', '6', '≤5'] as const

export function SpotlightPopExpandable({ cardId, lang }: { cardId: string; lang?: string }) {
  const [variants, setVariants] = useState<Variant[]>([])
  const [loading, setLoading] = useState(true)
  const [tabIdx, setTabIdx] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const [langFallback, setLangFallback] = useState(false)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLangFallback(false)
    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
    fetch(`/api/pop-report?card_id=${encodeURIComponent(cardId)}${langParam}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        setVariants(j?.variants || [])
        setLangFallback(!!j?.langFallback)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId, lang])

  if (loading) return null
  if (variants.length === 0) {
    if (langFallback && (lang === 'FR' || lang === 'JP')) {
      const langLabel = lang === 'FR' ? 'française' : 'japonaise'
      return (
        <div style={{ padding: '14px 22px', background: '#FFF8E6', border: '1px solid #FCD34D', borderRadius: 16, fontSize: 12, color: '#92400E', fontFamily: FONT.body, lineHeight: 1.55 }}>
          <strong>Population PSA {langLabel} indisponible.</strong> PSA n'a pas gradé suffisamment d'exemplaires de cette carte dans cette langue pour publier une distribution.
        </div>
      )
    }
    return null
  }

  const sel = variants[tabIdx] || variants[0]
  const total = sel.total
  const pop10 = sel.grades['10'] || 0
  const pop9 = sel.grades['9'] || 0
  const pop9plus = pop10 + pop9
  const gemRate = total > 0 ? (pop10 / total) * 100 : 0
  const nine_plus_pct = total > 0 ? (pop9plus / total) * 100 : 0

  let peakGrade = '—', peakCount = 0
  for (const [g, c] of Object.entries(sel.grades)) {
    if (c > peakCount) { peakCount = c; peakGrade = g }
  }

  const counts = SHOWN.map(g => {
    if (g === '≤5') {
      return ['5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1'].reduce((s, k) => s + (sel.grades[k] || 0), 0)
    }
    return sel.grades[g] || 0
  })
  const maxBar = Math.max(...counts)

  return (
    <div className="kc-section-card" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', padding: '14px 18px' }}>
      <h2 style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 500, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' as const, paddingLeft: 12 }}>
        <span style={{ position: 'absolute' as const, left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 12, background: '#1D1D1F', borderRadius: 2 }} />
        Population gradée
      </h2>
      <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: '0 0 8px', lineHeight: 1.5 }}>
        Combien de cartes de cette référence existent notées par <strong style={{ color: SNOW.ink, fontWeight: 500 }}>PSA</strong> ?
      </p>

      <div
        onClick={() => setExpanded(v => !v)}
        className="kc-ring-card-hover"
        style={{
          position: 'relative' as const,
          display: 'flex', alignItems: 'center', gap: 14, padding: 16,
          background: 'rgba(255,255,255,0.45)',
          backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: 14, border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
          overflow: 'hidden' as const,
        }}
      >
        <div className="kc-halo-pulse" style={{ position: 'absolute' as const, top: '-30%', left: '-10%', width: '60%', height: '160%', background: 'radial-gradient(circle, rgba(0,163,104,0.22) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' as const, zIndex: 0 }} />
        <div style={{ position: 'relative' as const, zIndex: 1, display: 'contents' }}>
        <svg viewBox="0 0 44 44" style={{ width: 44, height: 44, flexShrink: 0 }}>
          <circle cx="22" cy="22" r="18" stroke={SNOW.borderSoft} strokeWidth="6" fill="none" />
          <circle cx="22" cy="22" r="18" stroke="#00A368" strokeWidth="6" fill="none" strokeDasharray={113.1} strokeDashoffset={113.1 - (gemRate / 100) * 113.1} transform="rotate(-90 22 22)" strokeLinecap="round" />
          <text x="22" y="26" textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="10" fontWeight="500" fill={SNOW.ink}>{gemRate.toFixed(1).replace('.', ',')}%</text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: '0 0 3px' }}>Gem rate (notes 10/10)</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.01em', margin: 0 }}>{pop10.toLocaleString('fr-FR')} PSA 10 / {total.toLocaleString('fr-FR')}</p>
          <p style={{ fontSize: 11, color: '#48484A', margin: '4px 0 0', lineHeight: 1.45 }}>
            Seules <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{gemRate.toFixed(1).replace('.', ',')} %</strong> des cartes gradées atteignent la note maximale.
          </p>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(v => !v) }} className="kc-glass-btn" style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'rgba(0,163,104,0.12)',
            backdropFilter: 'blur(20px) saturate(200%)', WebkitBackdropFilter: 'blur(20px) saturate(200%)',
            border: '1px solid rgba(0,163,104,0.25)',
            fontSize: 12, color: '#007D4F', fontWeight: 500, cursor: 'pointer',
            padding: '8px 16px', borderRadius: 10, fontFamily: FONT.display, marginTop: 8,
            boxShadow: '0 2px 8px rgba(0,163,104,0.08), inset 0 1px 0 rgba(255,255,255,0.7)',
            transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
          }}>
            {expanded ? 'Masquer la distribution' : 'Voir la distribution complète'}
            <span style={{ fontSize: 11, transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .25s ease' }}>▶</span>
          </button>
        </div>
        </div>
      </div>

      <div style={{
        marginTop: expanded ? 12 : 0,
        background: '#FAFAFB', border: `1px solid ${SNOW.borderSoft}`, borderRadius: 16, overflow: 'hidden',
        maxHeight: expanded ? 800 : 0, opacity: expanded ? 1 : 0,
        transition: 'max-height .5s cubic-bezier(.2,.8,.2,1), opacity .3s ease, margin .3s ease',
        boxShadow: '0 1px 2px rgba(0,0,0,.03)',
      }}>
        {variants.length > 1 ? (
          <div style={{ padding: '18px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', borderBottom: `1px solid ${SNOW.borderSoft}`, background: '#fff' }}>
            <div style={{ display: 'inline-flex', background: SNOW.surface, borderRadius: 8, padding: 3, gap: 2 }}>
              {variants.slice(0, 4).map((v, i) => (
                <button key={v.psa_spec_id} onClick={() => setTabIdx(i)} style={{
                  padding: '6px 12px', fontSize: 11, fontFamily: FONT.display, fontWeight: 500,
                  color: i === tabIdx ? SNOW.ink : SNOW.muted,
                  background: i === tabIdx ? 'rgba(255,255,255,0.95)' : 'transparent',
                  border: 'none', borderRadius: 6, cursor: 'pointer',
                  boxShadow: i === tabIdx ? '0 1px 3px rgba(0,0,0,.08), inset 0 1px 0 rgba(255,255,255,1)' : 'none',
                  transition: 'all .15s ease',
                }} title={`Spec PSA ${v.psa_spec_id}`}>{varietyLabel(v.variety)}</button>
              ))}
            </div>
            <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data, fontWeight: 500 }}>{total.toLocaleString('fr-FR')} cartes notées</span>
          </div>
        ) : null}

        <div className="kgrid-stat" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: SNOW.border, borderBottom: `1px solid ${SNOW.borderSoft}` }}>
          <KpiCell label="Total noté" value={total.toLocaleString('fr-FR')} sub="PSA seulement" />
          <KpiCell label="Gem rate" value={`${gemRate.toFixed(2).replace('.', ',')} %`} valueColor="#00A368" sub={`${pop10.toLocaleString('fr-FR')} PSA 10`} />
          <KpiCell label="Cartes 9+" value={pop9plus.toLocaleString('fr-FR')} sub={`${nine_plus_pct.toFixed(1).replace('.', ',')} % du total`} />
          <KpiCell label="Pic" value={`PSA ${peakGrade}`} valueColor="#A32D2D" sub={`${peakCount.toLocaleString('fr-FR')} cartes`} />
        </div>

        <p style={{ padding: '18px 22px 4px', fontSize: 13, color: '#48484A', lineHeight: 1.55, margin: 0 }}>
          La majorité des cartes envoyées à PSA reçoivent une note entre <strong style={{ color: SNOW.ink, fontWeight: 500 }}>5 et 8</strong>. <span style={{ color: '#A32D2D', fontWeight: 500 }}>PSA {peakGrade} domine</span> avec {peakCount.toLocaleString('fr-FR')} exemplaires — les cartes vintage ont vécu.
        </p>

        <div style={{ padding: '8px 22px 0', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0 4px' }}>
            <span style={{ fontSize: 10, color: SNOW.mutedLight, textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 500, fontFamily: FONT.display }}>Distribution par grade</span>
            <span style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <span style={{ display: 'inline-flex', width: 14, height: 14, borderRadius: '50%', background: SNOW.borderSoft, color: SNOW.mutedLight, alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 500 }}>i</span>
              Passe la souris sur une barre
            </span>
          </div>

          <div style={{ height: 160, position: 'relative', padding: '12px 0 0' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, height: 1, background: SNOW.border }} />
            {SHOWN.map((g, i) => {
              const c = counts[i]
              const h = maxBar > 0 ? (c / maxBar) * 108 : 0
              const isPeak = g === peakGrade || (g === '≤5' && peakGrade === '5')
              const isGem = g === '10'
              const isDim = c === 0
              const barBg = isPeak ? 'linear-gradient(180deg,#A32D2D 0%,#791F1F 100%)'
                          : isGem ? 'linear-gradient(180deg,#00A368 0%,#007D4F 100%)'
                          : isDim ? '#E5E5EA'
                          : SNOW.ink
              const lblColor = isPeak ? '#A32D2D' : isGem ? '#00A368' : SNOW.ink
              return (
                <div key={g} title={`PSA ${g} · ${c.toLocaleString('fr-FR')}`} style={{
                  position: 'absolute', bottom: 24, left: `${2 + i * 13.5}%`, width: '11.5%',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform .15s ease',
                }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}>
                  <span style={{ position: 'absolute', width: '100%', textAlign: 'center' as const, top: -19, fontSize: 10, color: lblColor, fontFamily: FONT.data, fontWeight: 500, whiteSpace: 'nowrap' as const }}>{c === 0 ? '—' : c.toLocaleString('fr-FR')}</span>
                  <div style={{ width: '100%', height: Math.max(1, h), background: barBg, borderRadius: '5px 5px 0 0' }} />
                  <span style={{ position: 'absolute', width: '100%', textAlign: 'center' as const, bottom: -22, fontSize: 11, color: lblColor, fontFamily: FONT.data, fontWeight: 500 }}>{g}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 22px', fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.display, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500, background: '#fff', borderTop: `1px solid ${SNOW.borderSoft}`, marginTop: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00A368' }} />Gem mint · rare</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>Played · commun<span style={{ width: 8, height: 8, borderRadius: '50%', background: '#A32D2D' }} /></span>
        </div>
      </div>
    </div>
  )
}

function KpiCell({ label, value, valueColor, sub }: { label: string; value: string; valueColor?: string; sub: string }) {
  return (
    <div style={{ background: '#FAFAFB', padding: '13px 18px' }}>
      <div style={{ fontSize: 9, color: SNOW.mutedLight, textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontWeight: 500, fontFamily: FONT.display, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 500, fontFamily: FONT.display, letterSpacing: '-0.01em', color: valueColor || SNOW.ink }}>{value}</div>
      <div style={{ fontSize: 10, color: SNOW.mutedLight, marginTop: 1, fontFamily: FONT.data }}>{sub}</div>
    </div>
  )
}
