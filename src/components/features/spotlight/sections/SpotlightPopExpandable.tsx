'use client'

// ─────────────────────────────────────────────────────────────────────────────
// POPULATION GRADÉE — bloc unifié multi-sociétés (PSA + CCC).
// Fetch /api/graded-pop (une source, deux populations normalisées).
// Sélecteur PSA | CCC (si >= 2 sociétés) → UX unique quelle que soit la carte.
// Pour la société choisie : anneau gem rate (synthèse) + barres par note (détail).
// Free/pro : teaser locké (total recensé, distribution masquée).
// Honnêteté : société sans population → message clair, jamais d'écran blanc.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { SNOW, FONT } from '../snowTokens'

interface DistRow { grade: number; count: number; label: string | null }
interface CompanyPop {
  company: 'PSA' | 'CCC'
  popTotal: number
  gemRate: number
  distribution: DistRow[]
}
interface GradedPopResponse {
  locked?: boolean
  companies?: CompanyPop[]
  lang?: string
}

// Couleurs par société (badge + barres).
const COMPANY_META: Record<string, { label: string; sub: string; barFrom: string; barTo: string }> = {
  PSA: { label: 'PSA', sub: 'Société de gradation américaine', barFrom: '#00A368', barTo: '#1aa877' },
  CCC: { label: 'CCC', sub: 'Société de gradation française', barFrom: '#185FA5', barTo: '#2774c4' },
}

// Libellé d'une note (gère les labels CCC Gold/Black).
function gradeLabel(company: string, d: DistRow): string {
  if (company === 'CCC') {
    if (d.label === 'GOLD') return `${d.grade} Gold`
    if (d.label === 'BLACK') return `${d.grade} Black`
    if (d.label === 'AUTHENTIC') return 'Auth'
  }
  return `${d.grade}`
}

// ── Sélecteur de société (segmented control Snow+) ───────────────────────────
function GraderSelector({
  companies, selected, onSelect,
}: { companies: string[]; selected: string; onSelect: (c: string) => void }) {
  if (companies.length < 2) return null
  return (
    <div style={{ display: 'inline-flex', background: SNOW.surface, borderRadius: 10, padding: 3, gap: 2, marginBottom: 16, border: `1px solid ${SNOW.border}` }}>
      {companies.map((c) => {
        const on = c === selected
        return (
          <button
            key={c}
            onClick={() => onSelect(c)}
            style={{
              padding: '7px 18px', fontSize: 12.5, fontFamily: FONT.display, fontWeight: 700,
              color: on ? '#fff' : SNOW.muted,
              background: on ? '#1D1D1F' : 'transparent',
              border: 'none', borderRadius: 8, cursor: 'pointer', letterSpacing: '.02em',
              boxShadow: on ? '0 1px 3px rgba(0,0,0,.14)' : 'none', transition: 'all .15s ease',
            }}
          >
            {c}
          </button>
        )
      })}
    </div>
  )
}

