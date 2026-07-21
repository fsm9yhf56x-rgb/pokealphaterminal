'use client'

/**
 * /releases · Prochaines Séries
 *
 * Reference glassmorphism v7: SpotDrawer.
 * Filtres langue (FR/EN/JP) + sections "A venir" (cartes countdown)
 * et "Sorties recentes" (grille compacte).
 */

import { useState, useEffect, useCallback } from 'react'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

type Lang = 'FR' | 'EN' | 'JP'

type UpcomingSet = {
  name: string
  slug: string
  pptId: string
  series: string
  lang: Lang
  langs?: Lang[]
  releaseDate: string
  releaseDateLocale: string
  imageUrl: string | null
  daysUntil: number
  isReleased: boolean
}

type Props = {
  sets: UpcomingSet[]
  upcomingCount?: number
  lastSyncedAt?: string | null
}

const LANG_META: Record<Lang, { flag: string; label: string }> = {
  FR: { flag: '🇫🇷', label: 'FR' },
  EN: { flag: '🇬🇧', label: 'EN' },
  JP: { flag: '🇯🇵', label: 'JP' },
}

export default function ReleasesClient({ sets, upcomingCount, lastSyncedAt }: Props) {
  const [langFilter, setLangFilter] = useState<'ALL' | Lang>('ALL')

  // Abonnements aux sorties : 1 seul GET pour toutes les cartes.
  const [alerts, setAlerts] = useState<Set<string>>(new Set())
  const [alertsReady, setAlertsReady] = useState(false)
  useEffect(() => {
    let ok = true
    fetch('/api/v1/set-alerts')
      .then(r => r.ok ? r.json() : { codes: [] })
      .then(d => { if (ok) { setAlerts(new Set(d.codes || [])); setAlertsReady(true) } })
      .catch(() => { if (ok) setAlertsReady(true) })
    return () => { ok = false }
  }, [])
  const toggleAlert = useCallback(async (code: string, name: string) => {
    // Optimiste : on bascule tout de suite, on corrige si le serveur renvoie autre chose.
    const wasOn = alerts.has(code)
    setAlerts(prev => { const n = new Set(prev); wasOn ? n.delete(code) : n.add(code); return n })
    try {
      const r = await fetch('/api/v1/set-alerts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name }),
      })
      if (r.status === 401) {
        // non connecte -> on annule l'optimiste et on ouvre le login
        setAlerts(prev => { const n = new Set(prev); wasOn ? n.add(code) : n.delete(code); return n })
        window.dispatchEvent(new CustomEvent('kodo:open-auth'))
        return
      }
      const d = await r.json()
      setAlerts(prev => { const n = new Set(prev); d.subscribed ? n.add(code) : n.delete(code); return n })
    } catch {
      setAlerts(prev => { const n = new Set(prev); wasOn ? n.add(code) : n.delete(code); return n })
    }
  }, [alerts])

  const filtered = langFilter === 'ALL' ? sets : sets.filter(s => (s.langs ?? [s.lang]).includes(langFilter))
  const upcoming = filtered.filter(s => !s.isReleased)
  const released = filtered.filter(s => s.isReleased)

  return (
    <main style={{
      minHeight: '80vh',
      padding: '40px 20px 80px',
      maxWidth: 1100, margin: '0 auto',
      position: 'relative' as const, zIndex: 1,
    }}>
      <Hero count={upcomingCount ?? sets.filter(s => !s.isReleased).length} lastSyncedAt={lastSyncedAt} />

      <LangFilter sets={sets} value={langFilter} onChange={setLangFilter} />

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <SectionTitle dot="#2E9E6A" label="À venir" count={upcoming.length} />
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
                {upcoming.map(s => {
                  const code = s.pptId.startsWith('up:') ? s.slug : null
                  return <SetCard key={s.pptId} set={s}
                    subscribed={code ? alerts.has(code) : false}
                    canSubscribe={!!code && alertsReady}
                    onToggle={code ? () => toggleAlert(code, s.name) : undefined} />
                })}
              </div>
            </section>
          )}

          {released.length > 0 && (
            <section style={{ marginTop: upcoming.length > 0 ? 56 : 0 }}>
              <SectionTitle dot={SNOW.muted} label="Sorties récentes" count={released.length} />
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 14,
              }}>
                {released.map(s => <ReleasedCard key={s.pptId} set={s} />)}
              </div>
            </section>
          )}
        </>
      )}
      <Footer />
    </main>
  )
}

