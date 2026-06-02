'use client'

import { usePsaPop } from './hooks/usePsaPop'
import { toCanonicalRef } from '@/lib/psa/canonical'
import type { PsaPopVariant } from '@/lib/psa/types'

const SNOW = {
  ink: '#1D1D1F', surface: '#F5F5F7', border: '#E5E5EA', borderDark: '#C7C7CC',
  muted: '#6E6E73', mutedSoft: '#86868B',
}
const ACCENT = '#E03020'
const GREEN = '#1D9E75'

interface Props {
  cardId: string
  hideWhenEmpty?: boolean
}

function resolveEdition(cardId: string): { variety: string | null; label: string; cleanRef: string } {
  const ref = toCanonicalRef(cardId)
  const parts = ref.split('-')
  const localId = parts[parts.length - 1]
  const setId = parts.slice(0, -1).join('-')

  let variety: string | null = null
  let label = 'Unlimited'
  if (/-shadowless(-ns)?$/.test(setId)) { variety = 'Shadowless'; label = 'Shadowless' }
  else if (/-1st$/.test(setId)) { variety = '1st Edition'; label = '1re Edition' }

  const baseSetId = setId.replace(/-shadowless(-ns)?$|-1st$/g, '')
  const cleanRef = `${baseSetId}-${localId}`
  return { variety, label, cleanRef }
}

const GRADES: { key: keyof PsaPopVariant; label: string }[] = [
  { key: 'pop_10', label: 'PSA 10' },
  { key: 'pop_9_5', label: 'PSA 9.5' },
  { key: 'pop_9', label: 'PSA 9' },
  { key: 'pop_8_5', label: 'PSA 8.5' },
  { key: 'pop_8', label: 'PSA 8' },
]

