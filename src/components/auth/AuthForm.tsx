'use client'
import { track } from '@/components/layout/Analytics'

/**
 * AuthForm — refonte Snow+ Spotlight pattern.
 * Glass card + dégradé fond + animations Apple (fadeIn + slideUp + zoom).
 * Logique métier 100% préservée (validate, submit, errors, Google OAuth, success).
 */

import { useState, useMemo, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { SNOW, FONT, GLASS, RADIUS, TRANSITION, SHADOW } from '@/lib/design/snow'

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
  const [showPw, setShowPw] = useState(false)

  // Form "ready to submit" pour glow pulse sur le bouton
  const formReady = useMemo(() => {
    if (!email || !password) return false
    if (!EMAIL_RE.test(email) || password.length < 8) return false
    if (mode === 'signup' && (!name.trim() || !acceptCgu)) return false
    return true
  }, [email, password, name, acceptCgu, mode])

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
          track('login')
          if (onSuccess) onSuccess()
          else router.push(redirectTo || '/home')
        }
      } else {
        const { error: e2 } = await signUp(email, password, name.trim())
        if (e2) {
          setError(translateError(e2.message))
        } else {
          track('signup_completed')
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

  // Le layout (auth) porte deja le degrade + blobs. AuthForm ne fait que la card.

  const cardStyle: React.CSSProperties = {
    width: '100%',
    // Assise discrete : le formulaire a besoin d etre tenu, pas encadre.
    // Fond a peine pose + bordure fine, loin de la carte blanche flottante.
    padding: '34px 26px 30px',
    borderRadius: 20,
    background: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.75)',
    boxShadow: '0 1px 2px rgba(20,20,40,0.03), 0 12px 32px rgba(20,20,40,0.05)',
    backdropFilter: 'blur(16px) saturate(160%)',
    WebkitBackdropFilter: 'blur(16px) saturate(160%)',
    position: 'relative',
    zIndex: 1,
    animation: 'authCardEnter .45s cubic-bezier(.16,1,.3,1) both',
  }

  // ─── Success state (signup confirmation) ─────────────────────────────────
  if (success && mode === 'signup') {
    const successCard = (
      <div style={isModal ? {} : cardStyle}>
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 16px',
            borderRadius: '50%', background: SNOW.greenLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'float 3s ease-in-out infinite',
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={SNOW.green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          </div>
          <h2 style={{
            fontSize: 20, fontWeight: 700, color: SNOW.ink,
            margin: '0 0 8px', fontFamily: FONT.display, letterSpacing: '-0.3px',
          }}>
            Vérifie tes emails
          </h2>
          <p style={{
            fontSize: 14, color: SNOW.muted, margin: 0,
            fontFamily: FONT.body, lineHeight: 1.6,
          }}>
            Un lien de confirmation a été envoyé à <strong style={{ color: SNOW.ink }}>{email}</strong>.<br />
            Clique dessus pour activer ton compte.
          </p>
          {!isModal && (
            <Link href="/login" style={{
              display: 'inline-block', marginTop: 24, padding: '11px 22px',
              background: SNOW.ink, color: '#fff', borderRadius: RADIUS.md,
              fontSize: 13, fontWeight: 600, textDecoration: 'none',
              fontFamily: FONT.display, transition: TRANSITION.all,
            }}>
              Aller à la connexion
            </Link>
          )}
        </div>
      </div>
    )
    return isModal ? successCard : (
      <>
        <style>{authStyles}</style>
        {successCard}
      </>
    )
  }

  // ─── Form ────────────────────────────────────────────────────────────────
  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px 17px',
    borderRadius: 13,
    border: `1.5px solid ${hasError ? SNOW.red : 'rgba(0,0,0,0.07)'}`,
    fontSize: 15,
    boxShadow: '0 1px 2px rgba(20,20,40,0.04)',
    color: SNOW.ink,
    fontFamily: FONT.body,
    boxSizing: 'border-box',
    background: '#FFFFFF',
    backdropFilter: 'blur(8px)',
    transition: 'all .15s cubic-bezier(.2,.8,.2,1)',
    outline: 'none',
  })

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12.5,
    fontWeight: 600,
    color: SNOW.ink,
    fontFamily: FONT.display,
    margin: '0 0 7px 2px',
    letterSpacing: '-0.1px',
  }

  const fieldErrorStyle: React.CSSProperties = {
    fontSize: 12, color: SNOW.red, margin: '5px 2px 0',
    fontFamily: FONT.body, animation: 'slideUp .2s ease',
  }

  const formContent = (
    <>
      {!isModal && (
        <div style={{ marginBottom: 30 }}>
          <h1 style={{
            fontSize: 34, fontWeight: 800, color: SNOW.ink,
            margin: 0, fontFamily: FONT.display, letterSpacing: '-1.2px',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}>
            {mode === 'login' ? 'Ta collection t\u2019attend' : 'Commence ta collection'}
          </h1>
          <p style={{
            fontSize: 14.5, color: SNOW.muted, margin: '12px 0 0',
            fontFamily: FONT.body, lineHeight: 1.5,
          }}>
            {mode === 'login'
              ? 'Connecte-toi pour la retrouver.'
              : 'Quelques secondes, et tu ajoutes ta première carte.'}
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
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuer avec Google
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 18px' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(229,229,234,0.7)' }} />
            <span style={{
              fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.body,
              letterSpacing: '0.02em',
            }}>
              ou par email
            </span>
            <div style={{ flex: 1, height: 1, background: 'rgba(229,229,234,0.7)' }} />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {mode === 'signup' && (
          <div style={{ marginBottom: 16 }}>
            <label htmlFor="af-name" style={labelStyle}>Nom ou pseudo</label>
            <input
              id="af-name"
              className="af-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Comment on t'appelle ?"
              autoComplete="name"
              aria-invalid={!!fieldErrors.name}
              style={inputStyle(!!fieldErrors.name)}
            />
            {fieldErrors.name && <p style={fieldErrorStyle}>{fieldErrors.name}</p>}
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="af-email" style={labelStyle}>Email</label>
          <input
            id="af-email"
            className="af-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="toi@exemple.com"
            autoComplete="email"
            aria-invalid={!!fieldErrors.email}
            style={inputStyle(!!fieldErrors.email)}
          />
          {fieldErrors.email && <p style={fieldErrorStyle}>{fieldErrors.email}</p>}
        </div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <label htmlFor="af-pw" style={labelStyle}>Mot de passe</label>
            {mode === 'login' && (
              <Link href="/forgot-password" className="af-link" style={{
                fontSize: 12, color: SNOW.muted, fontFamily: FONT.body,
                textDecoration: 'none', fontWeight: 500,
              }}>
                Oublié ?
              </Link>
            )}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="af-pw"
              className="af-input"
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? '8 caractères minimum' : '••••••••'}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              aria-invalid={!!fieldErrors.password}
              style={{ ...inputStyle(!!fieldErrors.password), paddingRight: 46 }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="af-eye"
            >
              {showPw ? (
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.4 5.3A9.6 9.6 0 0112 5c5 0 9 4.5 9 7a11 11 0 01-2.4 3.5M6.3 6.7A11.4 11.4 0 003 12c0 2.5 4 7 9 7 1.2 0 2.3-.3 3.3-.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none"><path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8"/></svg>
              )}
            </button>
          </div>
          {fieldErrors.password && <p style={fieldErrorStyle}>{fieldErrors.password}</p>}
        </div>

        {mode === 'signup' && (
          <div style={{ marginBottom: 18 }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={acceptCgu}
                onChange={(e) => setAcceptCgu(e.target.checked)}
                style={{
                  width: 16, height: 16, marginTop: 2,
                  cursor: 'pointer', accentColor: SNOW.ink, flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 12, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.5,
              }}>
                J'accepte les{' '}
                <Link href="/legal/cgu" target="_blank" style={{ color: SNOW.ink, textDecoration: 'underline' }}>
                  CGU
                </Link>{' '}et la{' '}
                <Link href="/legal/confidentialite" target="_blank" style={{ color: SNOW.ink, textDecoration: 'underline' }}>
                  Politique de confidentialité
                </Link>
              </span>
            </label>
            {fieldErrors.cgu && (
              <p style={{ ...fieldErrorStyle, marginLeft: 26 }}>{fieldErrors.cgu}</p>
            )}
          </div>
        )}

        {error && (
          <div role="alert" style={{
            padding: '11px 14px', borderRadius: RADIUS.md,
            background: SNOW.redLight, border: `1px solid rgba(224,48,32,0.2)`,
            marginBottom: 14, animation: 'slideUp .25s cubic-bezier(.2,.8,.2,1)',
          }}>
            <p style={{
              fontSize: 12, color: SNOW.red, margin: 0,
              fontFamily: FONT.body, fontWeight: 500,
            }}>
              {error}
            </p>
          </div>
        )}

        <button
          className={formReady && !loading ? 'af-btn-primary af-btn-pulse' : 'af-btn-primary'}
          type="submit"
          disabled={loading}
          style={{
            width: '100%', padding: '17px', borderRadius: 13,
            border: 'none', background: SNOW.ink, color: '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
            fontFamily: FONT.display, opacity: loading ? 0.7 : 1,
            letterSpacing: '-0.2px',
          }}
        >
          {loading ? 'Chargement…' : (
            <span className="af-cta">
              {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </button>
      </form>

      <p style={{
        textAlign: 'left', margin: '20px 0 0',
        fontSize: 13, color: SNOW.muted, fontFamily: FONT.body,
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
              background: 'none', border: 'none', color: SNOW.red,
              cursor: 'pointer', fontWeight: 700, fontSize: 14,
              fontFamily: FONT.body, textDecoration: 'none', padding: 0,
            }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </button>
        ) : (
          <Link href={mode === 'login' ? '/signup' : '/login'} className="af-link"
            style={{
              color: SNOW.red, fontWeight: 700, fontSize: 14,
              fontFamily: FONT.body, textDecoration: 'none',
            }}
          >
            {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
          </Link>
        )}
      </p>
    </>
  )

  // ─── Render variants ─────────────────────────────────────────────────────
  if (isModal) {
    return (
      <>
        <style>{authStyles}</style>
        <div>{formContent}</div>
      </>
    )
  }

  return (
    <>
      <style>{authStyles}</style>
      <div style={cardStyle}>{formContent}</div>
    </>
  )
}

// ─── CSS animations (inline pour porter avec le composant) ─────────────────
const authStyles = `
  @keyframes authCardEnter {
    0% { opacity: 0; transform: translateY(20px) scale(0.97); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes authBtnPulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(29,29,31,0); }
    50% { box-shadow: 0 0 0 6px rgba(29,29,31,0.06); }
  }
  .af-input { transition: all .15s cubic-bezier(.2,.8,.2,1); }
  .af-input:focus {
    border-color: ${SNOW.red} !important;
    background: #fff !important;
    box-shadow: 0 0 0 4px rgba(224,48,32,0.10) !important;
    outline: none;
  }
  .af-input::placeholder { color: #B4B4B9; }
  .af-btn-primary { transition: all .2s cubic-bezier(.2,.8,.2,1); }
  .af-cta { display: inline-flex; align-items: center; gap: 8px; }
  .af-cta svg { transition: transform .22s cubic-bezier(.2,.8,.2,1); }
  .af-btn-primary:hover:not(:disabled) .af-cta svg { transform: translateX(4px); }
  .af-btn-primary:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 26px rgba(0,0,0,0.22);
  }
  .af-btn-primary:active:not(:disabled) { transform: translateY(0); }
  .af-btn-pulse { animation: authBtnPulse 2s ease-in-out infinite; }
  .af-btn-google {
    width: 100%; padding: 12px; border-radius: ${RADIUS.md}px;
    border: 1px solid rgba(229,229,234,0.8);
    background: rgba(255,255,255,0.65);
    backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    gap: 10px; font-size: 13px; font-weight: 600; color: ${SNOW.ink};
    font-family: ${FONT.display}; margin-bottom: 16px;
    transition: all .15s cubic-bezier(.2,.8,.2,1);
  }
  .af-btn-google:hover:not(:disabled) {
    background: rgba(255,255,255,0.9);
    border-color: ${SNOW.borderHover};
    transform: translateY(-1px);
  }
  .af-btn-google:disabled { opacity: 0.6; cursor: wait; }
  .af-eye {
    position: absolute; right: 6px; top: 50%; transform: translateY(-50%);
    width: 34px; height: 34px; border: none; background: none;
    color: #AEAEB2; cursor: pointer; padding: 0;
    display: flex; align-items: center; justify-content: center;
    border-radius: 9px; transition: color .15s ease, background .15s ease;
  }
  .af-eye svg { width: 18px; height: 18px; }
  .af-eye:hover { color: ${SNOW.ink}; background: rgba(0,0,0,0.04); }
  .af-link { transition: color .1s ease; }
  .af-link:hover { color: ${SNOW.ink} !important; }
`

function translateError(msg: string): string {
  const lower = msg.toLowerCase()
  if (lower.includes('invalid') && lower.includes('credentials')) return 'Email ou mot de passe incorrect.'
  if (lower.includes('user') && lower.includes('not found')) return 'Aucun compte trouvé avec cet email.'
  if (lower.includes('email') && lower.includes('exist')) return 'Un compte existe déjà avec cet email.'
  if (lower.includes('password') && lower.includes('short')) return 'Mot de passe trop court (minimum 8 caractères).'
  if (lower.includes('rate') && lower.includes('limit')) return 'Trop de tentatives. Réessaie dans quelques minutes.'
  return msg
}