// ────────────────────────────────────────────────────────────
// Filtre langue
// ────────────────────────────────────────────────────────────
function LangFilter({ sets, value, onChange }: {
  sets: UpcomingSet[]
  value: 'ALL' | Lang
  onChange: (v: 'ALL' | Lang) => void
}) {
  const counts: Record<Lang, number> = { FR: 0, EN: 0, JP: 0 }
  for (const s of sets) counts[s.lang]++
  const options: { key: 'ALL' | Lang; label: string }[] = [
    { key: 'ALL', label: 'Tous' },
    ...(['FR', 'EN', 'JP'] as Lang[]).filter(l => counts[l] > 0)
      .map(l => ({ key: l, label: `${LANG_META[l].flag} ${LANG_META[l].label}` })),
  ]
  return (
    <div className="kc-langfilter" style={{ overflowX: 'auto', marginBottom: 36 }}>
      <style>{`.kc-langfilter::-webkit-scrollbar{display:none}.kc-langfilter{scrollbar-width:none}`}</style>
      <div style={{ display: 'flex', gap: 8, width: 'max-content', margin: '0 auto', padding: '0 2px' }}>
      {options.map(o => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            style={{
              padding: '8px 18px', borderRadius: 99,
              background: active ? SNOW.ink : 'rgba(255,255,255,0.62)',
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: active ? '1px solid transparent' : '1px solid rgba(0,0,0,0.05)',
              color: active ? '#fff' : SNOW.ink,
              fontSize: 12.5, fontWeight: 700,
              fontFamily: FONT.display, cursor: 'pointer',
              letterSpacing: '0.02em',
              transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
              boxShadow: active
                ? '0 4px 12px rgba(0,0,0,0.18)'
                : '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
    </div>
  )
}

function SectionTitle({ dot, label, count }: { dot: string; label: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 18,
    }}>
      <span style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
      <h2 style={{
        fontSize: 13, fontWeight: 800, color: SNOW.ink,
        fontFamily: FONT.display, letterSpacing: '0.16em',
        textTransform: 'uppercase' as const, margin: 0,
      }}>{label}</h2>
      <span style={{
        fontSize: 11.5, fontWeight: 700, color: SNOW.muted,
        fontFamily: FONT.data,
      }}>{count}</span>
    </div>
  )
}

function LangBadge({ lang, size = 'md' }: { lang: Lang; size?: 'sm' | 'md' }) {
  const m = LANG_META[lang]
  const sm = size === 'sm'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: sm ? '2px 8px' : '4px 11px', borderRadius: 99,
      background: 'rgba(255,255,255,0.7)',
      border: '1px solid rgba(0,0,0,0.05)',
      fontSize: sm ? 10 : 11, fontWeight: 700,
      fontFamily: FONT.display, color: SNOW.ink,
      letterSpacing: '0.04em',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
      whiteSpace: 'nowrap' as const,
    }}>
      <span style={{ fontSize: sm ? 11 : 13, lineHeight: 1 }}>{m.flag}</span>
      {m.label}
    </span>
  )
}

// ────────────────────────────────────────────────────────────
// Hero
// ────────────────────────────────────────────────────────────
function formatLastSynced(iso: string | null | undefined): string {
  if (!iso) return ''
  const synced = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - synced.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)
  const diffD = Math.floor(diffMs / 86400000)
  if (diffMin < 1) return 'à l\u2019instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffH < 24) return `il y a ${diffH} h`
  if (diffD < 7) return `il y a ${diffD} j`
  return synced.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

function Hero({ count, lastSyncedAt }: { count: number, lastSyncedAt?: string | null }) {
  const lastSyncedLabel = formatLastSynced(lastSyncedAt)
  return (
    <div style={{ marginBottom: 32, textAlign: 'center' as const, paddingTop: 20 }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 99,
        background: 'rgba(255,255,255,0.62)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid rgba(0,0,0,0.04)',
        fontSize: 11, fontWeight: 700, color: SNOW.ink,
        fontFamily: FONT.display, letterSpacing: '0.18em',
        textTransform: 'uppercase' as const, marginBottom: 22,
        boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.85)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#2E9E6A',
          boxShadow: '0 0 8px rgba(46,158,106,0.6)',
          animation: 'pulseDot 2s ease-in-out infinite',
        }} />
        {count} {count > 1 ? 'séries à venir' : 'série à venir'}
      </div>

      <h1 style={{
        fontSize: 'clamp(42px, 6vw, 68px)',
        fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display,
        letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 14px',
      }}>
        Prochaines Séries
      </h1>

      <p style={{
        fontSize: 'clamp(15px, 1.5vw, 17px)',
        color: SNOW.muted, fontFamily: FONT.display,
        lineHeight: 1.6, maxWidth: 620, margin: '0 auto 14px',
      }}>
        Tiens-toi au courant des prochaines sorties pour le TCG Pokémon !{' '}
        Active les notifications pour ne rien louper à l&apos;avenir.
      </p>

      {lastSyncedLabel && (
        <div style={{
          fontSize: 11, color: SNOW.muted,
          fontFamily: FONT.display, letterSpacing: '0.02em',
        }}>
          Dernière mise à jour : <span style={{ color: SNOW.ink, fontWeight: 600 }}>{lastSyncedLabel}</span>
        </div>
      )}

      <style jsx>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
