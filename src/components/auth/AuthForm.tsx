'use client'

/**
 * AuthForm — composant partagé entre AuthModal et pages dédiées (/login, /signup).
 * v0.9 Infrastructure Solide · Lot B
 */

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'

type Mode = 'login' | 'signup'
type Variant = 'modal' | 'page'

interface AuthFormProps {
  mode: Mode
  variant?: Variant
  redirectTo?: string
  onSwitchMode?: (mode: Mode) => void
  onSuccess?: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === 'true'

export default function AuthForm({
  mode,
  variant = 'page',
  redirectTo,
  onSwitchMode,
  onSuccess,
}: AuthFormProps) {
  const router = useRouter()
  const { signIn, signUp, signInWithGoogle } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [acceptCgu, setAcceptCgu] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!email) errs.email = 'Email requis'
    else if (!EMAIL_RE.test(email)) errs.email = 'Email invalide'
    if (!password) errs.password = 'Mot de passe requis'
    else if (password.length < 8) errs.password = 'Minimum 8 caractères'
    if (mode === 'signup') {
      if (!name.trim()) errs.name = 'Nom requis'
      else if (name.trim().length < 2) errs.name = 'Minimum 2 caractères'
      if (!acceptCgu) errs.cgu = 'Tu dois accepter les CGU'
    }
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error: e2 } = await signIn(email, password)
        if (e2) {
          setError(translateError(e2.message))
        } else {
          if (onSuccess) onSuccess()
          else router.push(redirectTo || '/home')
        }
      } else {
        const { error: e2 } = await signUp(email, password, name.trim())
        if (e2) {
          setError(translateError(e2.message))
        } else {
          setSuccess(true)
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setLoading(true)
    try {
      await signInWithGoogle()
    } catch (err: any) {
      setError(err?.message || 'Connexion Google échouée')
      setLoading(false)
    }
  }

  const isModal = variant === 'modal'
  const containerStyle: React.CSSProperties = isModal
    ? {}
    : {
        width: '100%',
        maxWidth: '420px',
        margin: '0 auto',
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.06)',
        padding: '32px 28px',
        border: '1px solid var(--border)',
      }

  if (success && mode === 'signup') {
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
            Un lien de confirmation a été envoyé à <strong style={{ color: 'var(--ink)' }}>{email}</strong>.
            <br />Clique dessus pour activer ton compte.
          </p>
          {!isModal && (
            <Link href="/login" style={{
              display: 'inline-block', marginTop: '24px', padding: '10px 20px',
              background: 'var(--ink)', color: '#fff', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600, textDecoration: 'none',
              fontFamily: 'var(--font-sora, system-ui)',
            }}>
              Aller à la connexion
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        .af-input { transition: border-color .15s, box-shadow .15s; }
        .af-input:focus { border-color: var(--ink) !important; box-shadow: 0 0 0 3px rgba(29,29,31,.08) !important; outline: none; }
        .af-btn-primary { transition: all .15s; }
        .af-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.15); }
        .af-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .af-btn-google { transition: all .15s; }
        .af-btn-google:hover:not(:disabled) { background: var(--bg) !important; border-color: var(--border-strong) !important; }
        .af-link { transition: color .1s; }
        .af-link:hover { color: var(--ink) !important; }
      `}</style>

      {!isModal && (
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
            {mode === 'login' ? 'Bon retour' : 'Créer un compte'}
          </h1>
          <p style={{
            fontSize: '14px', color: 'var(--ink-muted)',
            margin: '6px 0 0', fontFamily: 'var(--font-dm, system-ui)',
          }}>
            {mode === 'login'
              ? 'Connecte-toi pour accéder à ta collection.'
              : 'Rejoins Kodo Cards en quelques secondes.'}
          </p>
        </div>
      )}

      {GOOGLE_ENABLED && (
        <>
          <button
            className="af-btn-google"
            onClick={handleGoogle}
            disabled={loading}
            type="button"
            style={{
              width: '100%', padding: '12px', borderRadius: '10px',
              border: '1px solid var(--border)', background: '#fff',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '10px', fontSize: '13px', fontWeight: 600, color: 'var(--ink)',
              fontFamily: 'var(--font-sora, system-ui)', marginBottom: '16px',
              opacity: loading ? 0.6 : 1,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{
              fontSize: '11px', color: 'var(--ink-faint)',
              fontFamily: 'var(--font-dm, system-ui)',
            }}>
              ou par email
            </span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'signup' && (
          <div style={{ marginBottom: '10px' }}>
            <input
              className="af-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ton nom ou pseudo"
              autoComplete="name"
              aria-label="Nom"
              aria-invalid={!!fieldErrors.name}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px',
                border: `1px solid ${fieldErrors.name ? 'var(--red)' : 'var(--border)'}`,
                fontSize: '14px', color: 'var(--ink)',
                fontFamily: 'var(--font-dm, system-ui)',
                boxSizing: 'border-box', background: 'var(--bg)',
              }}
            />
            {fieldErrors.name && (
              <p style={{ fontSize: '12px', color: 'var(--red)', margin: '4px 0 0', fontFamily: 'var(--font-dm, system-ui)' }}>
                {fieldErrors.name}
              </p>
            )}
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <input
            className="af-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            aria-label="Email"
            aria-invalid={!!fieldErrors.email}
            style={{
              width: '100%', padding: '12px 14px', borderRadius: '10px',
              border: `1px solid ${fieldErrors.email ? 'var(--red)' : 'var(--border)'}`,
              fontSize: '14px', color: 'var(--ink)',
              fontFamily: 'var(--font-dm, system-ui)',
              boxSizing: 'border-box', background: 'var(--bg)',
            }}
          />
          {fieldErrors.email && (
            <p style={{ fontSize: '12px', color: 'var(--red)', margin: '4px 0 0', fontFamily: 'var(--font-dm, system-ui)' }}>
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div style={{ marginBottom: mode === 'login' ? '8px' : '14px' }}>
          <input
            className="af-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Mot de passe (8 caractères min)' : 'Mot de passe'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            aria-label="Mot de passe"
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

        {mode === 'login' && (
          <div style={{ textAlign: 'right', marginBottom: '14px' }}>
            <Link
              href="/forgot-password"
              className="af-link"
              style={{
                fontSize: '12px', color: 'var(--ink-muted)',
                fontFamily: 'var(--font-dm, system-ui)',
                textDecoration: 'none', fontWeight: 500,
              }}
            >
              Mot de passe oublié ?
            </Link>
          </div>
        )}

        {mode === 'signup' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={acceptCgu}
                onChange={(e) => setAcceptCgu(e.target.checked)}
                aria-invalid={!!fieldErrors.cgu}
                style={{
                  width: '16px', height: '16px', marginTop: '2px',
                  cursor: 'pointer', accentColor: 'var(--ink)',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: '12px', color: 'var(--ink-muted)',
                fontFamily: 'var(--font-dm, system-ui)', lineHeight: 1.5,
              }}>
                J'accepte les{' '}
                <Link href="/legal/cgu" target="_blank" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                  CGU
                </Link>
                {' '}et la{' '}
                <Link href="/legal/confidentialite" target="_blank" style={{ color: 'var(--ink)', textDecoration: 'underline' }}>
                  Politique de confidentialité
                </Link>
              </span>
            </label>
            {fieldErrors.cgu && (
              <p style={{ fontSize: '12px', color: 'var(--red)', margin: '6px 0 0 26px', fontFamily: 'var(--font-dm, system-ui)' }}>
                {fieldErrors.cgu}
              </p>
            )}
          </div>
        )}

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
          className="af-btn-primary"
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
          {loading
            ? 'Chargement…'
            : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
        </button>
      </form>

      <p style={{
        textAlign: 'center', margin: '20px 0 0',
        fontSize: '13px', color: 'var(--ink-muted)',
        fontFamily: 'var(--font-dm, system-ui)',
      }}>
        {mode === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}{' '}
        {onSwitchMode ? (
          <button
            className="af-link"
            type="button"
            onClick={() => {
              onSwitchMode(mode === 'login' ? 'signup' : 'login')
              setError('')
              setFieldErrors({})
            }}
            style={{
              background: 'none', border: 'none', color: 'var(--ink-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: '13px',
              fontFamily: 'var(--font-dm, system-ui)',
              textDecoration: 'underline', padding: 0,
            }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        ) : (
          <Link
            href={mode === 'login' ? '/signup' : '/login'}
            className="af-link"
            style={{
              color: 'var(--ink-muted)', fontWeight: 600,
              fontSize: '13px', fontFamily: 'var(--font-dm, system-ui)',
              textDecoration: 'underline',
            }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </Link>
        )}
      </p>
    </div>
  )
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid') && lower.includes('credentials')) return 'Email ou mot de passe incorrect.'
  if (lower.includes('user') && lower.includes('not found')) return 'Aucun compte trouvé avec cet email.'
  if (lower.includes('email') && lower.includes('exist')) return 'Un compte existe déjà avec cet email.'
  if (lower.includes('password') && lower.includes('short')) return 'Mot de passe trop court (minimum 8 caractères).'
  if (lower.includes('rate') && lower.includes('limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  return msg
}
