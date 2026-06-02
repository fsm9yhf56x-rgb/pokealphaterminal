import Link from 'next/link'
import { Footer } from '@/components/layout/Footer'
import type { ReactNode } from 'react'

/**
 * PublicDoc — coquille Snow+ pour les pages publiques hors-app
 * (blog, à propos, légal). Top bar minimale + contenu centré + Footer site.
 */
export default function PublicDoc({
  title,
  subtitle,
  updated,
  children,
}: {
  title: string
  subtitle?: string
  updated?: string
  children: ReactNode
}) {
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
        .pdoc-back{font-size:13px;color:#6E6E73;text-decoration:none;font-weight:500;transition:color .15s;}
        .pdoc-back:hover{color:#1D1D1F;}
        .pdoc-prose{font-size:15.5px;line-height:1.7;color:#3A3A3C;}
        .pdoc-prose h2{font-family:var(--font-display,'Sora',sans-serif);font-size:21px;font-weight:700;letter-spacing:-.02em;margin:34px 0 12px;color:#1D1D1F;}
        .pdoc-prose p{margin:0 0 16px;}
        .pdoc-prose a{color:#E03020;text-decoration:none;}
        .pdoc-prose a:hover{text-decoration:underline;}
        .pdoc-prose ul{margin:0 0 16px;padding-left:20px;display:flex;flex-direction:column;gap:8px;}
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
        <div style={{ maxWidth: 1160, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
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
          <Link href="/" className="pdoc-back" style={{ marginLeft: 'auto' }}>
            ← Retour à l’accueil
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 760, margin: '0 auto', width: '100%', padding: '56px 24px 72px' }}>
        <h1
          style={{
            fontFamily: "var(--font-display, 'Sora', sans-serif)",
            fontWeight: 700,
            fontSize: 'clamp(30px,4.5vw,42px)',
            letterSpacing: '-.03em',
            lineHeight: 1.1,
            margin: 0,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 17, color: '#6E6E73', lineHeight: 1.55, margin: '16px 0 0', maxWidth: '52ch' }}>
            {subtitle}
          </p>
        )}
        {updated && (
          <p style={{ fontFamily: "var(--font-mono, 'Space Mono', monospace)", fontSize: 12, color: '#AEAEB2', margin: '18px 0 0' }}>
            Dernière mise à jour : {updated}
          </p>
        )}
        <div className="pdoc-prose" style={{ marginTop: 34 }}>
          {children}
        </div>
      </main>

      <Footer />
    </div>
  )
}