// Set Card (a venir — grande carte countdown)
// ────────────────────────────────────────────────────────────
// ────────────────────────────────────────────────────────────
// Set Card (a venir) — ligne de calendrier compacte et elegante
// ────────────────────────────────────────────────────────────

// Teinte douce de la vignette selon la langue.
const LANG_TINT: Record<Lang, string> = {
  FR: 'linear-gradient(135deg, rgba(64,110,200,0.14), rgba(120,90,210,0.10))',
  EN: 'linear-gradient(135deg, rgba(224,72,60,0.13), rgba(255,150,90,0.10))',
  JP: 'linear-gradient(135deg, rgba(230,90,140,0.14), rgba(150,90,210,0.10))',
}

function SetCard({ set, subscribed = false, canSubscribe = false, onToggle }: {
  set: UpcomingSet; subscribed?: boolean; canSubscribe?: boolean; onToggle?: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const [hover, setHover] = useState(false)
  const [pop, setPop] = useState(false)
  const isUrgent = set.daysUntil <= 30 && set.daysUntil > 0
  const hasLogo = !!set.imageUrl && !imgError
  const jColor = isUrgent ? '#E03020' : SNOW.ink

  // Initiales pour la vignette de repli (2-3 lettres marquantes du nom).
  const initials = (set.name || '?')
    .replace(/[^A-Za-z0-9\s]/g, '')
    .split(/\s+/).filter(Boolean).slice(0, 2)
    .map(w => w[0]).join('').toUpperCase() || '?'

  return (
    <article
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...GLASS.card,
        padding: 0, overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '112px 1fr auto',
        alignItems: 'stretch',
        minHeight: 96,
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: hover
          ? '0 16px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)'
          : '0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)',
        transition: 'transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s ease',
      }}>

      {/* ─── Vignette : vrai logo, sinon degrade + initiales ─── */}
      <div style={{
        position: 'relative' as const,
        background: LANG_TINT[set.lang],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 14,
        borderRight: '1px solid rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>
        {hasLogo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={set.imageUrl!}
            alt={set.name}
            onError={() => setImgError(true)}
            style={{
              maxWidth: '100%', maxHeight: 64, width: 'auto', height: 'auto',
              objectFit: 'contain' as const,
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.18))',
            }}
          />
        ) : (
          <div style={{
            fontFamily: FONT.display, fontWeight: 800,
            fontSize: 26, letterSpacing: '-0.02em',
            color: 'rgba(29,29,31,0.28)',
            userSelect: 'none' as const,
          }}>{initials}</div>
        )}
      </div>

      {/* ─── Identite : serie/langue, titre, date ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'center', gap: 5, padding: '14px 18px', minWidth: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
          {set.series && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: SNOW.muted,
              fontFamily: FONT.display, letterSpacing: '0.14em',
              textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const,
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
            }}>{set.series}</span>
          )}
          <div style={{ display: 'inline-flex', gap: 4 }}>
            {(set.langs ?? [set.lang]).map(l => <LangBadge key={l} lang={l} size="sm" />)}
          </div>
        </div>

        <h2 style={{
          fontSize: 18, fontWeight: 700, color: SNOW.ink,
          fontFamily: FONT.display, letterSpacing: '-0.02em', lineHeight: 1.15,
          margin: 0, whiteSpace: 'nowrap' as const, overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>{set.name}</h2>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: SNOW.muted, fontFamily: FONT.display,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>Sortie prevue le <span style={{ fontWeight: 700, color: SNOW.ink }}>{set.releaseDateLocale}</span></span>
        </div>
      </div>

      {/* ─── Compteur (+ cloche au-dessus) ─── */}
      <div style={{
        display: 'flex', flexDirection: 'column' as const,
        alignItems: 'flex-end', justifyContent: 'center',
        padding: '12px 22px 12px 12px', gap: 4,
      }}>
        {canSubscribe && onToggle && (
          <button
            onClick={(e) => { e.stopPropagation(); setPop(true); setTimeout(() => setPop(false), 260); onToggle() }}
            title={subscribed ? 'Ne plus etre prevenu' : 'Me prevenir a la sortie'}
            aria-label={subscribed ? 'Se desabonner' : "S'abonner a la sortie"}
            style={{
              width: 30, height: 30, borderRadius: 999, marginBottom: 2,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: subscribed ? 'rgba(224,48,32,0.12)' : 'rgba(0,0,0,0.035)',
              border: subscribed ? '1px solid rgba(224,48,32,0.30)' : '1px solid rgba(0,0,0,0.06)',
              cursor: 'pointer', padding: 0,
              transform: pop ? 'scale(1.22)' : (hover ? 'scale(1.06)' : 'scale(1)'),
              transition: 'transform .2s cubic-bezier(.2,.85,.3,1), background .2s, border-color .2s',
            }}>
            <svg width="15" height="15" viewBox="0 0 24 24"
              fill={subscribed ? '#E03020' : 'none'}
              stroke={subscribed ? '#E03020' : '#86868B'}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
        )}
        <div style={{
          fontSize: 'clamp(28px, 3vw, 36px)', fontWeight: 800, color: jColor,
          fontFamily: FONT.display, letterSpacing: '-0.04em', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums' as const, whiteSpace: 'nowrap' as const,
        }}>J-{Math.max(0, set.daysUntil)}</div>
        <div style={{
          fontSize: 11, fontWeight: 600, color: SNOW.muted,
          fontFamily: FONT.display, letterSpacing: '0.03em',
        }}>jours</div>
      </div>
    </article>
  )
}

