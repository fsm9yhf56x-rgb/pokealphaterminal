'use client'
import { useState, type FormEvent } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION } from '@/lib/design/snow'
import { SnowButton } from './SnowButton'

interface SoonModalProps {
  open: boolean
  onClose: () => void
  feature: string
  version: 'v2.0' | 'v3.0' | 'v4.0'
  description: string
  bullets?: string[]
  brevoListId?: number | null
  cancelLabel?: string
}

/**
 * SoonModal v7 - Glass premium ref SpotDrawer.
 *
 * Fix: maxHeight 90vh + overflow-y auto pour contenus longs.
 * Centrage flex propre + animation slide-up smooth.
 */
export function SoonModal({
  open, onClose, feature, version, description, bullets,
  brevoListId = null, cancelLabel = 'Plus tard',
}: SoonModalProps) {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  if (!open) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email invalide')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          listId: brevoListId,
          source: `soon-modal-${feature.toLowerCase().replace(/\s/g, '-')}`,
        }),
      })
      if (!res.ok) throw new Error('Echec de l\'inscription')
      setDone(true)
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed' as const,
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '6vh 24px 24px',
        overflowY: 'auto' as const,
        animation: 'modalFade .25s cubic-bezier(.2,.8,.2,1)',
      }}
    >
      <style>{`
        @keyframes modalFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 480,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          borderRadius: 20,
          border: '1px solid rgba(255,255,255,0.5)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 6px 20px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '34px 30px 28px',
          animation: 'modalSlideUp .4s cubic-bezier(.16,1,.3,1)',
          position: 'relative' as const,
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute' as const,
            top: 14, right: 14,
            width: 30, height: 30, borderRadius: '50%',
            border: 'none',
            background: 'rgba(0,0,0,0.04)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: SNOW.muted,
            transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; e.currentTarget.style.color = SNOW.ink }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = SNOW.muted }}
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Badge SOON v7 inline */}
        <div style={{ marginBottom: 14 }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            fontSize: 10.5,
            fontWeight: 600,
            fontFamily: FONT.display,
            letterSpacing: '0.05em',
            textTransform: 'uppercase' as const,
            color: '#86868B',
            background: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            border: '1px solid rgba(0,0,0,0.05)',
            borderRadius: RADIUS.sm,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)',
          }}>
            <span style={{ color: '#AEAEB2', fontSize: 8 }}>○</span>
            <span>Bientôt</span>
            <span style={{ color: '#1D1D1F', fontWeight: 700, letterSpacing: '-0.01em', textTransform: 'none' as const }}>· {version}</span>
          </span>
        </div>

        {done ? (
          <div style={{ textAlign: 'center' as const, padding: '14px 0 6px' }}>
            <div style={{
              width: 58, height: 58, margin: '0 auto 18px',
              borderRadius: '50%',
              background: 'rgba(46,158,106,0.12)',
              border: '1px solid rgba(46,158,106,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
            }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2E9E6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: 19, fontWeight: 700, color: SNOW.ink,
              margin: '0 0 8px', fontFamily: FONT.display,
              letterSpacing: '-0.02em',
            }}>
              C\u2019est noté !
            </h3>
            <p style={{
              fontSize: 13.5, color: SNOW.muted, margin: 0,
              fontFamily: FONT.display, lineHeight: 1.55,
            }}>
              On te préviendra dès que <strong style={{ color: SNOW.ink, fontWeight: 700 }}>{feature}</strong> sera prêt.
            </p>
          </div>
        ) : (
          <>
            <h3 style={{
              fontSize: 24, fontWeight: 800, color: SNOW.ink,
              margin: '0 0 10px', fontFamily: FONT.display,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}>
              {feature}
            </h3>
            <p style={{
              fontSize: 14, color: SNOW.muted, margin: '0 0 22px',
              fontFamily: FONT.display, lineHeight: 1.6,
            }}>
              {description}
            </p>

            {bullets && bullets.length > 0 && (
              <ul style={{
                listStyle: 'none', padding: 0, margin: '0 0 24px',
                display: 'flex', flexDirection: 'column' as const, gap: 10,
              }}>
                {bullets.map((b, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 11,
                    fontSize: 13, color: SNOW.inkSoft, fontFamily: FONT.display,
                    lineHeight: 1.5,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(46,158,106,0.12)',
                      border: '1px solid rgba(46,158,106,0.2)',
                      color: '#2E9E6A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 5 4 7 8 3"/>
                      </svg>
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {brevoListId !== null ? (
              <form onSubmit={handleSubmit} noValidate>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  autoComplete="email"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    height: 46,
                    padding: '0 16px',
                    borderRadius: 12,
                    border: `1px solid ${error ? SNOW.red : 'rgba(0,0,0,0.08)'}`,
                    fontSize: 14,
                    color: SNOW.ink,
                    fontFamily: FONT.display,
                    boxSizing: 'border-box' as const,
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(12px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95)',
                    transition: 'all .2s cubic-bezier(.2,.8,.2,1)',
                    outline: 'none',
                    marginBottom: error ? 6 : 14,
                  }}
                />
                {error && (
                  <p style={{
                    fontSize: 12, color: SNOW.red, margin: '0 2px 14px',
                    fontFamily: FONT.display,
                  }}>
                    {error}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      flex: 1,
                      height: 46,
                      padding: '0 22px',
                      borderRadius: 12,
                      background: submitting ? 'rgba(0,0,0,0.05)' : SNOW.ink,
                      color: submitting ? SNOW.muted : '#fff',
                      border: 'none',
                      fontSize: 13.5,
                      fontWeight: 700,
                      cursor: submitting ? 'default' : 'pointer',
                      fontFamily: FONT.display,
                      transition: 'all .2s cubic-bezier(.2,.85,.3,1)',
                      letterSpacing: '0.01em',
                      boxShadow: submitting ? 'none' : '0 4px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                    onMouseEnter={e => { if (!submitting) { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
                    onMouseLeave={e => { if (!submitting) { e.currentTarget.style.background = SNOW.ink; e.currentTarget.style.transform = '' } }}
                  >
                    {submitting ? 'Inscription…' : 'Me prévenir au lancement'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      height: 46,
                      padding: '0 18px',
                      borderRadius: 12,
                      background: 'rgba(255,255,255,0.5)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid rgba(0,0,0,0.06)',
                      color: SNOW.muted,
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      fontFamily: FONT.display,
                      transition: 'all .2s',
                      whiteSpace: 'nowrap' as const,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = SNOW.ink; e.currentTarget.style.background = 'rgba(255,255,255,0.8)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = SNOW.muted; e.currentTarget.style.background = 'rgba(255,255,255,0.5)' }}
                  >
                    {cancelLabel}
                  </button>
                </div>
              </form>
            ) : (
              <SnowButton variant="secondary" onClick={onClose} fullWidth>
                Compris
              </SnowButton>
            )}
          </>
        )}
      </div>
    </div>
  )
}
