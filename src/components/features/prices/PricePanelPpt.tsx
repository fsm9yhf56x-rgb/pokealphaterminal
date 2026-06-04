'use client'

import { useEffect, useState, useMemo } from 'react'
import { formatEUR } from '@/lib/formatPrice'

const SNOW = {
  ink: '#1D1D1F', surface: '#F5F5F7', border: '#E5E5EA', borderDark: '#C7C7CC',
  muted: '#6E6E73', mutedSoft: '#86868B', dim: '#AEAEB2',
}
const ACCENT = '#E03020'
const GREEN = '#1D9E75'
const AMBER = '#E08A1F'

type Condition = { code: string; label: string; price: number | null; incoherent: boolean }
type Graded = {
  company: string; grade: string; smartPrice: number | null; median: number | null
  count: number | null; confidence: string | null; trend: string | null
}
type ApiResp = {
  currency: string
  market: number | null
  conditions: Condition[]
  graded: Graded[]
  gradedUpdatedAt: string | null
  _matched: { set_name: string; card_number: string; card_name: string; edition: string } | null
}

interface Props {
  cardId: string
  fallbackMarket?: number | null
  fallbackSources?: { label: string; price: number | null | undefined; color: string }[]
}

function TrendArrow({ trend }: { trend: string | null }) {
  if (trend === 'up') return <span style={{ color: GREEN, fontSize: 13 }}>▲</span>
  if (trend === 'down') return <span style={{ color: ACCENT, fontSize: 13 }}>▼</span>
  if (trend === 'stable') return <span style={{ color: SNOW.mutedSoft, fontSize: 13 }}>▬</span>
  return null
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export function PricePanelPpt({ cardId, fallbackMarket, fallbackSources }: Props) {
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)
  const [selCond, setSelCond] = useState<string>('NM')
  const [selCompany, setSelCompany] = useState<string>('')
  const [selGrade, setSelGrade] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/prices/graded-current?tcg_card_id=${encodeURIComponent(cardId)}`)
      .then((r) => r.json())
      .then((j: ApiResp) => { if (!cancelled) setData(j) })
      .catch(() => { if (!cancelled) setData(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [cardId])

  const gradedByCompany = useMemo(() => {
    const map: Record<string, Graded[]> = {}
    for (const g of data?.graded ?? []) {
      if (!map[g.company]) map[g.company] = []
      map[g.company].push(g)
    }
    return map
  }, [data])

  const companies = useMemo(() => Object.keys(gradedByCompany), [gradedByCompany])

  useEffect(() => {
    if (!data) return
    const conds = data.conditions || []
    const nmOk = conds.find((c) => c.code === 'NM' && !c.incoherent && c.price != null)
    const firstOk = conds.find((c) => !c.incoherent && c.price != null)
    setSelCond((nmOk || firstOk || conds[0])?.code || 'NM')
    const comps = Object.keys(
      (data.graded || []).reduce((a: Record<string, boolean>, g) => { a[g.company] = true; return a }, {})
    )
    setSelCompany(comps.includes('PSA') ? 'PSA' : comps[0] || '')
  }, [data])

  useEffect(() => {
    if (!selCompany) return
    const grades = (gradedByCompany[selCompany] || []).map((g) => g.grade)
    if (grades.length && !grades.includes(selGrade)) {
      const sorted = [...grades].sort((a, b) => parseFloat(b) - parseFloat(a))
      setSelGrade(sorted[0])
    }
  }, [selCompany, gradedByCompany]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasPpt = !!data && (data.market != null || (data.conditions?.length ?? 0) > 0 || (data.graded?.length ?? 0) > 0)

  // ── Fallback prices_snapshots (FR/JP) ──
  if (!loading && !hasPpt) {
    const fbSources = (fallbackSources || []).filter((s) => s.price != null && s.price > 0)
    if (fallbackMarket == null && fbSources.length === 0) return null
    return (
      <div style={S.container}>
        <div style={S.header}><span style={S.headerLabel}>Prix marché</span><span style={S.srcBadge}>Sources marché</span></div>
        <div className="ppt-bigprice" style={S.bigPrice}>{formatEUR(fallbackMarket ?? null, 'small')}</div>
        {fbSources.length > 0 && (
          <div className="kgrid-stat" style={{ ...S.condGrid, marginTop: 14 }}>
            {fbSources.map((s) => (
              <div key={s.label} style={S.condCell}>
                <span style={S.condLabel}>{s.label}</span>
                <span style={S.condPrice}>{formatEUR(s.price ?? null, 'small')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={S.container}>
        <div style={{ ...S.skeleton, width: '40%', height: 32, marginBottom: 16 }} />
        <div style={{ ...S.skeleton, width: '100%', height: 36, marginBottom: 12 }} />
        <div style={{ ...S.skeleton, width: '100%', height: 36 }} />
        <style>{`@keyframes pptShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    )
  }
  if (!data) return null

  // ── RAW selectionne ──
  const selCondObj = data.conditions.find((c) => c.code === selCond) || null
  const rawReliable = selCondObj != null && !selCondObj.incoherent

  // ── GRADE selectionne ──
  const selGradeObj = (gradedByCompany[selCompany] || []).find((g) => g.grade === selGrade) || null
  const gradeGrades = (gradedByCompany[selCompany] || [])
    .map((g) => g.grade)
    .sort((a, b) => parseFloat(b) - parseFloat(a))
  const conf = selGradeObj?.confidence || null
  const gradeLow = conf === 'low' && selGradeObj?.count != null && selGradeObj.count < 5

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .ppt-card { padding: 9px 11px !important; margin-bottom: 10px !important; }
          .ppt-bigprice { font-size: 20px !important; letter-spacing: -0.5px !important; line-height: 1 !important; }
          .ppt-divider { margin-top: 6px !important; padding-top: 6px !important; }
          .ppt-sellabel { margin-top: 5px !important; margin-bottom: 2px !important; font-size: 8px !important; }
          .ppt-pillrow { margin-top: 4px !important; gap: 4px !important; }
          .ppt-card button { padding: 4px 8px !important; font-size: 10px !important; }
          .ppt-card .kgrid-stat > div { padding: 4px 4px !important; }
          /* Header de bloc (label + badge) tasse */
          .ppt-card .ppt-section > div:first-child { margin-bottom: 4px !important; }
        }
      `}</style>
      {/* ═══ CARTE VALEUR DE MARCHÉ (raw + gradé fusionnés) ═══ */}
      {(data.conditions.length > 0 || companies.length > 0) && (
      <div className="ppt-card" style={S.container}>

      {/* ─── Section RAW ─── */}
      {data.conditions.length > 0 && (
        <div>
          <div style={S.header}>
            <span style={S.headerLabel}>Prix raw</span>
            <span style={S.srcBadge}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: GREEN, marginRight: 5, display: 'inline-block' }} />
              {selCondObj?.label || selCond}
            </span>
          </div>

          {rawReliable ? (
            <div className="ppt-bigprice" style={S.bigPrice}>{formatEUR(selCondObj?.price ?? null, 'small')}</div>
          ) : (
            <div>
              <div style={S.insufficientTitle}>Donnée non fiable</div>
              <div style={S.insufficientSub}>
                Prix relevé : {formatEUR(selCondObj?.price ?? null, 'small')} · ventes trop rares pour cet état
              </div>
            </div>
          )}

          <div className="ppt-pillrow" style={S.pillRow}>
            {data.conditions.map((c) => {
              const active = c.code === selCond
              return (
                <button
                  key={c.code}
                  onClick={() => setSelCond(c.code)}
                  style={{
                    ...S.pill,
                    ...(active ? S.pillActive : {}),
                    ...(c.incoherent && !active ? { opacity: 0.4 } : {}),
                  }}
                  title={c.incoherent ? 'Prix peu fiable (ventes rares)' : c.label}
                >
                  {c.code}
                  {c.incoherent && <span style={{ color: AMBER, marginLeft: 3 }}>·</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Section GRADÉ (séparée par un filet, même carte) ─── */}
      {companies.length > 0 && (
        <div className="ppt-divider" style={data.conditions.length > 0 ? S.innerDivider : undefined}>
          <div style={S.header}>
            <span style={S.headerLabel}>Prix gradé</span>
            <span style={S.srcBadge}>{selCompany} {selGrade}</span>
          </div>

          {selGradeObj == null ? (
            <div className="ppt-bigprice" style={S.bigPrice}>—</div>
          ) : gradeLow ? (
            // Confiance faible: prix visible mais en gris attenue + badge prudence
            <>
              <div className="ppt-bigprice" style={{ ...S.bigPrice, color: SNOW.muted }}>
                <TrendArrow trend={selGradeObj.trend} />{' '}
                {formatEUR(selGradeObj.smartPrice ?? selGradeObj.median, 'small')}
              </div>
              <div style={S.gradeMetaRow}>
                <span style={{ ...S.confTag, background: 'rgba(224,138,31,0.14)', color: AMBER }}>⚠ Fiabilité faible</span>
                {selGradeObj.count != null && (
                  <span style={S.gradeMeta}>
                    {selGradeObj.count} vente{selGradeObj.count > 1 ? 's' : ''} · prix indicatif
                  </span>
                )}
                {fmtDate(data.gradedUpdatedAt) && (
                  <span style={S.gradeMeta}>· MAJ {fmtDate(data.gradedUpdatedAt)}</span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="ppt-bigprice" style={S.bigPrice}>
                <TrendArrow trend={selGradeObj.trend} />{' '}
                {formatEUR(selGradeObj.smartPrice, 'small')}
              </div>
              <div style={S.gradeMetaRow}>
                {conf === 'high' ? (
                  <span style={{ ...S.confTag, background: 'rgba(29,158,117,0.12)', color: GREEN }}>✓ Fiable</span>
                ) : (
                  <span style={{ ...S.confTag, background: 'rgba(224,138,31,0.12)', color: AMBER }}>≈ Estimation</span>
                )}
                {selGradeObj.count != null && (
                  <span style={S.gradeMeta}>{selGradeObj.count} vente{selGradeObj.count > 1 ? 's' : ''} eBay</span>
                )}
                {fmtDate(data.gradedUpdatedAt) && (
                  <span style={S.gradeMeta}>· MAJ {fmtDate(data.gradedUpdatedAt)}</span>
                )}
              </div>
            </>
          )}

          <div className="ppt-sellabel" style={S.selLabel}>Société</div>
          <div className="ppt-pillrow" style={S.pillRow}>
            {companies.map((co) => (
              <button key={co} onClick={() => setSelCompany(co)} style={{ ...S.pill, ...(co === selCompany ? S.pillActive : {}) }}>
                {co}
              </button>
            ))}
          </div>

          <div className="ppt-sellabel" style={S.selLabel}>Note</div>
          <div className="ppt-pillrow" style={S.pillRow}>
            {gradeGrades.map((gr) => {
              const gObj = (gradedByCompany[selCompany] || []).find((g) => g.grade === gr)
              const isLow = gObj?.confidence === 'low' && gObj?.count != null && gObj.count < 5
              return (
                <button
                  key={gr}
                  onClick={() => setSelGrade(gr)}
                  style={{ ...S.pill, ...(gr === selGrade ? S.pillActive : {}), ...(isLow && gr !== selGrade ? { opacity: 0.5 } : {}) }}
                  title={isLow ? 'Données insuffisantes (peu de ventes)' : `${selCompany} ${gr}`}
                >
                  {gr}
                </button>
              )
            })}
          </div>
        </div>
      )}

      </div>
      )}

      {(data.conditions.length > 0 || companies.length > 0) && (
        <div style={{ ...S.footer, marginTop: -6, marginBottom: 14 }}>
          <span style={S.footerText}>USD→EUR · fiabilité selon le volume de ventes</span>
        </div>
      )}
    </>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.72)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    borderRadius: 16, padding: '18px 20px', marginBottom: 14,
    border: '1px solid rgba(0,0,0,0.05)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-sora, Sora, sans-serif)',
  },
  innerDivider: {
    marginTop: 18, paddingTop: 18,
    borderTop: '1px solid rgba(0,0,0,0.07)',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  headerLabel: { fontSize: 10, color: SNOW.mutedSoft, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 },
  srcBadge: {
    fontSize: 9.5, color: GREEN, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600,
    display: 'flex', alignItems: 'center', padding: '2px 8px',
    background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)', borderRadius: 99,
  },
  bigPrice: {
    fontSize: 32, fontWeight: 700, color: SNOW.ink,
    fontFamily: 'var(--font-data, "Space Mono", monospace)', letterSpacing: '-0.8px', lineHeight: 1,
    display: 'flex', alignItems: 'center', gap: 6,
  },
  insufficientTitle: {
    fontSize: 18, fontWeight: 700, color: SNOW.muted,
    fontFamily: 'var(--font-sora, Sora, sans-serif)', letterSpacing: '-0.3px', lineHeight: 1.1,
  },
  insufficientSub: {
    fontSize: 11.5, color: SNOW.mutedSoft, fontFamily: 'var(--font-sora, Sora, sans-serif)',
    marginTop: 6, lineHeight: 1.4,
  },
  gradeMetaRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 },
  confTag: { fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', padding: '2px 7px', borderRadius: 99 },
  gradeMeta: { fontSize: 11, color: SNOW.mutedSoft, fontFamily: 'var(--font-sora, Sora, sans-serif)' },
  selLabel: { fontSize: 9, color: SNOW.mutedSoft, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginTop: 16, marginBottom: 4 },
  pillRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  pill: {
    padding: '7px 14px', borderRadius: 10,
    border: '1px solid rgba(0,0,0,0.06)',
    background: 'rgba(255,255,255,0.45)',
    backdropFilter: 'blur(10px) saturate(160%)',
    WebkitBackdropFilter: 'blur(10px) saturate(160%)',
    color: SNOW.muted, fontSize: 12, fontWeight: 600,
    cursor: 'pointer', fontFamily: 'var(--font-data, "Space Mono", monospace)',
    letterSpacing: '-0.01em',
    transition: 'all .18s cubic-bezier(.2,.85,.3,1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.03)',
  },
  pillActive: {
    background: 'linear-gradient(180deg, #2A2A2E 0%, #1D1D1F 100%)',
    color: '#fff', border: '1px solid rgba(0,0,0,0.3)', fontWeight: 700,
    boxShadow: '0 4px 12px rgba(0,0,0,0.22), 0 1px 3px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.18)',
    transform: 'translateY(-0.5px)',
  },
  condGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 },
  condCell: {
    background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 9,
    padding: '8px 4px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 4,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
  },
  condLabel: { fontSize: 9, fontWeight: 700, color: SNOW.mutedSoft, fontFamily: 'var(--font-data, "Space Mono", monospace)' },
  condPrice: { fontSize: 11.5, fontWeight: 700, color: SNOW.ink, fontFamily: 'var(--font-data, "Space Mono", monospace)', letterSpacing: '-0.2px' },
  footer: { paddingTop: 10, textAlign: 'right' },
  footerText: { fontSize: 9, color: SNOW.dim, fontFamily: 'var(--font-data, "Space Mono", monospace)' },
  skeleton: {
    background: 'linear-gradient(90deg, rgba(245,245,247,0.6) 0%, rgba(0,0,0,0.05) 50%, rgba(245,245,247,0.6) 100%)',
    backgroundSize: '200% 100%', borderRadius: 6, animation: 'pptShimmer 1.4s ease-in-out infinite',
  },
}
