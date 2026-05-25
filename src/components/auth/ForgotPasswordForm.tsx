'use client'

/**
 * ForgotPasswordForm — saisie email pour demande de reset.
 * v0.9 Infrastructure Solide · Lot C
 */

import { useState, type FormEvent } from 'react'
import Link from 'next/link'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    setFieldError('')

    if (!email) {
      setFieldError('Email requis')
      return
    }
    if (!EMAIL_RE.test(email)) {
      setFieldError('Email invalide')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? 'Une erreur est survenue')
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const containerStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)',
    padding: '32px 28px',
    border: '1px solid var(--border)',
  }

  if (success) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>✉️</div>
          <h2 style={{
            fontSize: '18px', fontWeight: 700, color: 'var(--ink)',
            margin: '0 0 8px', fontFamily: 'var(--font-sora, system-ui)',
            letterSpacing: '-0.3px',
          }}>
            Vérifie tes emails
          </h2>
          <p style={{
            fontSize: '14px', color: 'var(--ink-muted)', margin: 0,
            fontFamily: 'var(--font-dm, system-ui)', lineHeight: 1.6,
          }}>
            Si un compte existe avec <strong style={{ color: 'var(--ink)' }}>{email}</strong>,
            tu recevras un lien pour réinitialiser ton mot de passe.
            <br /><br />
            Le lien expire dans 1 heure.
          </p>
          <Link href="/login" style={{
            display: 'inline-block', marginTop: '24px', padding: '10px 20px',
            background: 'var(--ink)', color: '#fff', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            fontFamily: 'var(--font-sora, system-ui)',
          }}>
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        .fp-input { transition: border-color .15s, box-shadow .15s; }
        .fp-input:focus { border-color: var(--ink) !important; box-shadow: 0 0 0 3px rgba(29,29,31,.08) !important; outline: none; }
        .fp-btn { transition: all .15s; }
        .fp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .fp-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <p style={{
          fontSize: '10px', color: 'var(--ink-faint)',
          textTransform: 'uppercase', letterSpacing: '.12em',
          margin: '0 0 6px', fontWeight: 600,
          fontFamily: 'var(--font-sora, system-ui)',
        }}>
          Kodo Cards
        </p>
        <h1 style={{
          fontSize: '24px', fontWeight: 700, color: 'var(--ink)',
          margin: 0, fontFamily: 'var(--font-sora, system-ui)',
          letterSpacing: '-0.4px',
        }}>
          Mot de passe oublié
        </h1>
        <p style={{
          fontSize: '14px', color: 'var(--ink-muted)',
          margin: '6px 0 0', fontFamily: 'var(--font-dm, system-ui)',
        }}>
          Saisis ton email, on t&apos;envoie un lien pour le réinitialiser.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '14px' }}>
          <input
            className="fp-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            aria-label="Email"
            aria-invalid={!!fieldError}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: `1px solid ${fieldError ? 'var(--red)' : 'var(--border)'}`,
              fontSize: '14px', color: 'var(--ink)',
              fontFamily: 'var(--font-dm, system-ui)',
              boxSizing: 'border-box', background: 'var(--bg)',
            }}
          />
          {fieldError && (
            <p style={{ fontSize: '12px', color: 'var(--red)', margin: '4px 0 0', fontFamily: 'var(--font-dm, system-ui)' }}>
              {fieldError}
            </p>
          )}
        </div>

        {error && (
          <div role="alert" style={{
            padding: '10px 12px', borderRadius: '8px',
            background: 'var(--red-light)', border: '1px solid var(--red-border)',
            marginBottom: '12px',
          }}>
            <p style={{
              fontSize: '12px', color: 'var(--red)', margin: 0,
              fontFamily: 'var(--font-dm, system-ui)',
            }}>
              {error}
            </p>
          </div>
        )}

        <button
          className="fp-btn"
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '13px', borderRadius: '10px',
            border: 'none', background: 'var(--ink)', color: '#fff',
            fontSize: '14px', fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: 'var(--font-sora, system-ui)',
            opacity: loading ? 0.7 : 1, letterSpacing: '-0.2px',
          }}
        >
          {loading ? 'Envoi…' : 'Envoyer le lien'}
        </button>
      </form>

      <p style={{
        textAlign: 'center', margin: '20px 0 0',
        fontSize: '13px', color: 'var(--ink-muted)',
        fontFamily: 'var(--font-dm, system-ui)',
      }}>
        <Link
          href="/login"
          style={{
            color: 'var(--ink-muted)', fontWeight: 500,
            fontSize: '13px', fontFamily: 'var(--font-dm, system-ui)',
            textDecoration: 'underline',
          }}
        >
          ← Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
