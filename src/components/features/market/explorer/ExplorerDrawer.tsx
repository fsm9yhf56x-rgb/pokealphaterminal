'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { supabase } from '@/lib/supabase'
import { getCardImageUrl, parseLocalIdR2 } from '@/lib/images'
import type { ExplorerResult } from '@/lib/useExplorerSearch'

/**
 * Drawer slide-in à droite : détail complet d'une carte.
 * Affiche : grosse image · sources prix · sparkline 30j · variants · raw vs graded.
 */
export function ExplorerDrawer({
  card, onClose,
}: {
  card: ExplorerResult | null
  onClose: () => void
}) {
  const isOpen = card !== null
  const [history, setHistory] = useState<{ day: string; price: number }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  /* ESC to close */
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  /* Load price history when card changes */
  useEffect(() => {
    if (!card) {
      setHistory([])
      return
    }
    let cancelled = false
    loadHistory()
    async function loadHistory() {
      setHistoryLoading(true)
      try {
        const { data } = await (supabase as any)
          .from('prices_snapshots')
          .select('fetched_at, price_avg')
          .eq('card_ref', card!.card_ref)
          .gt('price_avg', 0)
          .gte('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('fetched_at', { ascending: true })
          .limit(200)

        if (cancelled) return

        // Aggregate to 1 point/day (avg)
        const byDay = new Map<string, number[]>()
        for (const r of (data || []) as any[]) {
          const day = r.fetched_at.split('T')[0]
          const prices = byDay.get(day) || []
          prices.push(Number(r.price_avg))
          byDay.set(day, prices)
        }
        const points = [...byDay.entries()]
          .map(([day, prices]) => ({
            day,
            price: prices.reduce((s, p) => s + p, 0) / prices.length,
          }))
          .sort((a, b) => a.day.localeCompare(b.day))

        setHistory(points)
      } finally {
        if (!cancelled) setHistoryLoading(false)
      }
    }
    return () => { cancelled = true }
  }, [card])

  if (!card) return null

  const imgUrl = card.tcgdex_set_id && card.card_number
    ? getCardImageUrl({
        lang: (card.lang as any) || 'EN',
        setId: card.tcgdex_set_id,
        localId: parseLocalIdR2(card.card_number),
      })
    : ''
  const isUp = card.cardmarket_trend != null && card.cardmarket_trend > 0
  const trendColor = isUp ? 'var(--perf-up)' : 'var(--perf-down)'

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.32)',
          backdropFilter: 'blur(2px)',
          zIndex: 100,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />
      <style>{`
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{transform:translateX(100%)} to{transform:translateX(0)} }
      `}</style>

      {/* Drawer */}
      <div style={{
        position: 'fixed',
        top: 0, right: 0, bottom: 0,
        width: '100%',
        maxWidth: '440px',
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0, 0, 0, 0.08)',
        zIndex: 101,
        overflowY: 'auto',
        animation: 'slideIn 0.25s cubic-bezier(0.32, 0.72, 0, 1)',
        fontFamily: 'var(--font-display)',
      }}>
        {/* Header */}
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2,
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 600,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>Détail carte</div>

          <button
            onClick={onClose}
            title="Fermer (ESC)"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--ink-muted)',
              fontSize: '15px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >×</button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Image + name */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{
              width: '100%',
              maxWidth: '240px',
              aspectRatio: '0.7',
              margin: '0 auto 14px',
              background: '#F5F5F7',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            }}>
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt={card.card_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--ink-faint)', fontSize: '40px',
                }}>🃏</div>
              )}
            </div>

            <h2 style={{
              fontSize: '17px',
              fontWeight: 600,
              color: 'var(--ink)',
              letterSpacing: '-0.3px',
              margin: '0 0 4px',
              textAlign: 'center',
            }}>{card.card_name}</h2>

            <div style={{
              fontSize: '11px',
              color: 'var(--ink-muted)',
              textAlign: 'center',
            }}>
              {[card.set_name, card.variant && card.variant !== 'raw' ? card.variant : null]
                .filter(Boolean).join(' · ') || '—'}
            </div>

            {/* Tier + Graded badges */}
            {(card.tier || card.has_graded) && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '6px',
                marginTop: '10px',
              }}>
                {card.tier && (
                  <span style={{
                    padding: '3px 8px',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '4px',
                    background: card.tier === 'S' ? '#FFF8E1' : card.tier === 'A' ? 'var(--perf-up-soft)' : 'var(--border)',
                    color:      card.tier === 'S' ? '#B8860B' : card.tier === 'A' ? 'var(--perf-up)'      : 'var(--ink-muted)',
                    fontFamily: 'var(--font-data, var(--font-display))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>Tier {card.tier}</span>
                )}
                {card.has_graded && (
                  <span style={{
                    padding: '3px 8px',
                    background: 'var(--premium)',
                    color: 'var(--surface)',
                    fontSize: '9px',
                    fontWeight: 700,
                    borderRadius: '4px',
                  }}>GRADED DISPONIBLE</span>
                )}
              </div>
            )}
          </div>

          {/* Top price big */}
          <Section title="Prix de marché">
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '6px',
            }}>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-data, var(--font-display))',
                  letterSpacing: '-0.5px',
                  fontVariantNumeric: 'tabular-nums',
                }}>{formatEUR(card.top_price)}</div>
                <div style={{
                  fontSize: '10px',
                  color: 'var(--ink-muted)',
                  marginTop: '2px',
                }}>Top prix observé · toutes sources</div>
              </div>
              {card.cardmarket_trend != null && card.cardmarket_trend !== 0 && (
                <div style={{
                  textAlign: 'right',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: trendColor,
                  fontFamily: 'var(--font-data, var(--font-display))',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {isUp ? '▲' : '▼'} {isUp ? '+' : ''}{card.cardmarket_trend.toFixed(1)}%
                  <div style={{
                    fontSize: '9px',
                    fontWeight: 400,
                    color: 'var(--ink-muted)',
                    marginTop: '2px',
                  }}>Tendance</div>
                </div>
              )}
            </div>

            {/* Sparkline */}
            {historyLoading ? (
              <div style={{
                height: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                color: 'var(--ink-faint)',
              }}>Chargement de l'historique…</div>
            ) : history.length >= 2 ? (
              <div style={{ width: '100%', height: '80px', marginTop: '8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={history} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <YAxis hide domain={['dataMin', 'dataMax']} />
                    <Line
                      type="monotone"
                      dataKey="price"
                      stroke={isUp ? '#1D9E75' : '#E03020'}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{
                  fontSize: '9px',
                  color: 'var(--ink-faint)',
                  textAlign: 'right',
                  marginTop: '2px',
                }}>{history.length} points · 30 jours</div>
              </div>
            ) : (
              <div style={{
                fontSize: '10px',
                color: 'var(--ink-faint)',
                fontStyle: 'italic',
                marginTop: '6px',
              }}>Pas assez de données pour afficher l'historique.</div>
            )}
          </Section>

          {/* Sources breakdown */}
          <Section title="Sources">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              <SourceRow label="Cardmarket"  value={card.cardmarket_trend != null ? formatEUR(card.top_price) : null} />
              <SourceRow label="eBay (avg)" value={card.ebay_avg ? formatEUR(card.ebay_avg) : null}
                         meta={card.ebay_sales ? `${card.ebay_sales} ventes` : undefined} />
              <SourceRow label="TCGPlayer (avg)" value={card.tcg_avg ? formatEUR(card.tcg_avg) : null} />
              <SourceRow label="PSA 10 (avg)" value={card.psa10_avg ? formatEUR(card.psa10_avg) : null}
                         premium />
            </div>
          </Section>

          {/* Tech meta */}
          <Section title="Référence">
            <div style={{
              fontSize: '10px',
              color: 'var(--ink-muted)',
              fontFamily: 'var(--font-data, var(--font-display))',
              wordBreak: 'break-all',
              padding: '8px 10px',
              background: '#FAFAFA',
              borderRadius: '6px',
              border: '1px solid var(--border)',
            }}>
              {card.card_ref}
            </div>
          </Section>
        </div>
      </div>
    </>
  )
}

/* ── Section + SourceRow ───────────────────── */

function Section({
  title, children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '9px',
        fontWeight: 600,
        color: 'var(--ink-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '10px',
      }}>{title}</div>
      {children}
    </div>
  )
}

function SourceRow({
  label, value, meta, premium,
}: {
  label: string
  value: string | null
  meta?: string
  premium?: boolean
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      alignItems: 'center',
      gap: '12px',
      padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <div>
        <div style={{
          fontSize: '12px',
          color: premium ? 'var(--premium-dark, #B8860B)' : 'var(--ink)',
          fontWeight: 500,
        }}>{label}</div>
        {meta && (
          <div style={{
            fontSize: '10px',
            color: 'var(--ink-muted)',
            marginTop: '1px',
          }}>{meta}</div>
        )}
      </div>
      <div style={{
        fontSize: '12px',
        fontWeight: 600,
        color: value ? (premium ? 'var(--premium-dark, #B8860B)' : 'var(--ink)') : 'var(--ink-faint)',
        fontFamily: 'var(--font-data, var(--font-display))',
        fontVariantNumeric: 'tabular-nums',
      }}>{value || '—'}</div>
    </div>
  )
}

function formatEUR(v: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(v)
}
