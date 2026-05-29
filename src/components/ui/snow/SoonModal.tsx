'use client'
import { useState, type FormEvent } from 'react'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION, SHADOW } from '@/lib/design/snow'
import { SnowButton } from './SnowButton'

interface SoonModalProps {
  open: boolean
  onClose: () => void
  /** Nom de la feature (ex: "Alpha Signals") */
  feature: string
  /** Version cible (ex: "v2.0") */
  version: 'v2.0' | 'v3.0' | 'v4.0'
  /** Description courte de la feature */
  description: string
  /** Sub-features list (3-5 bullets max) */
  bullets?: string[]
  /** ID liste Brevo pour la waitlist (si null, pas de CTA notify) */
  brevoListId?: number | null
  /** Label CTA secondaire (par defaut "Plus tard") */
  cancelLabel?: string
}

/**
 * Modal SOON qui presente une feature future + capture waitlist Brevo.
 *
 * Reutilise la mecanique de waitlist_jp (route /api/waitlist).
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
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn .2s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...GLASS.cardElevated,
          width: '100%', maxWidth: 460,
          padding: '32px 28px',
          animation: 'slideUp .35s cubic-bezier(.16,1,.3,1)',
          position: 'relative',
        }}
      >
        {/* Close X */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 28, height: 28, borderRadius: '50%',
            border: 'none', background: 'transparent',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            color: SNOW.muted, transition: TRANSITION.fast,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Badge SOON */}
        <div style={{ marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', fontSize: 10, fontWeight: 700,
            fontFamily: FONT.data, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: SNOW.amberDark,
            background: SNOW.amber, borderRadius: RADIUS.sm,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: '50%',
              background: SNOW.amberDark, opacity: 0.7,
              animation: 'blink 2s ease-in-out infinite',
            }} />
            SOON · {version}
          </span>
        </div>

        {done ? (
          // ─── Etat succes ───────────────────────────────────────────────
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{
              width: 56, height: 56, margin: '0 auto 16px',
              borderRadius: '50%', background: SNOW.greenLight,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={SNOW.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h3 style={{
              fontSize: 18, fontWeight: 700, color: SNOW.ink,
              margin: '0 0 6px', fontFamily: FONT.display,
            }}>
              C'est noté !
            </h3>
            <p style={{
              fontSize: 13, color: SNOW.muted, margin: 0,
              fontFamily: FONT.body, lineHeight: 1.5,
            }}>
              On te préviendra dès que <strong style={{ color: SNOW.ink }}>{feature}</strong> sera prêt.
            </p>
          </div>
        ) : (
          // ─── Etat formulaire ───────────────────────────────────────────
          <>
            <h3 style={{
              fontSize: 22, fontWeight: 700, color: SNOW.ink,
              margin: '0 0 8px', fontFamily: FONT.display,
              letterSpacing: '-0.4px',
            }}>
              {feature}
            </h3>
            <p style={{
              fontSize: 14, color: SNOW.muted, margin: '0 0 18px',
              fontFamily: FONT.body, lineHeight: 1.55,
            }}>
              {description}
            </p>

            {bullets && bullets.length > 0 && (
              <ul style={{
                listStyle: 'none', padding: 0, margin: '0 0 22px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {bullets.map((b, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    fontSize: 13, color: SNOW.inkSoft, fontFamily: FONT.body,
                    lineHeight: 1.5,
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: SNOW.greenLight, color: SNOW.green,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 5 4 7 8 3"/>
                      </svg>
                    </span>
                    {b}
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
                    width: '100%', padding: '12px 14px',
                    borderRadius: RADIUS.md,
                    border: `1.5px solid ${error ? SNOW.red : 'rgba(229,229,234,0.8)'}`,
                    fontSize: 14, color: SNOW.ink, fontFamily: FONT.body,
                    boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all .15s cubic-bezier(.2,.8,.2,1)',
                    outline: 'none',
                    marginBottom: error ? 6 : 12,
                  }}
                />
                {error && (
                  <p style={{
                    fontSize: 12, color: SNOW.red, margin: '0 2px 12px',
                    fontFamily: FONT.body,
                  }}>
                    {error}
                  </p>
                )}
                <div style={{ display: 'flex', gap: 10 }}>
                  <SnowButton
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    fullWidth
                  >
                    {submitting ? 'Inscription…' : 'Me prévenir au lancement'}
                  </SnowButton>
                  <SnowButton
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                  >
                    {cancelLabel}
                  </SnowButton>
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
