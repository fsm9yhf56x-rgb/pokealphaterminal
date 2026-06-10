'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { SnowButton } from '@/components/ui/snow'
import { PlanBadge } from '@/components/ui/PlanBadge'
import { usePersona } from '@/lib/usePersona'
import { useIsMobile } from '@/lib/useIsMobile'
import { PersonaOnboarding } from '@/components/onboarding/PersonaOnboarding'

export default function UserMenu() {
  const { user, profile, loading, signOut, isPro, updateProfile } = useAuth()
  const plan: 'free' | 'pro' | 'premium' = (profile?.plan as any) || (isPro ? 'pro' : 'free')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isAdmin = useIsAdmin()
  const { persona } = usePersona()
  const isMobile = useIsMobile()
  const [switching, setSwitching] = useState<null | 'collector' | 'investor'>(null)
  async function toggleMode() {
    const next = persona === 'investor' ? 'collector' : 'investor'
    setSwitching(next)               // fait glisser le curseur visuellement
    try {
      await updateProfile({ persona: next, persona_onboarded: true } as never)
      window.location.href = '/home' // reload + Daily Hub du nouveau mode
    } catch {
      setSwitching(null)
    }
  }
  const [modeOpen, setModeOpen] = useState(false)
  const modeAccent = persona === 'investor' ? '#185FA5' : '#E03020'

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (loading) return <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0F0F0' }} />

  // ── Not logged in: SnowButton glass + primary v7 ─────────────────
  if (!user) return (
    <>
      <style>{`
        /* Desktop : 2 boutons separes. Mobile : une seule pill glass
           "Connexion" (le logo reste centre, cote droit minimal).
           L'inscription reste accessible depuis la page /login. */
        .kum-auth-desktop { display: flex; align-items: center; gap: 8px; }
        .kum-auth-mobile { display: none; }
        @media (max-width: 1023px) {
          .kum-auth-desktop { display: none !important; }
          .kum-auth-mobile { display: inline-flex !important; }
        }
        /* Pill Connexion mobile = glass v7 canonique (GLASS.card de snow.ts) */
        .kum-auth-mobile button {
          background: rgba(255,255,255,0.62) !important;
          backdrop-filter: blur(24px) saturate(180%) !important;
          -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
          border: none !important;
          color: #1D1D1F !important;
          font-weight: 700 !important;
          box-shadow: 0 4px 24px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.4) !important;
        }
      `}</style>

      {/* Desktop : 2 boutons SnowButton separes (inchange) */}
      <div className="kum-auth-desktop">
        <Link href="/login" style={{ textDecoration: 'none' }}>
          <SnowButton variant="glass" size="sm">Connexion</SnowButton>
        </Link>
        <Link href="/signup" style={{ textDecoration: 'none' }}>
          <SnowButton variant="primary" size="sm">Inscription</SnowButton>
        </Link>
      </div>

      {/* Mobile : une seule pill glass "Connexion" */}
      <Link href="/login" className="kum-auth-mobile" style={{ textDecoration: 'none' }}>
        <SnowButton variant="glass" size="sm">Connexion</SnowButton>
      </Link>
    </>
  )

  // ── Logged in ─────────────────────────────────────────────────
  const initials = (profile?.display_name || user.email || '?').slice(0, 1).toUpperCase()

  const items = [
    { label: 'Profil & param\u00e8tres', href: '/parametres' },
    { label: 'Abonnement', href: '/abonnement' },
    ...(isAdmin ? [{ label: 'Admin \u2699', href: '/admin' }] : []),
  ]

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <style>{`
        .kum-overlay {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(20,20,28,0.22);
          backdrop-filter: blur(8px) saturate(105%); -webkit-backdrop-filter: blur(8px) saturate(105%);
          opacity: 0; pointer-events: none; transition: opacity .32s ease;
        }
        .kum-overlay.on { opacity: 1; pointer-events: auto; }

        .kum-dropdown {
          opacity: 0; transform: translateY(-10px);
          transition: opacity .38s cubic-bezier(.2,.9,.25,1), transform .38s cubic-bezier(.2,.9,.25,1);
        }
        .kum-dropdown.on { opacity: 1; transform: translateY(0); }

        .kum-row {
          opacity: 0; transform: translateX(7px);
        }
        .kum-dropdown.on .kum-row {
          animation: kumIn .42s cubic-bezier(.2,.85,.3,1) forwards;
          animation-delay: calc(var(--i) * 42ms + 130ms);
        }
        @keyframes kumIn { to { opacity: 1; transform: translateX(0); } }

        .kum-head-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #2E9E6A; flex-shrink: 0;
          box-shadow: 0 0 7px rgba(46,158,106,0.75);
          animation: kumPulse 2.4s ease-in-out infinite;
        }
        @keyframes kumPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .45; transform: scale(.7); }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {(() => {
          const effective = switching ?? persona
          const isInv = effective === 'investor'
          const RED = '#E03020', BLUE = '#185FA5'
          return (
            <>
            <style>{`@keyframes kmodeglow { 0%,100% { opacity:.45; transform:scale(.82) } 50% { opacity:.95; transform:scale(1.08) } }`}</style>
            <button
              onClick={toggleMode}
              aria-label="Changer de mode"
              title={isInv ? 'Passer en mode Collectionneur' : 'Passer en mode Investisseur'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: isMobile ? 0 : 9,
                height: 36, padding: isMobile ? '0 6px' : '0 13px 0 7px', borderRadius: 999,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.62)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: 'none',
                boxShadow: 'none',
                transition: 'transform .2s cubic-bezier(.2,.85,.3,1)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)' }}
              onMouseUp={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            >
              {/* Capsule toggle bicolore : piste + curseur qui glisse */}
              <span style={{ position: 'relative', width: 42, height: 22, borderRadius: 999, flexShrink: 0,
                background: `linear-gradient(90deg, ${RED}26, ${BLUE}26)`,
                border: '1px solid rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                {/* pastille rouge (gauche) */}
                <span style={{ position: 'absolute', left: 5, top: '50%', transform: 'translateY(-50%)', width: 7, height: 7, borderRadius: '50%',
                  background: RED, opacity: isInv ? 0.3 : 1, transition: 'opacity .35s ease' }} />
                {/* pastille bleue (droite) */}
                <span style={{ position: 'absolute', right: 5, top: '50%', transform: 'translateY(-50%)', width: 7, height: 7, borderRadius: '50%',
                  background: BLUE, opacity: isInv ? 1 : 0.3, transition: 'opacity .35s ease' }} />
                {/* halo pulsant sous le curseur — hook visuel qui invite au clic */}
                <span aria-hidden style={{ position: 'absolute', top: 0, left: isInv ? 20 : 0, width: 22, height: 20, borderRadius: 999,
                  background: `radial-gradient(circle, ${isInv ? BLUE : RED}66, transparent 72%)`,
                  animation: 'kmodeglow 2.6s ease-in-out infinite', pointerEvents: 'none',
                  transition: 'left .42s cubic-bezier(.34,1.56,.4,1)' }} />
                {/* curseur lumineux qui glisse (spring) + reflet interieur */}
                <span style={{ position: 'absolute', top: 2, left: isInv ? 22 : 2, width: 18, height: 16, borderRadius: 999,
                  background: `linear-gradient(160deg, ${isInv ? BLUE : RED}, ${isInv ? BLUE : RED}C0)`,
                  boxShadow: `0 2px 6px ${isInv ? BLUE : RED}59, inset 0 1px 0 rgba(255,255,255,0.45)`,
                  transition: 'left .42s cubic-bezier(.34,1.56,.4,1), background .35s ease' }} />
              </span>
              {!isMobile && <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.05 }}>
                <span style={{ fontSize: 8, fontWeight: 600, color: '#AEAEB2', fontFamily: 'var(--font-display)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Kodo Expérience
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: isInv ? BLUE : RED, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap', transition: 'color .35s ease' }}>
                  {isInv ? 'Investisseur' : 'Collectionneur'}
                </span>
              </span>}
            </button>
            </>
          )
        })()}
        <span className="kum-badge-bar"><PlanBadge plan={plan} hideFree /></span>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          width: 34, height: 34, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.16)',
          background: '#1D1D1F',
          color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font-sora,Sora,system-ui)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 14px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.22)',
          transition: 'transform .2s cubic-bezier(.2,.85,.3,1)',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
        >
          {initials}
        </button>
      </div>

      {mounted && menuOpen && createPortal(
        <>
        <div
          className="kum-overlay on"
          onClick={() => setMenuOpen(false)}
        />
        <div className="kum-dropdown on" style={{
        position: 'fixed', top: 56, right: 14, width: 230,
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(40px) saturate(190%)',
        WebkitBackdropFilter: 'blur(40px) saturate(190%)',
        borderRadius: 14,
        border: '1px solid rgba(255,255,255,0.7)',
        boxShadow: '0 18px 50px rgba(0,0,0,0.16), 0 4px 12px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
        overflow: 'hidden', zIndex: 1001,
        pointerEvents: menuOpen ? 'auto' : 'none',
      }}>
        <div className="kum-row" style={{ ['--i' as any]: 0, padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
          <span className="kum-badge-menu" style={{ display: 'none', marginBottom: 8 }}><PlanBadge plan={plan} hideFree /></span>
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: 0, fontFamily: 'var(--font-sora,Sora,system-ui)' }}>{profile?.display_name || 'Utilisateur'}</p>
          <p style={{ fontSize: 11, color: '#AEAEB2', margin: '2px 0 0', fontFamily: 'var(--font-dm,"DM Sans",system-ui)' }}>{user.email}</p>
          {profile?.is_early_supporter && typeof profile?.early_rank === 'number' && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 8, padding: '4px 11px', borderRadius: 99,
              background: '#1D1D1F', color: '#fff',
              fontSize: 10, fontWeight: 700,
              fontFamily: 'var(--font-sora,Sora,system-ui)',
              letterSpacing: '0.04em',
              boxShadow: '0 3px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
              whiteSpace: 'nowrap' as const,
            }}>
              <span style={{ color: '#FFD60A', fontSize: 11, lineHeight: 1 }}>★</span>
              Early Supporter
              <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
                #{String(profile.early_rank).padStart(3, '0')}/300
              </span>
            </span>
          )}
        </div>
        {items.map((item, i) => (
          <button key={i} className="kum-row" onClick={() => { setMenuOpen(false); requestAnimationFrame(() => router.push(item.href)) }} style={{
            ['--i' as any]: i + 1,
            width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
            textAlign: 'left' as const, fontSize: 13, color: '#1D1D1F', cursor: 'pointer',
            fontFamily: 'var(--font-dm,"DM Sans",system-ui)',
            transition: 'background .15s',
          }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {item.label}
          </button>
        ))}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="kum-row" onClick={() => { signOut(); setMenuOpen(false) }} style={{
            ['--i' as any]: items.length + 1,
            width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
            textAlign: 'left' as const, fontSize: 13, color: '#86868B', cursor: 'pointer',
            fontFamily: 'var(--font-dm,"DM Sans",system-ui)',
            transition: 'all .15s',
          }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#1D1D1F' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#86868B' }}>
            Se déconnecter
          </button>
        </div>
        </div>
        </>,
        document.body
      )}
      {modeOpen && <PersonaOnboarding forceOpen onClose={() => setModeOpen(false)} />}
    </div>
  )
}
