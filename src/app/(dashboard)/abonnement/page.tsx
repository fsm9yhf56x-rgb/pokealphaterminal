'use client'
import { track } from '@/components/layout/Analytics'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { SNOW, FONT, GLASS, RADIUS, SHADOW, EASE } from '@/lib/design/snow'
import { SoonBadge } from '@/components/ui/snow/SoonBadge'

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
    'Portefeuille + prix — jusqu’à 800 cartes',
    'Prix consolidés eBay · Cardmarket · PSA',
    'Encyclopédie & recherche',
    'Valeur totale de la collection',
    'Wishlist & alertes (3 max)',
  ],
  pro: [
    'Tout le plan Gratuit',
    'Cartes illimitées',
    'Cartes gradées valorisées dans ton portefeuille',
    'PSA Pop Reports',
    'Graphique d’évolution du portefeuille',
    'Statistiques avancées & P&L',
    'Export du portefeuille',
    'Alertes illimitées',
  ],
  premium: [
    'Tout le plan Pro',
    'Prix gradés détaillés — toutes cartes, toutes notes (PSA, CGC…)',
  ],
}

// Features Premium a venir — incluses pour les abonnes a leur sortie, sans surcout
const PREMIUM_SOON: { label: string; v: 'v2.0' | 'v3.0' }[] = [
  { label: 'Market Terminal & indices', v: 'v2.0' },
  { label: 'Alpha Signals (S / A / B)', v: 'v2.0' },
  { label: 'Deal Hunter — eBay & Cardmarket', v: 'v2.0' },
  { label: 'Nori, ton experte cartes — en illimité + support prioritaire', v: 'v2.0' },
  { label: 'Whale Tracker', v: 'v3.0' },
]

