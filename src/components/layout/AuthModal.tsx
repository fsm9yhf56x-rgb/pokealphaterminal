'use client'

/**
 * AuthModal — wrapper modal qui consomme AuthForm partagé.
 * Refacto v0.9 Lot B : 1 source de vérité auth (AuthForm).
 */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import AuthForm from '@/components/auth/AuthForm'

type Mode = 'login' | 'signup'

interface AuthModalProps {
  open: boolean
  onClose: () => void
  defaultMode?: Mode
}

export default function AuthModal({ open, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>(defaultMode)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) setMode(defaultMode)
  }, [open, defaultMode])

  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = original }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  if (!open || !mounted) return null

  const modal = (
    <>
      <style>{`
        @keyframes modalIn { from { opacity: 0; transform: scale(.95) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        .auth-overlay { animation: overlayIn .2s ease-out; }
        .auth-modal { animation: modalIn .25s ease-out; }
        .auth-close { transition: background .1s; }
        .auth-close:hover { background: #F0F0F0 !important; }
      `}</style>

      <div
        className="auth-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'login' ? 'Connexion' : 'Créer un compte'}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(4px)',
          zIndex: 99999, display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '20px', overflowY: 'auto',
        }}
      >
        <div
          className="auth-modal"
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: '420px', background: '#fff',
            borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,.2)',
            overflow: 'hidden', margin: 'auto 0',
            maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
          }}
        >
          <div style={{
            padding: '24px 24px 0',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{
                fontSize: '10px', color: 'var(--ink-faint)',
                textTransform: 'uppercase', letterSpacing: '.12em',
                margin: '0 0 4px', fontWeight: 600,
                fontFamily: 'var(--font-sora, system-ui)',
              }}>
                Kodo Cards
              </p>
              <h2 style={{
                fontSize: '22px', fontWeight: 700, color: 'var(--ink)',
                margin: 0, fontFamily: 'var(--font-sora, system-ui)',
                letterSpacing: '-.3px',
              }}>
                {mode === 'login' ? 'Connexion' : 'Créer un compte'}
              </h2>
            </div>
            <button
              className="auth-close"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: 'none', background: 'var(--bg)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '16px', color: 'var(--ink-muted)',
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ padding: '20px 24px 24px' }}>
            <AuthForm
              mode={mode}
              variant="modal"
              onSwitchMode={setMode}
              onSuccess={onClose}
            />
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(modal, document.body)
}
