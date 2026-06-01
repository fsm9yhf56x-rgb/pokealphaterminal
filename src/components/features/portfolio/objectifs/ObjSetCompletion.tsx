'use client'

import { useState, useEffect } from 'react'
import { getSets, type StaticSet } from '@/lib/cardDb'
import type { ObjAggregates, SetCompletionData } from './Objectifs'

/**
 * Complétion de sets auto-calculée :
 * - Sets présents dans le portfolio
 * - Total cartes du set fetché depuis sets-{LANG}.json
 * - Progress bar + valeur investie + estimation finition
 */
export function ObjSetCompletion({ agg }: { agg: ObjAggregates }) {
  const [setsByLang, setSetsByLang] = useState<Record<string, StaticSet>>({})
  const [loading, setLoading] = useState(true)

  // Load all sets data (FR + EN + JP) and build a single id → StaticSet map
  useEffect(() => {
    Promise.all([
      getSets('FR').catch(() => []),
      getSets('EN').catch(() => []),
      getSets('JP').catch(() => []),
    ]).then(([fr, en, jp]) => {
      const map: Record<string, StaticSet> = {}
      for (const s of [...fr, ...en, ...jp]) {
        if (s.id) map[s.id] = s
      }
      setSetsByLang(map)
      setLoading(false)
    })
  }, [])

  if (agg.setProgress.length === 0) {
    return (
      <div>
        <SectionTitle>Complétion de sets</SectionTitle>
        <div style={{
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 14,
          padding: '40px 24px',
          textAlign: 'center' as const,
          color: '#86868B',
          fontSize: 13,
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
        }}>
          Aucun set en cours. Ajoutez des cartes à votre portfolio pour suivre la progression.
        </div>
      </div>
    )
  }

  // Enrich set progress with total from JSON
  const enriched: SetCompletionData[] = agg.setProgress.map(s => {
    const meta = setsByLang[s.setId]
    const total = meta?.total || 0
    const pct = total > 0 ? Math.min((s.owned / total) * 100, 100) : 0
    return { ...s, total, pct }
  }).sort((a, b) => {
    // Sort: in-progress (pct > 0 && < 100) first, then completed, then unknown total
    const aRank = a.total === 0 ? 2 : (a.pct >= 100 ? 1 : 0)
    const bRank = b.total === 0 ? 2 : (b.pct >= 100 ? 1 : 0)
    if (aRank !== bRank) return aRank - bRank
    return b.pct - a.pct
  })

  const completed = enriched.filter(s => s.pct >= 100 && s.total > 0).length
  const inProgress = enriched.filter(s => s.pct < 100 && s.total > 0).length
  const unknownTotal = enriched.filter(s => s.total === 0).length

  return (
    <div>
      <SectionTitle>
        Complétion de sets · {enriched.length} set{enriched.length > 1 ? 's' : ''}
      </SectionTitle>

      {/* Mini summary */}
      <div style={{
        display: 'flex',
        gap: 14,
        marginBottom: 16,
        fontSize: 11.5,
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>
        {completed > 0 && (
          <div>
            <span style={{ color: '#1D9E75', fontWeight: 700 }}>{completed}</span> complet{completed > 1 ? 's' : ''}
          </div>
        )}
        {inProgress > 0 && (
          <div>
            <span style={{ color: '#1D1D1F', fontWeight: 700 }}>{inProgress}</span> en cours
          </div>
        )}
        {unknownTotal > 0 && (
          <div>
            <span style={{ color: '#AEAEB2', fontWeight: 600 }}>{unknownTotal}</span> total inconnu
          </div>
        )}
      </div>

      {loading ? (
        <div style={{
          padding: 24, textAlign: 'center' as const,
          fontSize: 12, color: '#AEAEB2',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>Chargement des données de sets…</div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.65)',
          backdropFilter: 'blur(14px) saturate(180%)',
          WebkitBackdropFilter: 'blur(14px) saturate(180%)',
          border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
        }}>
          {enriched.map((s, i) => (
            <SetRow
              key={s.setId}
              set={s}
              isLast={i === enriched.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SetRow({ set, isLast }: { set: SetCompletionData; isLast: boolean }) {
  const isComplete = set.pct >= 100 && set.total > 0
  const hasUnknownTotal = set.total === 0

  let pctColor = '#AEAEB2'
  if (isComplete) pctColor = '#1D9E75'
  else if (set.pct >= 75) pctColor = '#C9A84C'
  else if (set.pct >= 30) pctColor = '#1D1D1F'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      gap: 16,
      padding: '14px 20px',
      borderBottom: isLast ? 'none' : '1px solid rgba(0,0,0,0.04)',
      transition: 'background .15s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Left : name + progress bar + meta */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px',
        }}>
          <div style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#1D1D1F',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            whiteSpace: 'nowrap' as const,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em',
          }}>{set.setName}</div>

          {isComplete && (
            <span style={{
              padding: '3px 8px',
              background: 'rgba(29,158,117,0.12)',
              color: '#1D9E75',
              fontSize: 9,
              fontWeight: 700,
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.06em',
              borderRadius: 99,
              border: '1px solid rgba(29,158,117,0.2)',
              flexShrink: 0,
            }}>✓ Complet</span>
          )}
        </div>

        {/* Progress bar */}
        {!hasUnknownTotal && (
          <div style={{
            width: '100%',
            height: 6,
            background: 'rgba(0,0,0,0.05)',
            borderRadius: 3,
            overflow: 'hidden',
            marginBottom: 7,
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)',
          }}>
            <div style={{
              width: `${set.pct}%`,
              height: '100%',
              background: pctColor,
              borderRadius: 3,
              transition: 'width .6s cubic-bezier(.34, 1.56, .64, 1)',
              boxShadow: isComplete ? '0 0 4px rgba(29,158,117,0.3)' : 'none',
            }} />
          </div>
        )}

        {/* Meta line */}
        <div style={{
          fontSize: 10.5,
          color: '#86868B',
          fontFamily: 'var(--font-sora, Sora, sans-serif)',
        }}>
          {hasUnknownTotal ? (
            <>{set.owned} carte{set.owned > 1 ? 's' : ''} possédée{set.owned > 1 ? 's' : ''} · Total du set inconnu</>
          ) : (
            <>
              {set.owned} / {set.total} cartes ·
              {set.topCard ? <> Top: <span style={{ color: '#1D1D1F', fontWeight: 500 }}>{set.topCard}</span></> : null}
            </>
          )}
        </div>
      </div>

      {/* Right : pct + value */}
      <div style={{ textAlign: 'right' as const }}>
        {!hasUnknownTotal && (
          <div style={{
            fontSize: 18,
            fontWeight: 700,
            color: pctColor,
            fontFamily: 'var(--font-data, "Space Mono", monospace)',
            letterSpacing: '-0.3px',
            lineHeight: 1,
            marginBottom: 5,
          }}>{set.pct.toFixed(0)}%</div>
        )}
        <div style={{
          fontSize: 11.5,
          color: '#86868B',
          fontFamily: 'var(--font-data, "Space Mono", monospace)',
          fontWeight: 600,
        }}>{formatEUR(set.totalValue)}</div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      marginBottom: 14,
    }}>
      <div style={{
        width: 5, height: 5,
        borderRadius: '50%',
        background: '#C42E1F',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: 10.5, fontWeight: 600,
        color: '#86868B',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: 1,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.06), transparent)',
      }} />
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency', currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
