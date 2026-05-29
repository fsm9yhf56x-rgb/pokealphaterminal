import Link from 'next/link'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      // Fond neutre Spotlight — les nappes bokeh apportent la couleur
      background: '#FAFAFB',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* 5 nappes bokeh Spotlight (alignées AppShell) */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
      }}>
        {/* Orange top-left */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: 520, height: 520, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,165,80,0.42) 0%, transparent 65%)',
          filter: 'blur(110px)',
        }} />
        {/* Bleu top-right */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-12%',
          width: 580, height: 580, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(110,150,255,0.36) 0%, transparent 65%)',
          filter: 'blur(130px)',
        }} />
        {/* Violet centre */}
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(195,135,245,0.3) 0%, transparent 65%)',
          filter: 'blur(130px)',
        }} />
        {/* Vert bottom-right */}
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-8%',
          width: 540, height: 540, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,210,150,0.28) 0%, transparent 65%)',
          filter: 'blur(120px)',
        }} />
        {/* Rose bottom-left */}
        <div style={{
          position: 'absolute', bottom: '-10%', left: '15%',
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,90,140,0.24) 0%, transparent 65%)',
          filter: 'blur(120px)',
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
