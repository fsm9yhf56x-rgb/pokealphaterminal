'use client'
import Link from 'next/link'
import { usePlan } from '@/lib/usePlan'

/**
 * BetaBadge — le contrat visible (Lot 3).
 *
 * Rendu UNIQUEMENT quand planSource === 'beta' : le plan affiche est PRETE,
 * pas achete, et le testeur doit le savoir des le premier regard — sinon il
 * decouvre son vrai plan le jour du BETA_MODE=off (churn + sentiment
 * d'arnaque). Un abonne payant (source stripe/referral) ne voit jamais ce
 * badge, meme s'il figure sur beta_invites : c'est son abonnement qui parle.
 *
 * Monte dans TopNav avant NotificationBell. Zero appel reseau : usePlan lit
 * ce que /api/profile a deja resolu cote serveur.
 */
export function BetaBadge() {
  const { plan, planSource, betaUntil } = usePlan()
  if (planSource !== 'beta' || !betaUntil) return null

  const end = Date.parse(betaUntil)
  const dateFr = Number.isFinite(end)
    ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(end))
    : null

  // Lien (pas tooltip) : le title natif est capricieux et n'existe pas au
  // tactile — le contrat complet vit sur /abonnement, un tap y mene.
  return (
    <Link
      href="/abonnement"
      title={'Acces ' + (plan === 'pro' ? 'Pro' : 'Premium') + ' offert pendant la beta — details sur ta page abonnement'}
      style={{
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.05em',
        fontFamily: "var(--font-sora, 'Sora', sans-serif)",
        color: '#E03020',
        background: 'rgba(224,48,32,0.08)',
        border: '1px solid rgba(224,48,32,0.20)',
        borderRadius: 6,
        padding: '3px 8px',
        marginRight: 8,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      {plan === 'pro' ? 'PRO' : 'PREMIUM'}
      <span style={{ color: '#B04038', fontWeight: 600, letterSpacing: '0.02em' }}>
        {'\u00B7 b\u00EAta' + (dateFr ? ' \u2192 ' + dateFr : '')}
      </span>
    </Link>
  )
}
