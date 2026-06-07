'use client'

import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'
import { usePersona } from '@/lib/usePersona'

interface PortfolioCard {
  id?: string | number
  name?: string
  set_name?: string | null
  qty?: number
  current_price?: number | null
  buy_price?: number | null
}

interface MoverItem {
  id: string
  name: string
  set_name: string | null
  value: number
  gain: number | null
  roiPct: number | null
}

type Mode = 'roi' | 'value'

/**
 * Top movers portfolio Snow+ : top ROI si buy_price connu, sinon top valeur.
 */
export function HubMovers({
  cards, loading,
}: {
  cards: PortfolioCard[]
  loading: boolean
}) {
  const router = useRouter()
  const { isCollector } = usePersona()

  const { gainers, loser, mode } = useMemo(() => {
    const withROI: MoverItem[] = cards
      .filter(c => c.buy_price != null && c.buy_price > 0 && c.current_price != null)
      .map((c, i) => {
        const qty = c.qty || 1
        const cur = c.current_price || 0
        const buy = c.buy_price || 0
        const value = cur * qty
        const cost = buy * qty
        return {
          id: String(c.id ?? `roi-${i}`),
          name: c.name || 'Carte sans nom',
          set_name: c.set_name || null,
          value,
          gain: value - cost,
          roiPct: cost > 0 ? ((value - cost) / cost) * 100 : 0,
        }
      })

    if (withROI.length >= 3) {
      const sorted = [...withROI].sort((a, b) => (b.roiPct ?? 0) - (a.roiPct ?? 0))
      const last = sorted[sorted.length - 1]
      return {
        gainers: sorted.slice(0, 3),
        loser: last && last.roiPct !== null && last.roiPct < 0 ? last : null,
        mode: 'roi' as Mode,
      }
    }

    const byValue: MoverItem[] = cards
      .filter(c => c.current_price != null && c.current_price > 0)
      .map((c, i) => {
        const qty = c.qty || 1
        const value = (c.current_price || 0) * qty
        return {
          id: String(c.id ?? `val-${i}`),
          name: c.name || 'Carte sans nom',
          set_name: c.set_name || null,
          value,
          gain: null,
          roiPct: null,
        }
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)

    return { gainers: byValue, loser: null, mode: 'value' as Mode }
  }, [cards])

  return (
    <div style={{
      ...GLASS.card,
      overflow: 'hidden',
      padding: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px 10px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <SectionLabel accent={SNOW.red}>{mode === 'roi' ? 'Top mouvements' : (isCollector ? 'Tes pièces maîtresses' : 'Top valeur')}</SectionLabel>
        <button
          onClick={() => router.push('/portfolio/performance')}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: 11,
            color: SNOW.muted,
            cursor: 'pointer',
            fontFamily: FONT.body,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: TRANSITION.fast,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = SNOW.ink)}
          onMouseLeave={(e) => (e.currentTarget.style.color = SNOW.muted)}
        >
          Voir tout <span>→</span>
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : gainers.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {gainers.map((m, i) => (
            <Row
              key={m.id}
              mover={m}
              rank={i + 1}
              isLast={i === gainers.length - 1 && !loser}
              variant={m.roiPct !== null && m.roiPct < 0 ? 'down' : 'up'}
              mode={mode}
            />
          ))}

          {loser && (
            <>
              <div style={{
                padding: '10px 18px 4px',
                background: 'rgba(255,255,255,0.4)',
                borderTop: `1px solid ${SNOW.borderSoft}`,
              }}>
                <span style={{
                  fontSize: 9,
                  color: SNOW.mutedLight,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 600,
                  fontFamily: FONT.display,
                }}>
                  À surveiller
                </span>
              </div>
              <Row mover={loser} rank={null} isLast variant="down" mode="roi" />
            </>
          )}

          {mode === 'value' && (
            <div style={{
              padding: '10px 18px',
              borderTop: `1px solid ${SNOW.borderSoft}`,
              background: 'rgba(255,255,255,0.4)',
              fontSize: 10,
              color: SNOW.muted,
              fontFamily: FONT.body,
              textAlign: 'center',
            }}>
              <span style={{ color: SNOW.red, fontWeight: 600 }}>Astuce :</span> renseigne tes prix d'achat pour suivre ton ROI réel.
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Row ──────────────────────────────── */

function Row({
  mover, rank, isLast, variant, mode,
}: {
  mover: MoverItem
  rank: number | null
  isLast: boolean
  variant: 'up' | 'down'
  mode: Mode
}) {
  const isUp = variant === 'up'
  const color = isUp ? SNOW.green : SNOW.red

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '12px 18px',
        borderBottom: isLast ? 'none' : `1px solid ${SNOW.borderSoft}`,
        transition: 'background .15s ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.4)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        color: rank === 1 ? color : SNOW.mutedExtraLight,
        fontFamily: FONT.data,
        textAlign: 'center',
      }}>
        {rank ? rank.toString().padStart(2, '0') : '·'}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: SNOW.ink,
          fontFamily: FONT.body,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 2,
        }}>
          {mover.name}
        </div>
        <div style={{
          fontSize: 10,
          color: SNOW.muted,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {mover.set_name || '—'}
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        {mode === 'roi' && mover.roiPct !== null ? (
          <>
            <div style={{
              fontSize: 13,
              fontWeight: 700,
              color,
              fontFamily: FONT.data,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
            }}>
              {isUp ? '▲' : '▼'} {mover.roiPct >= 0 ? '+' : ''}{mover.roiPct.toFixed(1)}%
            </div>
            <div style={{
              fontSize: 10,
              color,
              fontFamily: FONT.data,
              fontVariantNumeric: 'tabular-nums',
              marginTop: 1,
              opacity: 0.85,
            }}>
              {(mover.gain ?? 0) >= 0 ? '+' : ''}{formatEURcompact(mover.gain ?? 0)}
            </div>
          </>
        ) : (
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            color: SNOW.ink,
            fontFamily: FONT.data,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.3px',
          }}>
            {formatEUR(mover.value)}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── States ──────────────────────────── */

function LoadingState() {
  return (
    <div style={{
      padding: '40px 18px',
      textAlign: 'center',
      fontSize: 11,
      color: SNOW.mutedLight,
      fontFamily: FONT.body,
    }}>
      Chargement…
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{
      padding: '40px 22px',
      textAlign: 'center',
      fontSize: 12,
      color: SNOW.muted,
      fontFamily: FONT.body,
      lineHeight: 1.5,
    }}>
      Ajoutez des cartes à votre portfolio pour voir vos top valeurs.
    </div>
  )
}

/* ── Atoms ───────────────────────────── */

function SectionLabel({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%', background: accent,
      }} />
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: SNOW.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontFamily: FONT.display,
      }}>
        {children}
      </span>
    </div>
  )
}

/* ── Helpers ───────────────────────── */

function formatEUR(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)} K€`
  return `${v.toFixed(0)} €`
}

function formatEURcompact(v: number): string {
  const abs = Math.abs(v)
  const sign = v < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)} K€`
  return `${sign}${abs.toFixed(0)} €`
}
