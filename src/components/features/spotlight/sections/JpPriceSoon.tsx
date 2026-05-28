'use client'
import { useState } from 'react'
import { SNOW, FONT } from '../snowTokens'

interface Props {
  cardId: string
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function JpPriceSoon({ cardId }: Props) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errMsg, setErrMsg] = useState('')

  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())

  async function submit() {
    if (!isValid || status === 'submitting') return
    setStatus('submitting')
    setErrMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), cardId, source: 'jp_pricing' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Erreur')
      }
      setStatus('success')
    } catch (e: any) {
      setErrMsg(e?.message || 'Une erreur est survenue')
      setStatus('error')
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.45)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      borderRadius: 16,
      padding: '22px 20px',
      border: 'none',
      boxShadow: '0 4px 24px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      textAlign: 'center' as const,
      gap: 10,
    }}>
      <div style={{ fontSize: 30 }}>🇯🇵</div>

      <div style={{ fontFamily: FONT.display, fontSize: 17, fontWeight: 500, letterSpacing: '-0.02em', color: SNOW.ink }}>
        Prix japonais bientôt disponibles
      </div>

      <p style={{ fontSize: 13, color: SNOW.muted, fontFamily: FONT.body, lineHeight: 1.45, margin: 0, maxWidth: 360 }}>
        On finalise la couverture du marché japonais (Cardmarket, eBay, gradation).
        Les prix FR et EN sont déjà suivis en temps réel.
      </p>

      {status === 'success' ? (
        <div style={{
          marginTop: 4, padding: '10px 16px', borderRadius: 10,
          background: SNOW.greenLight, color: SNOW.green,
          fontFamily: FONT.body, fontSize: 13, fontWeight: 500,
        }}>
          ✓ C'est noté ! On te préviendra dès que les prix JP arrivent.
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 340, marginTop: 4 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle') }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="ton@email.com"
              disabled={status === 'submitting'}
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${SNOW.border}`, background: '#fff',
                fontFamily: FONT.body, fontSize: 13, color: SNOW.ink,
                outline: 'none',
              }}
            />
            <button
              onClick={submit}
              disabled={!isValid || status === 'submitting'}
              style={{
                padding: '10px 18px', borderRadius: 10, border: 'none',
                background: isValid ? SNOW.ink : SNOW.border,
                color: '#fff', fontFamily: FONT.display, fontSize: 13, fontWeight: 600,
                cursor: isValid && status !== 'submitting' ? 'pointer' : 'default',
                whiteSpace: 'nowrap' as const, transition: 'opacity .15s',
                opacity: status === 'submitting' ? 0.6 : 1,
              }}
            >
              {status === 'submitting' ? '…' : 'Me notifier'}
            </button>
          </div>

          {status === 'error' ? (
            <div style={{ fontSize: 12, color: SNOW.red, fontFamily: FONT.body, marginTop: 6 }}>
              {errMsg}
            </div>
          ) : null}

          <div style={{ fontSize: 11, color: SNOW.mutedLight, fontFamily: FONT.body, marginTop: 8, lineHeight: 1.4 }}>
            Votre email sert uniquement à vous notifier du lancement des prix japonais.
          </div>
        </div>
      )}
    </div>
  )
}
