'use client'

/**
 * ResetPasswordForm — saisie nouveau password avec token URL.
 * v0.9 Infrastructure Solide · Lot C
 */

import { useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!password) errs.password = 'Mot de passe requis'
    else if (password.length < 8) errs.password = 'Minimum 8 caractères'
    if (!confirmPassword) errs.confirmPassword = 'Confirmation requise'
    else if (password !== confirmPassword) errs.confirmPassword = 'Les mots de passe ne correspondent pas'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    if (!validate()) return
    if (!token) {
      setError('Lien invalide ou expiré. Demande un nouveau lien.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newPassword: password,
          token,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(translateError(data?.message ?? ''))
      } else {
        setSuccess(true)
        setTimeout(() => router.push('/login'), 2000)
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
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>✓</div>
          <h2 style={{
            fontSize: '18px', fontWeight: 700, color: 'var(--ink)',
            margin: '0 0 8px', fontFamily: 'var(--font-sora, system-ui)',
            letterSpacing: '-0.3px',
          }}>
            Mot de passe réinitialisé
          </h2>
          <p style={{
            fontSize: '14px', color: 'var(--ink-muted)', margin: 0,
            fontFamily: 'var(--font-dm, system-ui)', lineHeight: 1.6,
          }}>
            Tu vas être redirigé vers la page de connexion…
          </p>
        </div>
      </div>
    )
  }

  // Pas de token = lien invalide
  if (!token) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>⚠</div>
          <h2 style={{
            fontSize: '18px', fontWeight: 700, color: 'var(--ink)',
            margin: '0 0 8px', fontFamily: 'var(--font-sora, system-ui)',
            letterSpacing: '-0.3px',
          }}>
            Lien invalide
          </h2>
          <p style={{
            fontSize: '14px', color: 'var(--ink-muted)', margin: 0,
            fontFamily: 'var(--font-dm, system-ui)', lineHeight: 1.6,
          }}>
            Ce lien de réinitialisation est invalide ou expiré.
          </p>
          <Link href="/forgot-password" style={{
            display: 'inline-block', marginTop: '24px', padding: '10px 20px',
            background: 'var(--ink)', color: '#fff', borderRadius: '10px',
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            fontFamily: 'var(--font-sora, system-ui)',
          }}>
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        .rp-input { transition: border-color .15s, box-shadow .15s; }
        .rp-input:focus { border-color: var(--ink) !important; box-shadow: 0 0 0 3px rgba(29,29,31,.08) !important; outline: none; }
        .rp-btn { transition: all .15s; }
        .rp-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .rp-btn:active:not(:disabled) { transform: translateY(0); }
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
          Nouveau mot de passe
        </h1>
        <p style={{
          fontSize: '14px', color: 'var(--ink-muted)',
          margin: '6px 0 0', fontFamily: 'var(--font-dm, system-ui)',
        }}>
          Choisis un nouveau mot de passe sécurisé.
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: '10px' }}>
          <input
            className="rp-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe (8 caractères min)"
            autoComplete="new-password"
            aria-label="Nouveau mot de passe"
            aria-invalid={!!fieldErrors.password}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: `1px solid ${fieldErrors.password ? 'var(--red)' : 'var(--border)'}`,
              fontSize: '14px', color: 'var(--ink)',
              fontFamily: 'var(--font-dm, system-ui)',
              boxSizing: 'border-box', background: 'var(--bg)',
            }}
          />
          {fieldErrors.password && (
            <p style={{ fontSize: '12px', color: 'var(--red)', margin: '4px 0 0', fontFamily: 'var(--font-dm, system-ui)' }}>
              {fieldErrors.password}
            </p>
          )}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <input
            className="rp-input"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirme le mot de passe"
            autoComplete="new-password"
            aria-label="Confirmer le mot de passe"
            aria-invalid={!!fieldErrors.confirmPassword}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: `1px solid ${fieldErrors.confirmPassword ? 'var(--red)' : 'var(--border)'}`,
              fontSize: '14px', color: 'var(--ink)',
              fontFamily: 'var(--font-dm, system-ui)',
              boxSizing: 'border-box', background: 'var(--bg)',
            }}
          />
          {fieldErrors.confirmPassword && (
            <p style={{ fontSize: '12px', color: 'var(--red)', margin: '4px 0 0', fontFamily: 'var(--font-dm, system-ui)' }}>
              {fieldErrors.confirmPassword}
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
          className="rp-btn"
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
          {loading ? 'Enregistrement…' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </div>
  )
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('token') && (lower.includes('invalid') || lower.includes('expired'))) {
    return 'Lien invalide ou expiré. Demande un nouveau lien depuis "Mot de passe oublié".'
  }
  if (lower.includes('password') && lower.includes('short')) {
    return 'Mot de passe trop court (minimum 8 caractères).'
  }
  return msg || 'Une erreur est survenue'
}