export default function AbonnementPage() {
  const { user, profile, isPro } = useAuth() as any
  const currentPlan: PlanId = profile?.plan || (isPro ? 'pro' : 'free')

  const [period, setPeriod] = useState<Period>('mensuel')
  const [acceptCgv, setAcceptCgv] = useState(false)
  const [acceptExec, setAcceptExec] = useState(false)
  const [consentError, setConsentError] = useState(false)
  const [busy, setBusy] = useState<PlanId | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Offre Early Supporter (-40% à vie sur Premium, places limitées)
  const [early, setEarly] = useState<{ seatsLeft: number; seatsTotal: number; isOpen: boolean } | null>(null)
  useEffect(() => {
    fetch('/api/early-spots').then(r => r.json()).then(setEarly).catch(() => setEarly(null))
  }, [])
  // Early actif seulement sur cycle mensuel/annuel, offre ouverte, user pas déjà abonné
  const earlyActive = !!early?.isOpen && period !== 'hebdo' && currentPlan === 'free'

  // Mapping période UI → cycle Stripe
  const periodToCycle: Record<Period, 'weekly' | 'monthly' | 'yearly'> = {
    hebdo: 'weekly', mensuel: 'monthly', annuel: 'yearly',
  }

  // Ouvre le Customer Portal Stripe (gérer/annuler l'abo)
  async function openPortal() {
    setBusy(currentPlan); setMsg(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      throw new Error(data.error)
    } catch {
      setMsg({ type: 'err', text: 'Impossible d’ouvrir la gestion de l’abonnement.' })
      setBusy(null)
    }
  }

  async function handleCta(plan: PlanId) {
    // Gratuit : rien à payer
    if (plan === 'free') { window.location.href = '/'; return }
    // Déjà abonné (à ce plan OU à un autre) : le portail Stripe gère tout
    // (changement de forfait avec proration, changement de cycle, annulation).
    // Stripe interdit un 2e abonnement via checkout -> on passe par le portail.
    if (currentPlan !== 'free') { openPortal(); return }
    // User gratuit qui souscrit un plan payant : checkout Stripe
    if (!user?.id) { setMsg({ type: 'err', text: 'Connecte-toi pour t’abonner.' }); return }
    if (!acceptCgv || !acceptExec) {
      setConsentError(true)
      setMsg({ type: 'err', text: 'Veuillez cocher les deux cases obligatoires avant de continuer.' })
      if (typeof document !== 'undefined') document.getElementById('checkout-consent')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    track('checkout_started', { plan, cycle: periodToCycle[period] })
    setBusy(plan); setMsg(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, cycle: periodToCycle[period], early: earlyActive && plan === 'premium' }),
      })
      const data = await res.json()
      if (data.url) { window.location.href = data.url; return }
      throw new Error(data.error || 'Erreur checkout')
    } catch (e: any) {
      setMsg({ type: 'err', text: e?.message || 'Échec. Réessaie dans un instant.' })
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
          features={FEATURES.premium} featuresSoon={PREMIUM_SOON} cta="Passer Premium" recommended
          earlyActive={earlyActive} earlySeatsLeft={early?.seatsLeft} earlyPeriod={period}
          currentPlan={currentPlan} busy={busy} onCta={handleCta} />

        <PlanCard id="pro" name="Pro" cell={PRICES.pro[period]}
          features={FEATURES.pro} cta="Essayer Pro"
          currentPlan={currentPlan} busy={busy} onCta={handleCta} />
      </div>

      {currentPlan === 'free' && (
        <div id="checkout-consent" style={{
          maxWidth: 720, margin: '28px auto 0', padding: '18px 20px', borderRadius: 14,
          background: '#F5F5F7',
          border: consentError ? '1px solid #E03020' : '1px solid #E5E5EA',
          boxShadow: consentError ? '0 0 0 3px rgba(224,48,32,0.08)' : 'none',
          transition: 'border-color .2s, box-shadow .2s',
        }}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, color: '#3A3A3C', marginBottom: 13 }}>
            <input type="checkbox" checked={acceptCgv} onChange={e => { setAcceptCgv(e.target.checked); setConsentError(false) }} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#E03020', cursor: 'pointer' }} />
            <span>J’accepte les <a href="/legal/cgv" target="_blank" rel="noopener noreferrer" style={{ color: '#E03020', textDecoration: 'underline' }}>Conditions générales de vente</a> de KodoCards.</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontFamily: FONT.body, fontSize: 13, lineHeight: 1.5, color: '#3A3A3C' }}>
            <input type="checkbox" checked={acceptExec} onChange={e => { setAcceptExec(e.target.checked); setConsentError(false) }} style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, accentColor: '#E03020', cursor: 'pointer' }} />
            <span>Je demande expressément l’exécution immédiate du service avant la fin du délai légal de rétractation et je reconnais que cette exécution immédiate peut entraîner la perte de mon droit de rétractation pour les contenus ou services numériques accessibles immédiatement, dans les conditions prévues par la réglementation applicable.</span>
          </label>
        </div>
      )}
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
  id, name, cell, priceMain, priceSub, features, featuresSoon, cta, recommended, footnote,
  earlyActive, earlySeatsLeft, earlyPeriod,
  currentPlan, busy, onCta,
}: {
  id: PlanId
  name: string
  cell?: PriceCell
  priceMain?: string
  priceSub?: string
  features: string[]
  featuresSoon?: { label: string; v: 'v2.0' | 'v3.0' }[]
  cta: string
  recommended?: boolean
  footnote?: string
  earlyActive?: boolean
  earlySeatsLeft?: number
  earlyPeriod?: Period
  currentPlan: PlanId
  busy: PlanId | null
  onCta: (p: PlanId) => void
}) {
  const isCurrent = id === currentPlan
  const mainPrice = priceMain ?? cell?.price ?? ''
  const sub = priceSub ?? cell?.period ?? ''

  // Prix Early Supporter (-40% à vie) : Premium, mensuel/annuel uniquement
  const EARLY_PRICES: Record<string, { price: string; sub: string }> = {
    mensuel: { price: '5,99 €', sub: 'au lieu de 9,99 € · tarif à vie' },
    annuel: { price: '52,99 €', sub: 'soit 4,42 €/mois · tarif à vie' },
  }
  const showEarly = !!earlyActive && id === 'premium' && earlyPeriod && earlyPeriod !== 'hebdo'
  const earlyCell = showEarly && earlyPeriod ? EARLY_PRICES[earlyPeriod] : null

  function label() {
    if (busy === id) return 'Redirection…'
    if (isCurrent) return 'Ton plan actuel'
    // Déjà abonné à un autre forfait : le bouton mène au portail Stripe
    if (currentPlan !== 'free' && id !== 'free') return 'Gérer l’abonnement'
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
      {(recommended || showEarly) && (
        <span style={{
          position: 'absolute', top: -12, right: 24,
          fontFamily: FONT.display, fontSize: 11, fontWeight: 700,
          padding: '5px 12px', borderRadius: RADIUS.pill,
          background: showEarly ? '#1D1D1F' : SNOW.red, color: '#fff', letterSpacing: '0.02em',
          boxShadow: showEarly ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(224,48,32,0.32)',
        }}>
          {showEarly ? '★ Early Supporter' : 'Recommandé'}
        </span>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h2 style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: SNOW.ink, margin: 0 }}>
          {name}
        </h2>
        {cell?.trial && !showEarly && (
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
        {earlyCell ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 700, color: SNOW.ink, letterSpacing: '-1px' }}>
              {earlyCell.price}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 15, color: SNOW.mutedLight }}>
              {sub}
            </span>
            <span style={{ fontFamily: FONT.display, fontSize: 16, fontWeight: 600, color: SNOW.mutedLight, textDecoration: 'line-through' }}>
              {mainPrice}
            </span>
            <span style={{
              fontFamily: FONT.data, fontSize: 14, fontWeight: 800,
              padding: '4px 11px', borderRadius: RADIUS.pill,
              background: SNOW.red, color: '#fff', letterSpacing: '0.02em',
              boxShadow: '0 2px 8px rgba(224,48,32,0.3)',
            }}>
              −40 %
            </span>
          </div>
        ) : (
          <>
            <span style={{ fontFamily: FONT.display, fontSize: 34, fontWeight: 700, color: SNOW.ink, letterSpacing: '-1px' }}>
              {mainPrice}
            </span>
            <span style={{ fontFamily: FONT.body, fontSize: 15, color: SNOW.mutedLight, marginLeft: 4 }}>
              {sub}
            </span>
          </>
        )}
      </div>
      <div style={{ height: 18, marginBottom: 14 }}>
        {earlyCell ? (
          <span style={{ fontFamily: FONT.data, fontSize: 12, fontWeight: 700, color: '#1D1D1F' }}>
            {earlyCell.sub}
          </span>
        ) : cell?.sub ? (
          <span style={{ fontFamily: FONT.body, fontSize: 13, color: SNOW.muted }}>{cell.sub}</span>
        ) : null}
      </div>

      {showEarly && (
        <div style={{
          marginBottom: 16, padding: '10px 12px', borderRadius: RADIUS.md,
          background: 'rgba(0,0,0,0.035)', border: '1px solid rgba(0,0,0,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontFamily: FONT.display, fontSize: 12, fontWeight: 700, color: SNOW.ink }}>
              Offre de lancement
            </span>
            {typeof earlySeatsLeft === 'number' && (
              <span style={{ fontFamily: FONT.data, fontSize: 11, fontWeight: 700, color: SNOW.red }}>
                {earlySeatsLeft} place{earlySeatsLeft > 1 ? 's' : ''} restante{earlySeatsLeft > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p style={{ fontFamily: FONT.body, fontSize: 11.5, color: SNOW.muted, margin: 0, lineHeight: 1.4 }}>
            Bloque ce tarif <strong style={{ color: SNOW.ink }}>à vie</strong> avant la sortie des fonctionnalités v2. Conservé tant que ton abonnement reste actif.
          </p>
        </div>
      )}

      <div style={{ flex: 1, marginBottom: 24 }}>
        {featuresSoon && featuresSoon.length > 0 && (
          <div style={{
            fontSize: 10, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display,
            letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 10,
          }}>Disponible maintenant</div>
        )}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
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
        {featuresSoon && featuresSoon.length > 0 && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: SNOW.muted, fontFamily: FONT.display,
              letterSpacing: '0.14em', textTransform: 'uppercase' as const, margin: '14px 0 10px',
            }}>Inclus à leur sortie</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {featuresSoon.map((f, i) => (
                <li key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: FONT.body, fontSize: 14, lineHeight: 1.45, color: SNOW.muted,
                  marginBottom: 11,
                }}>
                  <span style={{ color: SNOW.muted, fontWeight: 700, flexShrink: 0 }}>◌</span>
                  <span style={{ flex: 1 }}>{f.label}</span>
                  <SoonBadge version={f.v} variant="inline" />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

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
