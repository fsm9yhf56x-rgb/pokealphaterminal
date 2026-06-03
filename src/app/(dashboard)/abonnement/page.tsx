'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { SNOW, FONT, GLASS, RADIUS, SHADOW, EASE } from '@/lib/design/snow'

type PlanId = 'free' | 'pro' | 'premium'
type Period = 'hebdo' | 'mensuel' | 'annuel'

type PriceCell = { price: string; period: string; trial?: string; sub?: string }

const PRICES: Record<'pro' | 'premium', Record<Period, PriceCell>> = {
  pro: {
    hebdo: { price: '1,99 €', period: '/semaine', trial: '3 jours offerts' },
    mensuel: { price: '3,99 €', period: '/mois', trial: '3 jours offerts' },
    annuel: { price: '34,99 €', period: '/an', trial: '7 jours offerts', sub: 'soit 2,92 €/mois' },
  },
  premium: {
    hebdo: { price: '4,99 €', period: '/semaine', trial: '3 jours offerts' },
    mensuel: { price: '9,99 €', period: '/mois', trial: '3 jours offerts' },
    annuel: { price: '87,99 €', period: '/an', trial: '7 jours offerts', sub: 'soit 7,33 €/mois' },
  },
}

const FEATURES: Record<PlanId, string[]> = {
  free: [
    'Portefeuille + prix — jusqu’à 500 cartes',
    'Prix consolidés eBay · Cardmarket · PSA',
    'Encyclopédie & recherche',
    'Valeur totale de la collection',
    'Wishlist & alertes (3 max)',
  ],
  pro: [
    'Tout le plan Gratuit',
    'Cartes illimitées',
    'Graphique d’évolution du portefeuille',
    'Statistiques avancées & P&L',
    'Export du portefeuille',
    'Alertes illimitées',
  ],
  premium: [
    'Tout le plan Pro',
    'PSA Pop Reports',
    'Market Terminal & indices',
    'Alpha Signals (S / A / B)',
    'Whale Tracker',
    'Deal Hunter — eBay & Cardmarket',
    'Kodo AI illimité + support prioritaire',
  ],
}

