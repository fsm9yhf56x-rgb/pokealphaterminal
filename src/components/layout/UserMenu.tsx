'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { useRouter } from 'next/navigation'
import { useIsAdmin } from '@/lib/useIsAdmin'
import { SnowButton } from '@/components/ui/snow'

export default function UserMenu() {
  const { user, profile, loading, signOut, isPro } = useAuth()
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
        {isPro && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '.08em',
            padding: '3px 9px', borderRadius: 6,
            background: 'linear-gradient(135deg,#C9A84C,#FFE08A)',
            color: '#5C4200',
            fontFamily: 'var(--font-sora,Sora,system-ui)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
          }}>PRO</span>
        )}
        <button onClick={() => setMenuOpen(!menuOpen)} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #B8763B 0%, #D7935A 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'var(--font-sora,Sora,system-ui)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(184,118,59,0.25), inset 0 1px 0 rgba(255,255,255,0.25)',
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
            { label: 'Mon profil', action: () => setMenuOpen(false) },
            { label: 'Parametres', action: () => setMenuOpen(false) },
            ...(!isPro ? [{ label: 'Passer Pro \u2726', action: () => setMenuOpen(false) }] : []),
            ...(isAdmin ? [{ label: 'Admin \u2699', action: () => { setMenuOpen(false); router.push('/admin') } }] : []),
          ].map((item, i) => (
            <button key={i} onClick={item.action} style={{
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
              Se deconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