// ────────────────────────────────────────────────────────────
// Released Card (sorti — carte compacte)
// ────────────────────────────────────────────────────────────
function ReleasedCard({ set }: { set: UpcomingSet }) {
  const [imgError, setImgError] = useState(false)
  return (
    <article style={{
      ...GLASS.card,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 64, height: 48, borderRadius: 10, flexShrink: 0,
        background: 'rgba(245,245,247,0.8)',
        border: '1px solid rgba(0,0,0,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {set.imageUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={set.imageUrl} alt={set.name}
            onError={() => setImgError(true)}
            style={{ maxWidth: '85%', maxHeight: '85%', width: 'auto', height: 'auto' }}
          />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3,
        }}>
          <div style={{
            fontSize: 13.5, fontWeight: 700, color: SNOW.ink,
            fontFamily: FONT.display, letterSpacing: '-0.01em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
          }}>{set.name}</div>
          <LangBadge lang={set.lang} size="sm" />
        </div>
        <div style={{
          fontSize: 11.5, color: SNOW.muted, fontFamily: FONT.display,
        }}>{set.releaseDateLocale}</div>
      </div>

      <span style={{
        flexShrink: 0,
        padding: '4px 11px', borderRadius: 99,
        background: 'rgba(29,158,117,0.1)',
        border: '1px solid rgba(29,158,117,0.22)',
        fontSize: 10, fontWeight: 800, color: '#1D9E75',
        fontFamily: FONT.display, letterSpacing: '0.1em',
        textTransform: 'uppercase' as const,
      }}>Sorti</span>
    </article>
  )
}

function EmptyState() {
  return (
    <div style={{
      ...GLASS.card,
      padding: 60, textAlign: 'center' as const,
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: 'rgba(245,245,247,0.7)',
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 17, fontWeight: 700, color: SNOW.ink, fontFamily: FONT.display, margin: 0 }}>
        Aucun set pour cette langue
      </h2>
      <p style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, maxWidth: 340, margin: 0 }}>
        Aucune sortie référencée pour ce filtre. Essaye une autre langue ou reviens bientôt.
      </p>
    </div>
  )
}

function Footer() {
  return (
    <div style={{
      marginTop: 60, textAlign: 'center' as const,
      fontSize: 11, color: SNOW.muted,
      fontFamily: FONT.display, lineHeight: 1.7,
    }}>
      <p style={{ margin: 0 }}>
        Données agrégées depuis les annonces officielles · Mise à jour quotidienne automatique
      </p>
    </div>
  )
}
