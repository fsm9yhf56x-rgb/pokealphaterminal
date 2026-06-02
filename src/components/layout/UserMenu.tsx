'use client'

import { useState, useRef, useEffect } from 'react'
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
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const isAdmin = useIsAdmin()

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
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

  // ── Logged in ─────────────────────────────────────────────────────
  const initials = (profile?.display_name || user.email || '?').slice(0, 1).toUpperCase()

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <PlanBadge plan={plan} hideFree />
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

      {menuOpen && (
        <div style={{
          position: 'absolute', top: 44, right: 0, width: 230,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.55)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.85)',
          overflow: 'hidden', zIndex: 100,
          animation: 'fadeUp .2s cubic-bezier(.2,.85,.3,1)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#1D1D1F', margin: 0, fontFamily: 'var(--font-sora,Sora,system-ui)' }}>{profile?.display_name || 'Utilisateur'}</p>
            <p style={{ fontSize: 11, color: '#AEAEB2', margin: '2px 0 0', fontFamily: 'var(--font-dm,"DM Sans",system-ui)' }}>{user.email}</p>
          </div>
          {[
            { label: 'Mon profil', href: '/parametres' },
            { label: 'Param\u00e8tres', href: '/parametres' },
            { label: 'Abonnement', href: '/abonnement' },
            ...(isAdmin ? [{ label: 'Admin \u2699', href: '/admin' }] : []),
          ].map((item, i) => (
            <button key={i} onClick={() => { setMenuOpen(false); router.push(item.href) }} style={{
              width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
              textAlign: 'left' as const, fontSize: 13, color: '#1D1D1F', cursor: 'pointer',
              fontFamily: 'var(--font-dm,"DM Sans",system-ui)',
              transition: 'background .15s',
            }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {item.label}
            </button>
          ))}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
            <button onClick={() => { signOut(); setMenuOpen(false) }} style={{
              width: '100%', padding: '10px 16px', border: 'none', background: 'transparent',
              textAlign: 'left' as const, fontSize: 13, color: '#86868B', cursor: 'pointer',
              fontFamily: 'var(--font-dm,"DM Sans",system-ui)',
              transition: 'all .15s',
            }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = '#1D1D1F' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#86868B' }}>
              Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
