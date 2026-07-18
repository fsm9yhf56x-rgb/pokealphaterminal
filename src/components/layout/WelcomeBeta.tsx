'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePlan } from '@/lib/usePlan'
import { useAuth } from '@/lib/useAuth'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * WelcomeBeta v2 — le mot d'accueil du Free pendant la beta.
 *
 * REGLE PRODUIT (17/07) : pas de disclaimer permanent pour les Free. L'info
 * "tout est gratuit maintenant, payant ensuite" se dit UNE FOIS, puis vit
 * sur /abonnement.
 *
 * NE S'AFFICHE QUE SI : connecte + betaMode + paidPlan free + PAS un invite
 * beta (lui a badge + bandeau). Persistance par user, flag consomme SEULEMENT
 * a l'affichage reel.
 *
 * SEQUENCEMENT (bug vu en prod 18/07) : a la 1re connexion, l'onboarding
 * persona ("Comment veux-tu vivre Kodo ?") est deja ouvert -> deux modales
 * empilees. Le mot ATTEND que tout autre [role="dialog"] soit ferme (poll 1s)
 * avant de se montrer. Deux messages, un a la fois.
 */
export function WelcomeBeta() {
  const { user, profile } = useAuth() as any
  const { loading } = usePlan()
  const [open, setOpen] = useState(false)

  const betaOn: boolean = !!profile?.betaMode
  const paidPlan: string = profile?.paidPlan ?? 'free'
  const isBetaGuest: boolean = profile?.planSource === 'beta'
  const endFr: string | null = (() => {
    const t = Date.parse(profile?.betaEndsAt ?? '')
    return Number.isFinite(t)
      ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(new Date(t))
      : null
  })()

  useEffect(() => {
    if (loading || !user?.id || !betaOn || isBetaGuest || paidPlan !== 'free') return
    const key = 'kodo_welcome_beta_v1:' + user.id
    try { if (localStorage.getItem(key)) return } catch { return }

    let cancelled = false
    const tryShow = () => {
      if (cancelled) return
      // Un autre dialogue est ouvert (onboarding persona...) -> on repasse.
      if (document.querySelector('[role="dialog"]')) { setTimeout(tryShow, 1000); return }
      try { localStorage.setItem(key, new Date().toISOString()) } catch {}
      setOpen(true)
    }
    const t = setTimeout(tryShow, 600) // laisse la page se poser
    return () => { cancelled = true; clearTimeout(t) }
  }, [loading, user?.id, betaOn, isBetaGuest, paidPlan])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      onClick={() => setOpen(false)}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(18,18,26,0.38)',
        backdropFilter: 'blur(5px) saturate(120%)', WebkitBackdropFilter: 'blur(5px) saturate(120%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18,
        animation: 'kwbFade .3s ease both',
      }}
    >
      <style>{`
        @keyframes kwbFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes kwbPop { 0% { opacity: 0; transform: translateY(18px) scale(.94); } 70% { opacity: 1; transform: translateY(-3px) scale(1.008); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes kwbRise { from { opacity: 0; transform: translateY(9px); filter: blur(4px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
        .kwb-r { animation: kwbRise .5s cubic-bezier(.2,.85,.3,1) both; }
        @keyframes kwbShine { from { transform: translateX(-130%) skewX(-18deg); } to { transform: translateX(240%) skewX(-18deg); } }
        @keyframes kwbHalo { 0%, 100% { opacity: .55; } 50% { opacity: .85; } }
        .kwb-cta { transition: transform .18s cubic-bezier(.2,.85,.3,1), box-shadow .18s ease; }
        .kwb-cta:hover { transform: translateY(-1px); box-shadow: 0 10px 26px rgba(224,48,32,0.38) !important; }
        .kwb-cta:active { transform: translateY(0) scale(.985); }
        .kwb-link { transition: color .18s ease; }
        .kwb-link:hover { color: #1D1D1F !important; }
        @media (prefers-reduced-motion: reduce) {
          .kwb-card, .kwb-shine, .kwb-r { animation: none !important; }
        }
      `}</style>
      <div
        className="kwb-card"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Bienvenue sur Kodo Cards"
        style={{
          position: 'relative', maxWidth: 460, width: '100%',
          padding: '38px 32px 26px', borderRadius: 24, overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,255,255,0.93))',
          backdropFilter: 'blur(34px) saturate(190%)', WebkitBackdropFilter: 'blur(34px) saturate(190%)',
          border: '0.5px solid rgba(255,255,255,0.95)',
          boxShadow: '0 30px 90px rgba(16,20,38,0.26), 0 6px 18px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)',
          fontFamily: "var(--font-sora, 'Sora', sans-serif)",
          animation: 'kwbPop .4s cubic-bezier(.2,.85,.3,1) both',
          textAlign: 'center' as const,
        }}
      >
        {/* Halos Snow+ — chaleur discrete, zero dore */}
        <div aria-hidden style={{
          position: 'absolute', top: -90, left: '50%', transform: 'translateX(-50%)',
          width: 340, height: 220, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(closest-side, rgba(224,48,32,0.10), transparent 70%)',
          animation: 'kwbHalo 5s ease-in-out infinite',
        }} />
        <div aria-hidden style={{
          position: 'absolute', bottom: -110, right: -70,
          width: 280, height: 240, borderRadius: '50%', pointerEvents: 'none',
          background: 'radial-gradient(closest-side, rgba(110,86,207,0.07), transparent 70%)',
        }} />

        {/* Wordmark KodoCards — le vrai logo */}
        <div className="kwb-r" style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, position: 'relative', animationDelay: '.12s' }}>
          <BrandMark size={30} inline signature mark={false} />
        </div>

        <div className="kwb-r" style={{
          animationDelay: '.2s',
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const,
          color: '#E03020', background: 'rgba(224,48,32,0.07)',
          border: '1px solid rgba(224,48,32,0.16)', borderRadius: 999,
          padding: '5px 12px', marginBottom: 16,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%', background: '#E03020',
            boxShadow: '0 0 7px rgba(224,48,32,0.7)',
          }} />
          Bêta ouverte
        </div>

        <div className="kwb-r" style={{
          animationDelay: '.28s',
          fontSize: 21.5, fontWeight: 700, color: '#1D1D1F',
          letterSpacing: '-0.025em', lineHeight: 1.28, marginBottom: 10,
        }}>
          Combien vaut vraiment<br />ta collection&nbsp;?
        </div>

        <div className="kwb-r" style={{ animationDelay: '.36s', fontSize: 13.5, lineHeight: 1.65, color: '#6E6E73', fontWeight: 500, marginBottom: 4, maxWidth: 356, marginInline: 'auto' }}>
          Kodo est en bêta et <strong style={{ color: '#1D1D1F', fontWeight: 700 }}>l\u2019essentiel est gratuit</strong> —
          explore le catalogue, ajoute tes cartes, suis leur cote au jour le jour.
        </div>
        <div className="kwb-r" style={{ animationDelay: '.44s', fontSize: 12.5, lineHeight: 1.6, color: '#86868B', fontWeight: 500, marginBottom: 24, maxWidth: 356, marginInline: 'auto' }}>
          Les fonctionnalités avancées ouvriront avec les abonnements, à la fin de la bêta{endFr ? ' (' + endFr + ')' : ''}.
          <strong style={{ color: '#3A3A3E', fontWeight: 600 }}> Ta collection et tes données restent à toi</strong>, quoi qu\u2019il arrive.
        </div>

        <button
          className="kwb-cta kwb-r"
          onClick={() => setOpen(false)}
          style={{
            animationDelay: '.52s',
            position: 'relative', overflow: 'hidden',
            width: '100%', padding: '13px 16px', borderRadius: 13, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(180deg, #E8402F, #DC2A1A)', color: '#FFF',
            fontSize: 14.5, fontWeight: 700, fontFamily: 'inherit', letterSpacing: '-0.01em',
            boxShadow: '0 8px 22px rgba(224,48,32,0.30), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}
        >
          <span aria-hidden className="kwb-shine" style={{
            position: 'absolute', top: 0, bottom: 0, width: '34%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)',
            animation: 'kwbShine 2.6s ease-in-out .8s 2',
          }} />
          Découvrir la valeur de mes cartes
        </button>

        <Link
          href="/abonnement"
          onClick={() => setOpen(false)}
          className="kwb-link kwb-r"
          style={{
            animationDelay: '.6s',
            display: 'inline-block', marginTop: 14, fontSize: 11.5, fontWeight: 600,
            color: '#86868B', textDecoration: 'none',
          }}
        >
          Voir ce qui deviendra payant →
        </Link>
      </div>
    </div>,
    document.body,
  )
}
