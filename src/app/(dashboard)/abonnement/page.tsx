'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'

const C = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  faint: '#86868B',
  accent: '#E03020',
  green: '#2E9E6A',
}
const fSora = 'var(--font-sora, Sora, system-ui, sans-serif)'
const fDM = 'var(--font-dm, "DM Sans", system-ui, sans-serif)'

type PlanId = 'free' | 'pro' | 'premium'

type Plan = {
  id: PlanId
  name: string
  price: string
  period: string
  tagline: string
  features: string[]
  highlight?: boolean
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Gratuit',
    price: '0 €',
    period: '/mois',
    tagline: 'Pour découvrir le marché.',
    features: [
      'Base de données cartes & prix',
      'Suivi de portefeuille',
      'Tableau de bord marché basique',
      '1 signal Alpha / jour',
      'Liste de souhaits (3 max)',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9,99 €',
    period: '/mois',
    tagline: "L'arsenal de l'investisseur.",
    highlight: true,
    features: [
      'Tout le plan Gratuit',
      'Signaux Alpha illimités (S / A / B)',
      'Deal Hunter — scan eBay & Cardmarket',
      'Whale Tracker complet',
      'Dexy AI — requêtes illimitées',
      'Alertes de prix illimitées',
      'Export du portefeuille',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'Bientôt',
    period: '',
    tagline: 'Gestion de patrimoine TCG.',
    features: [
      'Tout le plan Pro',
      'Rapports de performance mensuels',
      'Whale Signals prioritaires',
      'Indices de marché avancés',
      'Accès anticipé aux nouveaux outils',
      'Support prioritaire',
    ],
  },
]

export default function AbonnementPage() {
  const { user, profile, isPro } = useAuth() as any
  const currentPlan: PlanId = profile?.plan || (isPro ? 'pro' : 'free')

  const [busy, setBusy] = useState<PlanId | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── STRIPE (étape B) : remplacer le corps par l'appel checkout. ──
  // Pour l'instant : inscription waitlist via /api/waitlist.
  async function handleCta(plan: PlanId) {
    if (plan === 'free' || plan === currentPlan) return
    const email = user?.email
    if (!email) {
      setMsg({ type: 'err', text: 'Connecte-toi pour rejoindre la liste.' })
      return
    }
    setBusy(plan); setMsg(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: `abonnement_${plan}` }),
      })
      if (!res.ok) throw new Error()
      setMsg({ type: 'ok', text: 'Inscrit ✓ On te prévient dès l’ouverture.' })
    } catch {
      setMsg({ type: 'err', text: 'Échec. Réessaie dans un instant.' })
    } finally {
      setBusy(null)
    }
  }

  function ctaLabel(plan: Plan): string {
    if (plan.id === currentPlan) return 'Ton plan actuel'
    if (plan.id === 'free') return 'Inclus'
    if (busy === plan.id) return 'Inscription…'
    return `Rejoindre la liste ${plan.name}`
  }

  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 80px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{
          fontFamily: fSora, fontSize: 34, fontWeight: 700, color: C.ink,
          letterSpacing: '-0.8px', margin: '0 0 10px',
        }}>
          Passe au niveau supérieur
        </h1>
        <p style={{ fontFamily: fDM, fontSize: 16, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          Le Bloomberg du TCG. Les forfaits payants arrivent — rejoins la liste
          pour un accès anticipé.
        </p>
      </div>

      {msg && (
        <p style={{
          fontFamily: fDM, fontSize: 14, textAlign: 'center', marginBottom: 24,
          color: msg.type === 'ok' ? C.green : C.accent,
        }}>
          {msg.text}
        </p>
      )}

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20, alignItems: 'stretch',
      }}>
        {PLANS.map(plan => {
          const isCurrent = plan.id === currentPlan
          const soon = plan.price === 'Bientôt'
          return (
            <div
              key={plan.id}
              style={{
                position: 'relative',
                background: plan.highlight ? C.ink : C.bg,
                border: plan.highlight ? 'none' : `1px solid ${C.border}`,
                borderRadius: 18,
                padding: 28,
                display: 'flex', flexDirection: 'column',
                boxShadow: plan.highlight
                  ? '0 16px 40px rgba(0,0,0,0.18)'
                  : '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {plan.highlight && (
                <span style={{
                  position: 'absolute', top: 18, right: 18,
                  fontFamily: fSora, fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.08em', padding: '4px 9px', borderRadius: 6,
                  background: 'linear-gradient(135deg,#C9A84C,#FFE08A)', color: '#5C4200',
                }}>
                  POPULAIRE
                </span>
              )}

              <h2 style={{
                fontFamily: fSora, fontSize: 20, fontWeight: 700,
                color: plan.highlight ? '#fff' : C.ink, margin: '0 0 4px',
              }}>
                {plan.name}
              </h2>
              <p style={{
                fontFamily: fDM, fontSize: 13,
                color: plan.highlight ? 'rgba(255,255,255,0.7)' : C.muted,
                margin: '0 0 18px',
              }}>
                {plan.tagline}
              </p>

              <div style={{ marginBottom: 22 }}>
                <span style={{
                  fontFamily: fSora, fontSize: 32, fontWeight: 700,
                  color: plan.highlight ? '#fff' : C.ink, letterSpacing: '-1px',
                }}>
                  {plan.price}
                </span>
                <span style={{
                  fontFamily: fDM, fontSize: 14,
                  color: plan.highlight ? 'rgba(255,255,255,0.6)' : C.faint,
                }}>
                  {plan.period}
                </span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
                {plan.features.map((feat, i) => (
                  <li key={i} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 9,
                    fontFamily: fDM, fontSize: 14, lineHeight: 1.45,
                    color: plan.highlight ? 'rgba(255,255,255,0.88)' : C.ink,
                    marginBottom: 10,
                  }}>
                    <span style={{
                      color: plan.highlight ? '#FFE08A' : C.green,
                      fontWeight: 700, flexShrink: 0, marginTop: 1,
                    }}>
                      ✓
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleCta(plan.id)}
                disabled={isCurrent || plan.id === 'free' || busy === plan.id}
                style={{
                  fontFamily: fSora, fontSize: 14, fontWeight: 600,
                  padding: '13px 18px', borderRadius: 11, width: '100%',
                  cursor: (isCurrent || plan.id === 'free') ? 'default' : 'pointer',
                  border: plan.highlight ? 'none' : `1px solid ${C.borderStrong}`,
                  background: isCurrent
                    ? C.surface
                    : plan.highlight ? '#fff' : C.bg,
                  color: isCurrent
                    ? C.faint
                    : plan.highlight ? C.ink : C.ink,
                  opacity: (plan.id === 'free' && !isCurrent) ? 0.55 : 1,
                }}
              >
                {ctaLabel(plan)}
                {soon && !isCurrent ? '' : ''}
              </button>
            </div>
          )
        })}
      </div>

      <p style={{
        fontFamily: fDM, fontSize: 12, color: C.faint, textAlign: 'center',
        marginTop: 28,
      }}>
        Sans engagement · Annulation à tout moment · Paiement sécurisé à venir
      </p>
    </div>
  )
}
