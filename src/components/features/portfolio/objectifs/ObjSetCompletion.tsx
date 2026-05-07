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
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '40px 20px',
          textAlign: 'center',
          color: 'var(--ink-muted)',
          fontSize: '12px',
          fontFamily: 'var(--font-display)',
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
        gap: '14px',
        marginBottom: '14px',
        fontSize: '11px',
        color: 'var(--ink-muted)',
        fontFamily: 'var(--font-display)',
      }}>
        {completed > 0 && (
          <div>
            <span style={{ color: 'var(--perf-up)', fontWeight: 600 }}>{completed}</span> complet{completed > 1 ? 's' : ''}
          </div>
        )}
        {inProgress > 0 && (
          <div>
            <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{inProgress}</span> en cours
          </div>
        )}
        {unknownTotal > 0 && (
          <div>
            <span style={{ color: 'var(--ink-faint)' }}>{unknownTotal}</span> total inconnu
          </div>
        )}
      </div>

      {loading ? (
        <div style={{
          padding: '20px', textAlign: 'center',
          fontSize: '11px', color: 'var(--ink-faint)',
          fontFamily: 'var(--font-display)',
        }}>Chargement des données de sets…</div>
      ) : (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
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

  let pctColor = 'var(--ink-faint)'
  if (isComplete) pctColor = 'var(--perf-up)'
  else if (set.pct >= 75) pctColor = 'var(--premium)'
  else if (set.pct >= 30) pctColor = 'var(--accent)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      gap: '16px',
      padding: '14px 18px',
      borderBottom: isLast ? 'none' : '1px solid var(--border)',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.015)')}
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
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--ink)',
            fontFamily: 'var(--font-display)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>{set.setName}</div>

          {isComplete && (
            <span style={{
              padding: '2px 6px',
              background: 'var(--perf-up-soft)',
              color: 'var(--perf-up)',
              fontSize: '8px',
              fontWeight: 600,
              fontFamily: 'var(--font-display)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderRadius: '4px',
              flexShrink: 0,
            }}>✓ Complet</span>
          )}
        </div>

        {/* Progress bar */}
        {!hasUnknownTotal && (
          <div style={{
            width: '100%',
            height: '6px',
            background: 'var(--border)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}>
            <div style={{
              width: `${set.pct}%`,
              height: '100%',
              background: pctColor,
              borderRadius: '3px',
              transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }} />
          </div>
        )}

        {/* Meta line */}
        <div style={{
          fontSize: '10px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-display)',
        }}>
          {hasUnknownTotal ? (
            <>{set.owned} carte{set.owned > 1 ? 's' : ''} possédée{set.owned > 1 ? 's' : ''} · Total du set inconnu</>
          ) : (
            <>
              {set.owned} / {set.total} cartes ·
              {set.topCard ? <> Top: <span style={{ color: 'var(--ink)' }}>{set.topCard}</span></> : null}
            </>
          )}
        </div>
      </div>

      {/* Right : pct + value */}
      <div style={{ textAlign: 'right' }}>
        {!hasUnknownTotal && (
          <div style={{
            fontSize: '17px',
            fontWeight: 600,
            color: pctColor,
            fontFamily: 'var(--font-data, var(--font-display))',
            letterSpacing: '-0.3px',
            lineHeight: 1,
            marginBottom: '4px',
          }}>{set.pct.toFixed(0)}%</div>
        )}
        <div style={{
          fontSize: '11px',
          color: 'var(--ink-muted)',
          fontFamily: 'var(--font-data, var(--font-display))',
        }}>{formatEUR(set.totalValue)}</div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      marginBottom: '12px',
    }}>
      <div style={{
        width: '5px', height: '5px',
        borderRadius: '50%',
        background: 'var(--accent)',
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: '10px', fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: 'var(--font-display)',
      }}>{children}</span>
      <div style={{
        flex: 1, height: '1px',
        background: 'linear-gradient(90deg, var(--border), transparent)',
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
