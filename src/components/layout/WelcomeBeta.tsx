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
    let waited = 0
    // Un dialogue n'est bloquant que s'il est REELLEMENT VISIBLE : des modales
    // montees-mais-cachees (display:none, 0x0) trainent en permanence dans le
    // DOM -> sans ce filtre, on attendait un fantome pour toujours (vu 18/07).
    const dialogVisible = () => {
      for (const el of Array.from(document.querySelectorAll('[role="dialog"]'))) {
        const r = (el as HTMLElement).getBoundingClientRect()
        const cs = getComputedStyle(el as HTMLElement)
        if (r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || '1') > 0.05) return true
      }
      return false
    }
    const tryShow = () => {
      if (cancelled) return
      // Garde-fou : au bout de 30 s d'attente, on affiche quand meme
      // (mieux vaut un empilement rare qu'un message jamais vu).
      if (dialogVisible() && waited < 30000) { waited += 1000; setTimeout(tryShow, 1000); return }
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
        .kwb-cta .kwb-arrow { display: inline-block; transition: transform .2s cubic-bezier(.2,.85,.3,1); margin-left: 6px; }
        .kwb-cta:hover .kwb-arrow { transform: translateX(4px); }
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
          Bêta ouverte{endFr ? ' · jusqu’au ' + endFr : ''}
        </div>

        <div className="kwb-r" style={{
          animationDelay: '.28s',
          fontSize: 23, fontWeight: 700, color: '#1D1D1F',
          letterSpacing: '-0.028em', lineHeight: 1.24, marginBottom: 11,
        }}>
          Combien vaut vraiment<br />ta collection&nbsp;?
        </div>

        <div className="kwb-r" style={{ animationDelay: '.36s', fontSize: 13.5, lineHeight: 1.65, color: '#6E6E73', fontWeight: 500, marginBottom: 14, maxWidth: 368, marginInline: 'auto' }}>
          Kodo est en bêta et <strong style={{ color: '#1D1D1F', fontWeight: 700 }}>l’essentiel est gratuit</strong> —
          explore le catalogue, ajoute tes cartes, suis leur cote au jour le jour.
        </div>

        <div className="kwb-r" style={{ animationDelay: '.44s', fontSize: 12, lineHeight: 1.6, color: '#86868B', fontWeight: 500, marginBottom: 22, maxWidth: 360, marginInline: 'auto' }}>
          Après la bêta, les analyses avancées passeront en abonnement.
          <strong style={{ color: '#3A3A3E', fontWeight: 600 }}> Tes cartes et tes données restent à toi.</strong>
        </div>

        <button
          className="kwb-cta kwb-r"
          onClick={() => setOpen(false)}
          style={{
            animationDelay: '.56s',
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
          Découvrir la valeur de mes cartes<span className="kwb-arrow" aria-hidden>→</span>
        </button>

        <Link
          href="/abonnement"
          onClick={() => setOpen(false)}
          className="kwb-link kwb-r"
          style={{
            animationDelay: '.64s',
            display: 'inline-block', marginTop: 14, fontSize: 11.5, fontWeight: 600,
            color: '#86868B', textDecoration: 'none',
          }}
        >
          Voir ce qui deviendra payant →
        </Link>

        {/* Communaute — l'acces beta ferme se MERITE par la participation
            (pas une loterie) : c'est Alon qui invite via beta.mjs, la
            promesse est tenue par une commande. */}
        <div className="kwb-r" style={{
          animationDelay: '.72s',
          marginTop: 16, paddingTop: 15,
          borderTop: '0.5px solid rgba(0,0,0,0.07)',
        }}>
          <a
            href="https://discord.com/invite/y5p3CqXP4"
            target="_blank"
            rel="noopener noreferrer"
            className="kwb-link"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 11.5, fontWeight: 600, color: '#6E6E73',
              textDecoration: 'none', lineHeight: 1.5, textAlign: 'left' as const,
            }}
          >
            <span aria-hidden style={{
              flexShrink: 0, width: 26, height: 26, borderRadius: 8,
              background: 'rgba(88,101,242,0.10)', border: '1px solid rgba(88,101,242,0.22)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0c-.16-.4-.4-.87-.61-1.25a.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13 13 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0c.12.1.25.2.38.3a.08.08 0 0 1-.01.12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42Z"/>
              </svg>
            </span>
            <span>
              Rejoins le Discord — <strong style={{ color: '#3A3A3E', fontWeight: 700 }}>les membres actifs reçoivent des accès à la bêta fermée</strong>
            </span>
          </a>
        </div>
      </div>
    </div>,
    document.body,
  )
}