export default function AbonnementPage() {
  const { user, profile, isPro } = useAuth() as any
  const currentPlan: PlanId = profile?.plan || (isPro ? 'pro' : 'free')

  const [period, setPeriod] = useState<Period>('mensuel')
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── STRIPE (étape B) : remplacer par checkout, en mappant period → price ID. ──
  async function handleCta(plan: PlanId) {
    if (plan === 'free' || plan === currentPlan) return
    const email = user?.email
    if (!email) { setMsg({ type: 'err', text: 'Connecte-toi pour rejoindre la liste.' }); return }
    setBusy(plan); setMsg(null)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: `abonnement_${plan}_${period}` }),
      })
      if (!res.ok) throw new Error()
      setMsg({ type: 'ok', text: 'Inscrit ✓ On te prévient dès l’ouverture des paiements.' })
    } catch {
      setMsg({ type: 'err', text: 'Échec. Réessaie dans un instant.' })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto', padding: '48px 20px 90px' }}>
      <p style={{
        fontFamily: FONT.data, fontSize: 12, fontWeight: 700, color: SNOW.red,
        letterSpacing: '0.12em', textAlign: 'center', margin: '0 0 12px',
      }}>
        TARIFS
      </p>
      <h1 style={{
        fontFamily: FONT.display, fontSize: 34, fontWeight: 700, color: SNOW.ink,
        letterSpacing: '-0.8px', textAlign: 'center', margin: '0 0 28px', lineHeight: 1.1,
      }}>
        Trois formules, une seule source de vérité.
      </h1>

      {/* Toggle période */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 36 }}>
        <div style={{
          display: 'inline-flex', gap: 2, padding: 4,
          background: SNOW.surface, borderRadius: RADIUS.pill,
          boxShadow: SHADOW.insetSubtle,
        }}>
          {([
            ['hebdo', 'Hebdo'],
            ['mensuel', 'Mensuel'],
            ['annuel', 'Annuel'],
          ] as [Period, string][]).map(([id, label]) => {
            const active = period === id
            return (
              <button
                key={id}
                onClick={() => setPeriod(id)}
                style={{
                  fontFamily: FONT.display, fontSize: 13, fontWeight: 600,
                  padding: '8px 16px', border: active ? `1px solid ${SNOW.borderHover}` : '1px solid transparent',
                  cursor: 'pointer', borderRadius: RADIUS.pill, whiteSpace: 'nowrap',
                  color: active ? SNOW.ink : SNOW.muted,
                  background: active ? SNOW.bg : 'transparent',
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  transition: `all .18s ${EASE.apple}`,
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                }}
              >
                {label}
                {id === 'annuel' && (
                  <span style={{
                    fontFamily: FONT.data, fontSize: 10, fontWeight: 700,
                    padding: '2px 6px', borderRadius: RADIUS.sm,
                    background: SNOW.greenLight, color: SNOW.green, letterSpacing: '0.04em',
                  }}>
                    -27 %
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {msg && (
        <p style={{
          fontFamily: FONT.body, fontSize: 14, textAlign: 'center', marginBottom: 24,
          color: msg.type === 'ok' ? SNOW.greenAccent : SNOW.red,
        }}>
          {msg.text}
        </p>
      )}

      {/* Cartes */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: 20, alignItems: 'stretch',
      }}>
        <PlanCard id="free" name="Gratuit" priceMain="0 €" priceSub="toujours"
          features={FEATURES.free} cta="Commencer gratuitement"
          currentPlan={currentPlan} busy={busy} onCta={handleCta} />

        <PlanCard id="premium" name="Premium" cell={PRICES.premium[period]}
          features={FEATURES.premium} cta="Passer Premium" recommended
          footnote="Market / Alpha / Whale en déploiement (v2.0 / v3.0)."
          currentPlan={currentPlan} busy={busy} onCta={handleCta} />

        <PlanCard id="pro" name="Pro" cell={PRICES.pro[period]}
          features={FEATURES.pro} cta="Essayer Pro"
          currentPlan={currentPlan} busy={busy} onCta={handleCta} />
      </div>

      <p style={{
        fontFamily: FONT.body, fontSize: 12, color: SNOW.mutedLight, textAlign: 'center', marginTop: 28,
      }}>
        Sans engagement · Annulation à tout moment · Paiement sécurisé à venir
      </p>
    </div>
  )
}

/* ---------- PlanCard ---------- */

function PlanCard({
  id, name, cell, priceMain, priceSub, features, cta, recommended, footnote,
  currentPlan, busy, onCta,
}: {
  id: PlanId
  name: string
  cell?: PriceCell
  priceMain?: string
  priceSub?: string
  features: string[]
  cta: string
  recommended?: boolean
  footnote?: string
  currentPlan: PlanId
  busy: PlanId | null
  onCta: (p: PlanId) => void
}) {
  const isCurrent = id === currentPlan
  const mainPrice = priceMain ?? cell?.price ?? ''
  const sub = priceSub ?? cell?.period ?? ''

  function label() {
    if (isCurrent) return 'Ton plan actuel'
    if (busy === id) return 'Inscription…'
    return cta
  }

  return (
    <div style={{
      ...GLASS.card,
      padding: 28,
      display: 'flex', flexDirection: 'column',
      position: 'relative',
      boxShadow: recommended
        ? `${SHADOW.lift}, inset 0 0 0 1.5px ${SNOW.red}`
        : SHADOW.card,
    }}>
      {recommended && (
        <span style={{
          position: 'absolute', top: -12, right: 24,
          fontFamily: FONT.display, fontSize: 11, fontWeight: 700,
          padding: '5px 12px', borderRadius: RADIUS.pill,
          background: SNOW.red, color: '#fff', letterSpacing: '0.02em',
          boxShadow: '0 4px 12px rgba(224,48,32,0.32)',
        }}>
          Recommandé
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: SNOW.ink, margin: 0 }}>
          {name}
        </h2>
        {cell?.trial && (
          <span style={{
            fontFamily: FONT.data, fontSize: 9, fontWeight: 700,
            padding: '3px 7px', borderRadius: RADIUS.sm,
            background: SNOW.greenLight, color: SNOW.green,
            letterSpacing: '0.04em', textTransform: 'uppercase',
          }}>
            {cell.trial}
          </span>
        )}
      </div>

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 700, color: SNOW.ink, letterSpacing: '-1px' }}>
          {mainPrice}
        </span>
        <span style={{ fontFamily: FONT.body, fontSize: 15, color: SNOW.mutedLight, marginLeft: 4 }}>
          {sub}
        </span>
      </div>
      <div style={{ height: 18, marginBottom: 14 }}>
        {cell?.sub && (
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted }}>{cell.sub}</span>
        )}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
        {features.map((feat, i) => (
          <li key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            fontFamily: FONT.body, fontSize: 14, lineHeight: 1.45, color: SNOW.inkSoft,
            marginBottom: 11,
          }}>
            <span style={{ color: SNOW.greenAccent, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
            {feat}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onCta(id)}
        disabled={isCurrent || id === 'free' || busy === id}
        style={{
          fontFamily: FONT.display, fontSize: 14, fontWeight: 600,
          padding: '13px 18px', borderRadius: RADIUS.md, width: '100%',
          cursor: (isCurrent || id === 'free') ? 'default' : 'pointer',
          border: recommended ? 'none' : `1px solid ${SNOW.borderHover}`,
          background: isCurrent ? SNOW.surface : recommended ? SNOW.red : 'rgba(255,255,255,0.7)',
          color: isCurrent ? SNOW.mutedLight : recommended ? '#fff' : SNOW.ink,
          boxShadow: recommended && !isCurrent ? '0 4px 14px rgba(224,48,32,0.28)' : 'none',
          opacity: (id === 'free' && !isCurrent) ? 0.6 : 1,
          transition: `transform .15s ${EASE.apple}`,
        }}
        onMouseEnter={e => { if (!isCurrent && id !== 'free') e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
      >
        {label()}
      </button>

      {footnote && (
        <p style={{ fontFamily: FONT.body, fontSize: 12, color: SNOW.mutedLight, textAlign: 'center', margin: '12px 0 0' }}>
          {footnote}
        </p>
      )}
    </div>
  )
}
