'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { SnowButton } from '@/components/ui/snow'
import { PlanBadge } from '@/components/ui/PlanBadge'

export default function UserMenu() {
  const { user, profile, loading, signOut, isPro } = useAuth()
  const plan: 'free' | 'pro' | 'premium' = (profile?.plan as any) || (isPro ? 'pro' : 'free')
  const [menuOpen, setMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isAdmin = useIsAdmin()

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  if (loading) return <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F0F0F0' }} />

  // ── Not logged in: SnowButton glass + primary v7 ─────────────────
  if (!user) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <Link href="/login" style={{ textDecoration: 'none' }}>
        <SnowButton variant="glass" size="sm">Connexion</SnowButton>
      </Link>
      <Link href="/signup" style={{ textDecoration: 'none' }}>
        <SnowButton variant="primary" size="sm">Inscription</SnowButton>
      </Link>
    </div>
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
    </div>
  )
}