export function PsaPopBlock({ cardId, hideWhenEmpty = false }: Props) {
  const { variety, label, cleanRef } = resolveEdition(cardId)
  const { data, isLoading, error } = usePsaPop(cleanRef)

  if (hideWhenEmpty && (isLoading || !data?.hasData)) return null

  const allVariants: PsaPopVariant[] = data
    ? [...(data.variants || []), ...(data.premiumVariants || [])]
    : []

  const matchVariety = (v: PsaPopVariant) => {
    if (variety === null) return v.variety === null || v.variety === '' || v.variety === 'Base Set 1999-2000'
    return v.variety === variety
  }
  const edition = allVariants.find(matchVariety) || null

  const errorVariants = allVariants.filter(
    (v) => v !== edition && v.variety && v.pop_total > 0 &&
           !['Base Set 1999-2000', '1st Edition', 'Shadowless'].includes(v.variety)
  )

  return (
    <div style={S.container}>
      <div style={S.header}>
        <span style={S.headerLabel}>POPULATION PSA</span>
        {edition?.pop_total ? (
          <span style={S.totalBadge}>{edition.pop_total.toLocaleString('fr-FR')} gradés</span>
        ) : null}
      </div>

      {isLoading && (
        <div style={S.empty}>
          <div style={{ ...S.skeletonRow, animationDelay: '0ms' }} />
          <div style={{ ...S.skeletonRow, animationDelay: '100ms' }} />
          <div style={{ ...S.skeletonRow, animationDelay: '200ms' }} />
          <style>{`@keyframes psaPopShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        </div>
      )}

      {!isLoading && error && (
        <div style={S.empty}><span style={{ color: SNOW.muted, fontSize: 13 }}>Erreur de chargement</span></div>
      )}

      {!isLoading && !error && !edition && (
        <div style={S.empty}>
          <span style={{ color: SNOW.muted, fontSize: 13, textAlign: 'center', padding: '12px 16px' }}>
            Pas encore de données PSA pour cette édition. Couverture en cours d&apos;extension.
          </span>
        </div>
      )}

      {!isLoading && !error && edition && (
        <div style={{ padding: '14px 16px' }}>
          <div style={S.editionRow}>
            <span style={S.editionLabel}>Édition</span>
            <span style={S.editionValue}>{label}</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
            {(() => {
              const total = edition.pop_total || 1
              const maxPop = Math.max(...GRADES.map((g) => Number(edition[g.key] ?? 0)), 1)
              const rows = GRADES
                .map((g) => ({ ...g, pop: edition[g.key] as number | null }))
                .filter((g) => g.pop != null && g.pop > 0)
              if (rows.length === 0) {
                return <div style={{ fontSize: 12, color: SNOW.muted, fontFamily: 'var(--font-sora, Sora, sans-serif)' }}>Détail par note indisponible.</div>
              }
              return rows.map((g) => {
                const pop = Number(g.pop)
                const pctOfTotal = (pop / total) * 100
                const barW = (pop / maxPop) * 100
                const isGem = g.key === 'pop_10'
                return (
                  <div key={g.label} style={S.gradeRow}>
                    <span style={S.gradeLabel}>{g.label}</span>
                    <div style={S.barTrack}>
                      <div style={{ ...S.barFill, width: `${barW}%`, background: isGem ? GREEN : SNOW.borderDark }} />
                    </div>
                    <span style={S.gradeCount}>{pop.toLocaleString('fr-FR')}</span>
                    <span style={S.gradePct}>{pctOfTotal.toFixed(1)}%</span>
                  </div>
                )
              })
            })()}
            {(() => {
              const total = edition.pop_total || 0
              const detailed = GRADES.reduce((a, g) => a + Number(edition[g.key] ?? 0), 0)
              const others = total - detailed
              if (others <= 0) return null
              const maxPop = Math.max(...GRADES.map((g) => Number(edition[g.key] ?? 0)), others, 1)
              const barW = (others / maxPop) * 100
              const pctOfTotal = (others / (total || 1)) * 100
              return (
                <div style={S.gradeRow}>
                  <span style={{ ...S.gradeLabel, color: SNOW.mutedSoft }}>Autres</span>
                  <div style={S.barTrack}>
                    <div style={{ ...S.barFill, width: `${barW}%`, background: SNOW.border }} />
                  </div>
                  <span style={{ ...S.gradeCount, color: SNOW.muted }}>{others.toLocaleString('fr-FR')}</span>
                  <span style={S.gradePct}>{pctOfTotal.toFixed(1)}%</span>
                </div>
              )
            })()}
          </div>

          <div style={S.statsRow}>
            <div style={S.statCell}>
              <span style={S.statLabel}>Gem rate</span>
              <span style={{ ...S.statValue, color: GREEN }}>{Number(edition.pct_gem_mint ?? 0).toFixed(2)}%</span>
            </div>
            <div style={S.statCell}>
              <span style={S.statLabel}>High grade</span>
              <span style={S.statValue}>{Number(edition.pct_high_grade ?? 0).toFixed(1)}%</span>
            </div>
          </div>

          <div style={S.metaRow}>
            <span style={S.metaText}>
              {edition.pop_total.toLocaleString('fr-FR')} cartes gradées
              {edition.scraped_at ? ` · MAJ ${new Date(edition.scraped_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}` : ''}
            </span>
            {(() => {
              const subj = (edition.subject_name || '').replace(/-/g, ' ').trim()
              const num = (edition.card_number || '').split('/')[0].replace(/\D/g, '')
              const term = [subj, num].filter(Boolean).join(' ')
              if (!term) return null
              const url = 'https://www.psacard.com/pop/search?q=' + encodeURIComponent(term)
              return (
                <a href={url} target="_blank" rel="noopener noreferrer" style={S.psaLink}>
                  Voir sur PSA
                </a>
              )
            })()}
          </div>

          {errorVariants.length > 0 && (
            <div style={S.errorsRow}>
              <span style={S.errorsLabel}>Autres</span>
              <span style={S.errorsList}>
                {errorVariants.map((v, i) => (
                  <span key={v.psa_spec_id}>
                    {i > 0 && <span style={{ color: SNOW.border }}> · </span>}
                    {v.variety} <span style={{ color: SNOW.mutedSoft }}>{v.pop_total.toLocaleString('fr-FR')}</span>
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  container: {
    background: 'rgba(255,255,255,0.75)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(0,0,0,0.05)',
    borderRadius: 14,
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
    fontFamily: 'var(--font-sora, Sora, sans-serif)',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.45)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
  },
  headerLabel: {
    fontFamily: 'var(--font-sora, Sora, sans-serif)', fontSize: 10, fontWeight: 700,
    letterSpacing: '0.08em', textTransform: 'uppercase', color: SNOW.mutedSoft,
  },
  totalBadge: { fontFamily: 'var(--font-data, "Space Mono", monospace)', fontSize: 11, color: SNOW.muted },
  editionRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  editionLabel: { fontSize: 10.5, color: SNOW.muted, fontWeight: 500, fontFamily: 'var(--font-sora, Sora, sans-serif)' },
  editionValue: { fontSize: 13, color: SNOW.ink, fontWeight: 700, fontFamily: 'var(--font-sora, Sora, sans-serif)', letterSpacing: '-0.01em' },
  gradeRow: { display: 'grid', gridTemplateColumns: '52px 1fr 56px 44px', alignItems: 'center', gap: 8 },
  gradeLabel: { fontSize: 11, fontWeight: 600, color: SNOW.ink, fontFamily: 'var(--font-data, "Space Mono", monospace)' },
  barTrack: { height: 6, background: 'rgba(0,0,0,0.05)', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3, transition: 'width 500ms cubic-bezier(0.22,1,0.36,1)' },
  gradeCount: { fontSize: 11, color: SNOW.ink, fontFamily: 'var(--font-data, "Space Mono", monospace)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },
  gradePct: { fontSize: 10, color: SNOW.mutedSoft, fontFamily: 'var(--font-data, "Space Mono", monospace)', textAlign: 'right' },
  statsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginTop: 14, paddingTop: 12,
    borderTop: '1px solid rgba(0,0,0,0.05)',
  },
  statCell: {
    background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 10,
    padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
  },
  statLabel: { fontSize: 9, color: SNOW.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, fontFamily: 'var(--font-sora, Sora, sans-serif)' },
  statValue: { fontSize: 14, fontWeight: 700, color: SNOW.ink, fontFamily: 'var(--font-data, "Space Mono", monospace)', letterSpacing: '-0.3px' },
  metaRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.08)', gap: 8, flexWrap: 'wrap',
  },
  metaText: { fontSize: 10, color: SNOW.mutedSoft, fontFamily: 'var(--font-data, "Space Mono", monospace)' },
  psaLink: {
    fontSize: 10, fontWeight: 700, color: ACCENT, textDecoration: 'none',
    fontFamily: 'var(--font-sora, Sora, sans-serif)', letterSpacing: '0.02em',
    padding: '3px 9px', borderRadius: 99, background: 'rgba(224,48,32,0.08)',
    border: '1px solid rgba(224,48,32,0.18)', transition: 'all .15s',
  },
  errorsRow: {
    marginTop: 12, paddingTop: 10, borderTop: '1px dashed rgba(0,0,0,0.08)',
    display: 'flex', gap: 8, alignItems: 'baseline',
  },
  errorsLabel: { fontSize: 9, color: SNOW.mutedSoft, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, flexShrink: 0, fontFamily: 'var(--font-sora, Sora, sans-serif)' },
  errorsList: { fontSize: 10.5, color: SNOW.muted, lineHeight: 1.6, fontFamily: 'var(--font-sora, Sora, sans-serif)' },
  empty: { minHeight: 80, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 14, gap: 8 },
  skeletonRow: {
    height: 14, background: 'linear-gradient(90deg, rgba(245,245,247,0.6) 0%, rgba(0,0,0,0.05) 50%, rgba(245,245,247,0.6) 100%)',
    backgroundSize: '200% 100%', borderRadius: 3, animation: 'psaPopShimmer 1.4s ease-in-out infinite',
  },
}
