'use client'

/**
 * /releases · Prochains Sets
 *
 * Reproduit le langage visuel du SpotDrawer (reference absolue glassmorphism v7):
 * - Cards glass v7 ultra translucides sur bokeh AppShell
 * - Bordures quasi invisibles rgba(0,0,0,0.04)
 * - Hierarchy: grand chiffre noir + label muted
 * - Sub-blocks tres clairs pour les KPIs
 *
 * Vocabulaire collector: on AGREGE les releases officielles Pokemon TCG,
 * on NE droppe RIEN. Tone: insight Bloomberg pour le TCG.
 */

import { useState } from 'react'
import { SNOW, FONT, GLASS } from '@/lib/design/snow'

type UpcomingSet = {
  name: string
  slug: string
  pptId: string
  series: string
  releaseDate: string
  releaseDateLocale: string
  imageUrl: string | null
  daysUntil: number
  isReleased: boolean
}

export default function ReleasesClient({ sets }: { sets: UpcomingSet[] }) {
  return (
    <main style={{
      minHeight: '80vh',
      padding: '40px 20px 80px',
      maxWidth: 1100,
      margin: '0 auto',
      position: 'relative' as const,
      zIndex: 1,
    }}>
      <Hero count={sets.length} />
      {sets.length === 0 ? (
        <EmptyState />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 24 }}>
          {sets.map(s => <SetCard key={s.pptId} set={s} />)}
        </div>
      )}
      <Footer />
    </main>
  )
}

function Hero({ count }: { count: number }) {
  return (
    <div style={{ marginBottom: 40, textAlign: 'center' as const, paddingTop: 20 }}>
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
        {count} {count > 1 ? 'sets a venir' : 'set a venir'}
      </div>

      <h1 style={{
        fontSize: 'clamp(42px, 6vw, 68px)',
        fontWeight: 800, color: SNOW.ink, fontFamily: FONT.display,
        letterSpacing: '-0.04em', lineHeight: 1.05, margin: '0 0 14px',
      }}>
        Prochains Sets
      </h1>

      <p style={{
        fontSize: 'clamp(15px, 1.5vw, 17px)',
        color: SNOW.muted, fontFamily: FONT.display,
        lineHeight: 1.6, maxWidth: 540, margin: '0 auto',
      }}>
        Les nouvelles sorties Pokemon TCG, anticipees pour toi.<br/>
        Sois prevenu des qu&apos;un set est disponible.
      </p>

      <style jsx>{`
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  )
}

function SetCard({ set }: { set: UpcomingSet }) {
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
      setStatus('error'); setErrorMsg(err.message || 'Erreur, reessaye')
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
      gridTemplateColumns: 'minmax(0, 300px) 1fr',
      minHeight: 300,
    }}>
      {/* Colonne visuel */}
      <div style={{
        position: 'relative' as const,
        background: 'linear-gradient(135deg, rgba(255,165,80,0.06), rgba(195,135,245,0.06) 50%, rgba(0,210,150,0.04))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 44,
        borderRight: '1px solid rgba(0,0,0,0.04)',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{
          position: 'absolute', top: '10%', left: '10%', right: '10%', bottom: '10%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,165,80,0.18), transparent 60%)',
          filter: 'blur(40px)', pointerEvents: 'none' as const,
        }} />
        <div aria-hidden style={{
          position: 'absolute', top: '20%', right: '10%', width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(195,135,245,0.22), transparent 60%)',
          filter: 'blur(30px)', pointerEvents: 'none' as const,
        }} />
        {set.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={set.imageUrl}
            alt={set.name}
            style={{
              maxWidth: '100%', maxHeight: 200,
              position: 'relative' as const,
              filter: 'drop-shadow(0 16px 36px rgba(0,0,0,0.18))',
            }}
          />
        ) : (
          <div style={{
            width: 140, height: 140, borderRadius: 18,
            background: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(0,0,0,0.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: SNOW.muted, fontSize: 11, fontFamily: FONT.display,
            textAlign: 'center' as const, padding: 12,
          }}>Visuel a venir</div>
        )}
      </div>

      {/* Colonne contenu */}
      <div style={{
        padding: '30px 34px',
        display: 'flex', flexDirection: 'column' as const,
        justifyContent: 'space-between', gap: 20,
      }}>
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 700, color: SNOW.muted,
            fontFamily: FONT.display, letterSpacing: '0.2em',
            textTransform: 'uppercase' as const, marginBottom: 10,
          }}>{set.series}</div>

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
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SNOW.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span style={{ color: SNOW.muted }}>Sortie</span>
            <span style={{ fontWeight: 700, color: SNOW.ink }}>{set.releaseDateLocale}</span>
          </div>
        </div>

        {/* Compteur J-X gros */}
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
            On te previent des que le set sort
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
              {status === 'loading' ? 'Envoi...' : 'Previens-moi'}
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
        Aucun set en attente
      </h2>
      <p style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.55, maxWidth: 340, margin: 0 }}>
        Tous les sets Pokemon TCG annonces sont actuellement disponibles. Reviens bientot pour voir les nouvelles annonces.
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
        Donnees agreges depuis les annonces officielles · Mise a jour quotidienne automatique
      </p>
    </div>
  )
}