export function SpotlightPopExpandable({ cardId, lang }: { cardId: string; lang?: string }) {
  const [companies, setCompanies] = useState<CompanyPop[]>([])
  const [locked, setLocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const langParam = lang ? `&lang=${encodeURIComponent(lang)}` : ''
    fetch(`/api/graded-pop?card_id=${encodeURIComponent(cardId)}${langParam}`)
      .then(r => r.json())
      .then((j: GradedPopResponse) => {
        if (cancelled) return
        setCompanies(j?.companies ?? [])
        setLocked(!!j?.locked)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId, lang])

  if (loading) return null

  // Aucune population (aucune société) → message honnête pour FR/JP, rien sinon.
  if (companies.length === 0) {
    const L = String(lang || '').toUpperCase()
    if (L === 'FR' || L === 'JP') {
      const langLabel = L === 'FR' ? 'française' : 'japonaise'
      return (
        <div style={{ padding: '14px 22px', background: '#FFF8E6', border: '1px solid #FCD34D', borderRadius: 16, fontSize: 12, color: '#92400E', fontFamily: FONT.body, lineHeight: 1.55 }}>
          <strong>Population gradée {langLabel} indisponible.</strong> Les sociétés de gradation n'ont pas encore recensé suffisamment d'exemplaires de cette carte dans cette langue.
        </div>
      )
    }
    return null
  }

  const companyKeys = companies.map(c => c.company)
  const active = (selected && companyKeys.includes(selected as 'PSA' | 'CCC')) ? selected : companyKeys[0]
  const sel = companies.find(c => c.company === active) ?? companies[0]
  const meta = COMPANY_META[sel.company]
  const gem = (sel.gemRate ?? 0) * 100

  // Teaser locké (free/pro) : total recensé, distribution masquée.
  if (locked) {
    return (
      <div style={{ position: 'relative', overflow: 'hidden', background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)', padding: '18px 20px' }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 500, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 12, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 12, background: '#1D1D1F', borderRadius: 2 }} />
          Population gradée
        </h2>
        <GraderSelector companies={companyKeys} selected={active} onSelect={setSelected} />
        <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: '4px 0 14px', lineHeight: 1.5 }}>
          Combien de cartes de cette référence existent notées par <strong style={{ color: SNOW.ink, fontWeight: 500 }}>{meta.label}</strong> ?
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 600, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.02em' }}>{sel.popTotal.toLocaleString('fr-FR')}</span>
          <span style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.display }}>exemplaires {meta.label} recensés</span>
        </div>
        <a href="/abonnement" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 4, fontSize: 12, fontWeight: 500, color: SNOW.muted, fontFamily: FONT.display, textDecoration: 'none' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={SNOW.mutedLight} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
          Distribution complète des notes
          <span style={{ color: '#E03020', fontWeight: 700 }}>Premium</span>
        </a>
      </div>
    )
  }

  // Premium : sélecteur + anneau gem rate + barres par note.
  const dist = sel.distribution.slice().sort((a, b) => b.grade - a.grade || (a.label === 'GOLD' ? -1 : 1))
  const maxCount = Math.max(...dist.map(d => d.count), 1)
  const pop10 = dist.filter(d => d.grade === 10).reduce((s, d) => s + d.count, 0)

  let peakGrade = '—', peakCount = 0
  for (const d of dist) { if (d.count > peakCount) { peakCount = d.count; peakGrade = gradeLabel(sel.company, d) } }

  return (
    <div className="kc-section-card" style={{ background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)', padding: '14px 18px' }}>
      <h2 style={{ fontFamily: FONT.display, fontSize: 11, fontWeight: 500, color: SNOW.muted, textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8, position: 'relative' as const, paddingLeft: 12 }}>
        <span style={{ position: 'absolute' as const, left: 0, top: '50%', transform: 'translateY(-50%)', width: 3, height: 12, background: '#1D1D1F', borderRadius: 2 }} />
        Population gradée
      </h2>

      {/* Sélecteur de société (si >= 2) */}
      <GraderSelector companies={companyKeys} selected={active} onSelect={setSelected} />

      {/* En-tête société : badge + libellé + total */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 8, background: '#1D1D1F', color: '#fff', fontSize: 12.5, fontWeight: 800, fontFamily: FONT.display, letterSpacing: '.02em' }}>
          {meta.label}
        </div>
        <span style={{ fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.body }}>{meta.sub}</span>
        <span style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.data, marginLeft: 'auto' }}>
          {sel.popTotal.toLocaleString('fr-FR')} exemplaires
        </span>
      </div>

      {/* Anneau gem rate (synthèse) */}
      <div style={{ position: 'relative' as const, display: 'flex', alignItems: 'center', gap: 14, padding: 16, background: 'rgba(255,255,255,0.45)', backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)', borderRadius: 14, border: 'none', boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)', overflow: 'hidden' as const, marginBottom: 16 }}>
        <svg viewBox="0 0 44 44" style={{ width: 44, height: 44, flexShrink: 0 }}>
          <circle cx="22" cy="22" r="18" stroke={SNOW.borderSoft} strokeWidth="6" fill="none" />
          <circle cx="22" cy="22" r="18" stroke={meta.barFrom} strokeWidth="6" fill="none" strokeDasharray={113.1} strokeDashoffset={113.1 - (gem / 100) * 113.1} transform="rotate(-90 22 22)" strokeLinecap="round" />
          <text x="22" y="26" textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="10" fontWeight="500" fill={SNOW.ink}>{gem.toFixed(1).replace('.', ',')}%</text>
        </svg>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, color: SNOW.mutedLight, margin: '0 0 3px' }}>Gem rate (notes 10)</p>
          <p style={{ fontSize: 15, fontWeight: 500, color: SNOW.ink, fontFamily: FONT.display, letterSpacing: '-0.01em', margin: 0 }}>{pop10.toLocaleString('fr-FR')} {meta.label} 10 / {sel.popTotal.toLocaleString('fr-FR')}</p>
          <p style={{ fontSize: 11, color: '#48484A', margin: '4px 0 0', lineHeight: 1.45 }}>
            {gem < 10 ? 'Seules ' : ''}<strong style={{ color: SNOW.ink, fontWeight: 500 }}>{gem.toFixed(1).replace('.', ',')} %</strong> des cartes gradées atteignent la note maximale.
          </p>
        </div>
      </div>

      {/* Barres par note (détail) */}
      <div style={{ fontSize: 10.5, color: SNOW.mutedLight, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' as const, fontFamily: FONT.display, marginBottom: 12 }}>
        Population par note
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: '4px 12px', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Note</div>
        <div style={{ fontSize: 10, color: SNOW.mutedLight, fontFamily: FONT.data, textTransform: 'uppercase' as const, letterSpacing: '.04em' }}>Population</div>
      </div>
      {dist.map((d, i) => {
        const isPeak = gradeLabel(sel.company, d) === peakGrade
        const isGem = d.grade === 10
        return (
          <div key={`${d.grade}-${d.label}-${i}`} style={{ display: 'grid', gridTemplateColumns: '74px 1fr', gap: '0 12px', alignItems: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: d.label === 'GOLD' ? '#C77700' : d.label === 'BLACK' ? '#1D1D1F' : SNOW.ink, fontFamily: FONT.data }}>
              {meta.label} {gradeLabel(sel.company, d)}
            </div>
            <div style={{ position: 'relative', height: 20, background: SNOW.surfaceSoft, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${Math.max((d.count / maxCount) * 100, 3)}%`, background: isGem ? `linear-gradient(90deg,${meta.barFrom},${meta.barTo})` : isPeak ? 'linear-gradient(90deg,#A32D2D,#791F1F)' : `linear-gradient(90deg,${meta.barFrom},${meta.barTo})`, borderRadius: 5, opacity: isGem || isPeak ? 1 : 0.82 }} />
              <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, display: 'flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color: (d.count / maxCount) > 0.28 ? '#fff' : SNOW.muted, fontFamily: FONT.data }}>
                {d.count.toLocaleString('fr-FR')}
              </div>
            </div>
          </div>
        )
      })}

      <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 14, lineHeight: 1.5 }}>
        Population {meta.label} officielle{sel.company === 'PSA' ? ', filtrée sur la langue de la carte' : ''}.
      </div>
    </div>
  )
}
