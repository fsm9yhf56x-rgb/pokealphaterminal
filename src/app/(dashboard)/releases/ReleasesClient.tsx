'use client'

/**
 * /releases · Prochaines Séries
 *
 * Reference glassmorphism v7: SpotDrawer.
 * Filtres langue (FR/EN/JP) + sections "A venir" (cartes countdown)
 * et "Sorties recentes" (grille compacte).
 */

import { useState } from 'react'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

type Lang = 'FR' | 'EN' | 'JP'

type UpcomingSet = {
  name: string
  slug: string
  pptId: string
  series: string
  lang: Lang
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

  const filtered = langFilter === 'ALL' ? sets : sets.filter(s => s.lang === langFilter)
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
                {upcoming.map(s => <SetCard key={s.pptId} set={s} />)}
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
        lineHeight: 1.6, maxWidth: 560, margin: '0 auto 14px',
      }}>
        Les nouvelles sorties Pokémon TCG, anticipées pour toi.<br/>
        Sois prévenu dès qu&apos;un set est disponible.
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
function SetCard({ set }: { set: UpcomingSet }) {
  const [imgError, setImgError] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (status === 'loading') return
    setStatus('loading'); setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), cardId: set.slug, source: 'releases_' + set.slug }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }
      setStatus('success')
    } catch (err: any) {
      setStatus('error'); setErrorMsg(err.message || 'Erreur, réessaye')
    }
  }

  const isUrgent = set.daysUntil <= 30 && set.daysUntil > 0
  const dayLabel = set.daysUntil <= 1 ? 'jour' : 'jours'

  return (
    <article style={{
      ...GLASS.card,
      padding: 0, overflow: 'hidden',
      position: 'relative' as const,
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 360px) 1fr',
      minHeight: 320,
    }}>
      {/* ─── Colonne visuel (image + bokeh enrichi) ─── */}
      <div style={{
        position: 'relative' as const,
        background: 'linear-gradient(135deg, rgba(255,140,80,0.10) 0%, rgba(195,135,245,0.10) 45%, rgba(80,210,170,0.08) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 28,
        borderRight: '1px solid rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: '5%', left: '10%', width: 180, height: 180,
          background: 'radial-gradient(circle, rgba(255,140,80,0.32), transparent 60%)',
          filter: 'blur(45px)', pointerEvents: 'none' as const,
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: '30%', right: '5%', width: 150, height: 150,
          background: 'radial-gradient(circle, rgba(195,135,245,0.30), transparent 60%)',
          filter: 'blur(40px)', pointerEvents: 'none' as const,
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: '10%', left: '25%', width: 130, height: 130,
          background: 'radial-gradient(circle, rgba(80,210,170,0.25), transparent 60%)',
          filter: 'blur(40px)', pointerEvents: 'none' as const,
        }} />
        {set.imageUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={set.imageUrl}
            alt={set.name}
            onError={() => setImgError(true)}
            style={{
              maxWidth: '100%', maxHeight: 260,
              width: 'auto', height: 'auto',
              position: 'relative' as const,
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.22))',
            }}
          />
        ) : (
          <div style={{
            width: 180, height: 180, borderRadius: 22,
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: SNOW.muted, fontSize: 12, fontFamily: FONT.display,
            textAlign: 'center' as const, padding: 16,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
          }}>Visuel à venir</div>
        )}
      </div>

      {/* ─── Colonne contenu ─── */}
      <div style={{
        padding: '32px 36px',
        display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'space-between', gap: 22,
      }}>
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
          }}>
            <div style={{
              fontSize: 10.5, fontWeight: 700, color: SNOW.muted,
              fontFamily: FONT.display, letterSpacing: '0.2em',
              textTransform: 'uppercase' as const,
            }}>{set.series}</div>
            <LangBadge lang={set.lang} size="sm" />
          </div>

          <h2 style={{
            fontSize: 'clamp(22px, 2.5vw, 28px)',
            fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display,
            letterSpacing: '-0.02em', lineHeight: 1.15,
            margin: '0 0 12px',
          }}>{set.name}</h2>

          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            border: '1px solid rgba(0,0,0,0.04)',
            fontSize: 11.5, fontFamily: FONT.display,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{ color: SNOW.muted }}>Sortie prévue le</span>
            <span style={{ fontWeight: 700, color: SNOW.ink }}>{set.releaseDateLocale}</span>
          </div>
        </div>

        {/* Compteur J-X gigantesque */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, padding: '8px 0' }}>
          <div style={{
            fontSize: 'clamp(56px, 8vw, 88px)',
            fontWeight: 800,
            color: isUrgent ? '#E03020' : SNOW.ink,
            fontFamily: FONT.display,
            letterSpacing: '-0.05em', lineHeight: 1,
            fontVariantNumeric: 'tabular-nums' as const,
          }}>J-{Math.max(0, set.daysUntil)}</div>
          <div style={{
            fontSize: 13, fontWeight: 600, color: SNOW.muted,
            fontFamily: FONT.display, letterSpacing: '0.02em',
          }}>{dayLabel}</div>
        </div>

        {/* Waitlist */}
        {status === 'success' ? (
          <div style={{
            padding: '14px 18px', borderRadius: 12,
            background: 'rgba(46,158,106,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(46,158,106,0.2)',
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 13, color: '#1a6e48',
            fontFamily: FONT.display, fontWeight: 600,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            On te prévient dès que le set sort
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            <input
              type="email" required placeholder="ton@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={status === 'loading'}
              style={{
                flex: '1 1 200px', minWidth: 0, height: 46,
                padding: '0 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(12px) saturate(180%)',
                WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 14, color: SNOW.ink,
                fontFamily: FONT.display, outline: 'none',
                boxSizing: 'border-box' as const,
                boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                transition: 'all .2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(29,29,31,0.4)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)' }}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              style={{
                height: 46, padding: '0 24px', borderRadius: 12,
                background: status === 'loading' ? 'rgba(0,0,0,0.05)' : SNOW.ink,
                color: status === 'loading' ? SNOW.muted : '#fff',
                border: 'none',
                fontSize: 13.5, fontWeight: 700,
                cursor: status === 'loading' || !email.trim() ? 'default' : 'pointer',
                fontFamily: FONT.display,
                transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
                letterSpacing: '0.02em', whiteSpace: 'nowrap' as const,
                boxShadow: status === 'loading' ? 'none' : '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
              }}
              onMouseEnter={e => { if (status !== 'loading' && email.trim()) { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
              onMouseLeave={e => { if (status !== 'loading' && email.trim()) { e.currentTarget.style.background = SNOW.ink; e.currentTarget.style.transform = '' } }}
            >
              {status === 'loading' ? 'Envoi...' : 'Préviens-moi'}
            </button>
            {status === 'error' && (
              <div style={{ width: '100%', fontSize: 11, color: '#E03020', fontFamily: FONT.display, marginTop: 4 }}>
                {errorMsg}
              </div>
            )}
          </form>
        )}
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
