import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import type { ReactNode } from 'react'

/**
 * Coquille des pages du blog.
 *
 * Reprend volontairement la top bar de PublicDoc à l'identique, plutôt que
 * d'utiliser PublicDoc lui-même : celui-ci impose un h1 via sa prop `title`
 * (doublon avec le titre de l'article), contraint la largeur à 760px et
 * applique .pdoc-prose, qui entrerait en conflit avec la typographie du corps
 * d'article. PublicDoc reste intact pour /legal et /a-propos.
 */
export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        color: '#1D1D1F',
        fontFamily: "var(--font-sans, 'DM Sans', system-ui, sans-serif)",
        display: 'flex',
        flexDirection: 'column' as const,
      }}
    >
      <style>{`
        .kblog-back{font-size:13px;color:#6E6E73;text-decoration:none;font-weight:500;transition:color .15s;}
        .kblog-back:hover{color:#1D1D1F;}
      `}</style>

      <header
        style={{
          height: 64,
          borderBottom: '1px solid #E5E5EA',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-display, 'Sora', sans-serif)",
              fontWeight: 700,
              fontSize: 19,
              letterSpacing: '-.02em',
              textDecoration: 'none',
              color: '#1D1D1F',
            }}
          >
            Kodo<span style={{ color: '#E03020' }}> Cards</span>
          </Link>
          <Link href="/" className="kblog-back" style={{ marginLeft: 'auto' }}>
            ← Retour à l&rsquo;accueil
          </Link>
        </div>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <Footer />
    </div>
  )
}
