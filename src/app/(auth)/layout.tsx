import Link from 'next/link'
import type { ReactNode } from 'react'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
    }}>
      <header style={{
        padding: '20px 24px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            textDecoration: 'none', color: 'var(--ink)',
            fontFamily: 'var(--font-sora, system-ui)',
            fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px',
          }}
        >
          <span>Kodo</span>
          <span style={{ color: 'var(--accent)' }}>Cards</span>
        </Link>
        <Link
          href="/"
          style={{
            fontSize: '13px', color: 'var(--ink-muted)',
            textDecoration: 'none', fontFamily: 'var(--font-dm, system-ui)',
            fontWeight: 500,
          }}
        >
          ← Retour
        </Link>
      </header>

      <main style={{
        flex: 1, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        {children}
      </main>

      <footer style={{
        padding: '24px', textAlign: 'center',
        borderTop: '1px solid var(--border)',
      }}>
        <p style={{
          fontSize: '12px', color: 'var(--ink-faint)',
          margin: 0, fontFamily: 'var(--font-dm, system-ui)',
        }}>
          © 2026 Kodo Cards ·{' '}
          <Link href="/legal/cgu" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
            CGU
          </Link>
          {' · '}
          <Link href="/legal/confidentialite" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
            Confidentialité
          </Link>
          {' · '}
          <Link href="/contact" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
            Contact
          </Link>
        </p>
      </footer>
    </div>
  )
}
