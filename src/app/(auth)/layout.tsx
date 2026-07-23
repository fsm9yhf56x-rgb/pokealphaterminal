import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { AuthShowcase } from './AuthShowcase'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ath-root">
      {/* Nappes bokeh — côté formulaire uniquement, la vitrine a son propre fond */}
      <div aria-hidden className="ath-bokeh">
        <div className="ath-b ath-b1" />
        <div className="ath-b ath-b2" />
        <div className="ath-b ath-b3" />
        <div className="ath-b ath-b4" />
      </div>

      {/* ── Colonne formulaire ── */}
      <div className="ath-left">
        <header className="ath-header">
          <Link href="/" className="ath-logo" aria-label="Kodo Cards">
            <BrandMark size={26} inline mark={false} />
          </Link>
          <Link href="/" className="ath-back">← Retour</Link>
        </header>

        <main className="ath-main">
          <div className="ath-slot">{children}</div>
        </main>

        <footer className="ath-footer">
          <p>
            © 2026 Kodo Cards ·{' '}
            <Link href="/legal/cgu">CGU</Link>
            {' · '}
            <Link href="/legal/confidentialite">Confidentialité</Link>
            {' · '}
            <Link href="/contact">Contact</Link>
          </p>
        </footer>
      </div>

      {/* ── Colonne vitrine (masquée sous 980px) ── */}
      <div className="ath-right">
        <AuthShowcase />
      </div>

      <style>{`
        .ath-root {
          position: fixed;
          inset: 0;
          height: 100dvh;
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr;
          background: #FAFAFB;
          overflow: hidden;
        }
        .ath-bokeh {
          position: absolute; inset: 0; pointer-events: none;
          overflow: hidden; z-index: 0;
        }
        .ath-b { position: absolute; border-radius: 50%; }
        .ath-b1 {
          top: -15%; left: -12%; width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(255,165,80,0.40) 0%, transparent 65%);
          filter: blur(110px);
        }
        .ath-b2 {
          top: -8%; left: 34%; width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(110,150,255,0.34) 0%, transparent 65%);
          filter: blur(130px);
        }
        .ath-b3 {
          bottom: -18%; left: -6%; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(195,135,245,0.28) 0%, transparent 65%);
          filter: blur(130px);
        }
        .ath-b4 {
          bottom: -12%; left: 30%; width: 460px; height: 460px;
          background: radial-gradient(circle, rgba(255,90,140,0.22) 0%, transparent 65%);
          filter: blur(120px);
        }

        .ath-left {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          min-width: 0;
          min-height: 0;
          overflow: hidden;
        }
        .ath-header {
          padding: 16px 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .ath-logo {
          display: inline-flex; align-items: center;
          text-decoration: none; color: #1D1D1F;
          transition: opacity .18s ease;
        }
        .ath-logo:hover { opacity: .72; }
        .ath-back {
          font-family: var(--font-dm, system-ui);
          font-size: 13px; font-weight: 500;
          color: #6E6E73; text-decoration: none;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid rgba(229,229,234,0.6);
          transition: transform .18s cubic-bezier(.2,.8,.2,1), background .18s ease;
        }
        .ath-back:hover {
          transform: translateX(-2px);
          background: rgba(255,255,255,0.9);
        }

        .ath-main {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px;
          min-height: 0;
          overflow-y: auto;
          overscroll-behavior: contain;
        }
        .ath-slot {
          width: 100%;
          max-width: 430px;
          animation: ath-in .62s cubic-bezier(.2,.85,.3,1) both;
        }
        @keyframes ath-in {
          from { opacity: 0; transform: translateY(16px) scale(.985); }
          to   { opacity: 1; transform: none; }
        }

        .ath-footer { padding: 14px 26px; text-align: center; }
        .ath-footer p {
          margin: 0;
          font-family: var(--font-dm, system-ui);
          font-size: 12px; color: #86868B;
        }
        .ath-footer a { color: #6E6E73; text-decoration: none; }
        .ath-footer a:hover { color: #1D1D1F; }

        .ath-right { display: none; }

        /* ── Split à partir de 980px ── */
        @media (min-width: 980px) {
          .ath-root { grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr); }
          .ath-right {
            display: grid;
            padding: 14px 14px 14px 0;
            min-width: 0;
            min-height: 0;
            overflow: hidden;
          }
          .ath-footer { text-align: left; }
          .ath-main { padding: 20px 40px; }
        }
        @media (min-width: 1400px) {
          .ath-root { grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr); }
        }

        @media (prefers-reduced-motion: reduce) {
          .ath-slot { animation: none; }
          .ath-back:hover { transform: none; }
        }
      `}</style>
    </div>
  )
}
