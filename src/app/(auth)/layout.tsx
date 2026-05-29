import Link from 'next/link'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      // Dégradé Snow+ étendu sur TOUT le layout
      background: 'linear-gradient(135deg, #FFE8E5 0%, #FFF5F0 30%, #F0F5FB 70%, #E8EEFB 100%)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Blobs colorés décoratifs absolus */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-10%', left: '-10%',
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(224,48,32,0.18) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(24,95,165,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Header glass (transparent + blur) */}
      <header style={{
        padding: '18px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 2,
      }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            textDecoration: 'none', color: '#1D1D1F',
            fontFamily: 'var(--font-sora, system-ui)',
            fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px',
          }}
        >
          <span>Kodo</span>
          <span style={{ color: '#E03020' }}>Cards</span>
        </Link>
        <Link
          href="/"
          style={{
            fontSize: '13px', color: '#6E6E73',
            textDecoration: 'none', fontFamily: 'var(--font-dm, system-ui)',
            fontWeight: 500,
            padding: '8px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(12px) saturate(180%)',
            WebkitBackdropFilter: 'blur(12px) saturate(180%)',
            border: '1px solid rgba(229,229,234,0.6)',
            transition: 'all .15s cubic-bezier(.2,.8,.2,1)',
          }}
        >
          ← Retour
        </Link>
      </header>

      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </main>

      <footer style={{
        padding: '20px 24px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2,
      }}>
        <p style={{
          fontSize: '12px', color: '#86868B',
          margin: 0, fontFamily: 'var(--font-dm, system-ui)',
        }}>
          © 2026 Kodo Cards ·{' '}
          <Link href="/legal/cgu" style={{ color: '#6E6E73', textDecoration: 'none' }}>
            CGU
          </Link>
          {' · '}
          <Link href="/legal/confidentialite" style={{ color: '#6E6E73', textDecoration: 'none' }}>
            Confidentialité
          </Link>
          {' · '}
          <Link href="/contact" style={{ color: '#6E6E73', textDecoration: 'none' }}>
            Contact
          </Link>
        </p>
      </footer>
    </div>
  )
}
