'use client'
import Link from 'next/link'
import { useState, useRef, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePlan } from '@/lib/usePlan'

/**
 * BetaBadge — le contrat visible (Lot 3).
 *
 * Rendu UNIQUEMENT quand planSource === 'beta' : le plan affiche est PRETE,
 * pas achete. Un abonne payant (stripe/referral) ne voit jamais ce badge.
 *
 * Clic -> /abonnement (le contrat complet). Survol -> tooltip CUSTOM :
 * le title natif est capricieux et n'existe pas au tactile. Tooltip via
 * createPortal(document.body) + position:fixed — le header a un contexte
 * d'empilement qui piegerait un overlay interne (lecon HubStreak).
 */
export function BetaBadge() {
  const { plan, planSource, betaUntil } = usePlan()
  const [hover, setHover] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const ref = useRef<HTMLAnchorElement | null>(null)

  useLayoutEffect(() => {
    if (!hover || !ref.current) { setPos(null); return }
    const r = ref.current.getBoundingClientRect()
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
  }, [hover])

  if (planSource !== 'beta' || !betaUntil) return null

  const end = Date.parse(betaUntil)
  const dateFr = Number.isFinite(end)
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(end))
    : null
  const tierLabel = plan === 'pro' ? 'Pro' : 'Premium'

  const tooltip = hover && pos ? createPortal(
    <div style={{
      position: 'fixed', top: pos.top, right: pos.right, zIndex: 2147483000,
      pointerEvents: 'none', maxWidth: 264, padding: '11px 13px', borderRadius: 12,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.97), rgba(255,255,255,0.9))',
      backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
      border: '0.5px solid rgba(0,0,0,0.07)',
      boxShadow: '0 12px 34px rgba(16,20,38,0.16), 0 3px 9px rgba(0,0,0,0.06)',
      fontFamily: "var(--font-sora, 'Sora', sans-serif)",
      animation: 'kbetaTipIn .22s cubic-bezier(.2,.85,.3,1) both',
    }}>
      <style>{`@keyframes kbetaTipIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: '#1D1D1F', marginBottom: 4 }}>
        Accès {tierLabel} offert — bêta
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.45, color: '#6E6E73', fontWeight: 500 }}>
        {dateFr ? 'Jusqu\u2019au ' + dateFr + '. ' : ''}Après, ton compte repasse en Gratuit sauf abonnement.
        Tes cartes et tes données restent.
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <>
      <Link
        ref={ref}
        href="/abonnement"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
          fontFamily: "var(--font-sora, 'Sora', sans-serif)",
          color: '#E03020', background: 'rgba(224,48,32,0.08)',
          border: '1px solid rgba(224,48,32,0.20)', borderRadius: 6,
          padding: '3px 8px', marginRight: 8, whiteSpace: 'nowrap',
          cursor: 'pointer', flexShrink: 0,
        }}
      >
        {plan === 'pro' ? 'PRO' : 'PREMIUM'}
        <span style={{ color: '#B04038', fontWeight: 600, letterSpacing: '0.02em' }}>
          {'\u00B7 b\u00EAta' + (dateFr ? ' \u2192 ' + new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(end)) : '')}
        </span>
      </Link>
      {tooltip}
    </>
  )
}
