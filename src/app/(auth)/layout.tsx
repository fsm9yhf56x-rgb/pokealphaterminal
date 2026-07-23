import Link from 'next/link'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/brand/BrandMark'
import { AuthShowcase } from './AuthShowcase'

export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="ath-root">
      {/* Nappes bokeh — côté formulaire */}
      <div aria-hidden className="ath-bokeh">
        <div className="ath-b ath-b1" />
        <div className="ath-b ath-b2" />
        <div className="ath-b ath-b3" />
        <div className="ath-b ath-b4" />
      </div>

      {/* ── Colonne formulaire ── */}
      <div className="ath-left">
        {/* Barre haute : retour seul, la marque descend dans la colonne */}
        <header className="ath-header">
          <Link href="/" className="ath-back">← Retour</Link>
        </header>

        <div className="ath-brandbar">
          <Link href="/" className="ath-brand" aria-label="Kodo Cards">
            <BrandMark size={78} inline mark={false} />
          </Link>
        </div>

        <main className="ath-main">
          <div className="ath-slot">
            {children}

            {/* Réassurance : ce qu'on gagne à entrer */}
            <ul className="ath-trust">
              <li>
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Gratuit pendant la bêta
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Aucune carte bancaire
              </li>
            </ul>
          </div>
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

      {/* ── Vitrine : position FIXED, hauteur = fenêtre - marges ── */}
      <div className="ath-panel">
        <AuthShowcase />
      </div>

      <style>{`
        html:has(.ath-root),
        body:has(.ath-root) {
          height: 100%;
          max-height: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }
        .ath-root {
          position: relative;
          height: 100dvh;
          background: #FAFAFB;
          overflow: hidden;
        }
        .ath-bokeh {
          position: fixed; inset: 0; pointer-events: none;
          overflow: hidden; z-index: 0;
        }
        .ath-b { position: absolute; border-radius: 50%; }
        .ath-b1 {
          top: -15%; left: -12%; width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(255,165,80,0.40) 0%, transparent 65%);
          filter: blur(110px);
        }
        .ath-b2 {
          top: -8%; left: 24%; width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(110,150,255,0.34) 0%, transparent 65%);
          filter: blur(130px);
        }
        .ath-b3 {
          bottom: -18%; left: -6%; width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(195,135,245,0.28) 0%, transparent 65%);
          filter: blur(130px);
        }
        .ath-b4 {
          bottom: -12%; left: 22%; width: 460px; height: 460px;
          background: radial-gradient(circle, rgba(255,90,140,0.22) 0%, transparent 65%);
          filter: blur(120px);
        }

        .ath-left {
          position: relative;
          z-index: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* Barre haute ancrée à la fenêtre */
        .ath-header {
          position: fixed;
          top: 0; left: 0;
          width: 100%;
          box-sizing: border-box;
          padding: 18px 26px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          z-index: 3;
          pointer-events: none;
        }
        .ath-back {
          pointer-events: auto;
          font-family: var(--font-dm, system-ui);
          font-size: 13px; font-weight: 500;
          color: #6E6E73; text-decoration: none;
          padding: 8px 14px; border-radius: 999px;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(12px) saturate(180%);
          -webkit-backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid rgba(229,229,234,0.6);
          transition: transform .18s cubic-bezier(.2,.8,.2,1), background .18s ease;
          white-space: nowrap;
        }
        .ath-back:hover {
          transform: translateX(-2px);
          background: rgba(255,255,255,0.9);
        }

        .ath-main {
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px 20px 120px;
          min-height: 0;
          overflow: hidden;
        }
        .ath-slot {
          width: 100%;
          max-width: 500px;
          animation: ath-in .62s cubic-bezier(.2,.85,.3,1) both;
        }
        @keyframes ath-in {
          from { opacity: 0; transform: translateY(16px) scale(.985); }
          to   { opacity: 1; transform: none; }
        }

        /* Marque : le premier élément que l'œil rencontre */
        .ath-brandbar {
          flex: 0 0 auto;
          padding: 26px 20px 0;
          display: flex;
          justify-content: center;
        }
        .ath-brand {
          display: block;
          width: fit-content;
          margin: 0;
          text-decoration: none;
          color: #1D1D1F;
          transition: opacity .18s ease, transform .18s cubic-bezier(.2,.8,.2,1);
          animation: ath-brand-in .7s cubic-bezier(.2,.85,.3,1) both .06s;
        }
        .ath-brand:hover { opacity: .78; transform: translateY(-1px); }
        @keyframes ath-brand-in {
          from { opacity: 0; transform: translateY(-10px); filter: blur(4px); }
          to   { opacity: 1; transform: none; filter: none; }
        }

        /* Réassurance sous le formulaire */
        .ath-slot h1,
        .ath-slot h1 + p { text-align: center; }

        .ath-trust {
          list-style: none;
          margin: 26px 0 0;
          padding: 0;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
          animation: ath-brand-in .7s cubic-bezier(.2,.85,.3,1) both .34s;
        }
        .ath-trust li {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-dm, system-ui);
          font-size: 12px;
          color: #86868B;
        }
        .ath-trust svg {
          width: 13px; height: 13px;
          color: #1D9E75;
          flex-shrink: 0;
        }

        .ath-footer {
          position: fixed;
          left: 0; bottom: 0;
          width: 100%;
          box-sizing: border-box;
          padding: 14px 26px;
          text-align: center;
          z-index: 3;
          pointer-events: none;
        }
        .ath-footer p {
          margin: 0;
          font-family: var(--font-dm, system-ui);
          font-size: 12px; color: #86868B;
          pointer-events: auto;
        }
        .ath-footer a { color: #6E6E73; text-decoration: none; }
        .ath-footer a:hover { color: #1D1D1F; }

        .ath-panel { display: none; }

        /* ── Split à partir de 1024px ── */
        @media (min-width: 1024px) {
          .ath-left { width: 50%; }
          .ath-header { width: 50%; }
          .ath-footer {
            width: 50%;
            text-align: left;
            padding-left: 86px;
          }
          .ath-main { padding: 16px 44px 120px; }

          .ath-panel {
            display: block;
            position: fixed;
            top: 14px;
            bottom: 14px;
            right: 14px;
            width: calc(50% - 28px);
            z-index: 1;
          }
        }

        /* Écrans courts : on resserre pour que tout tienne */
        @media (max-height: 760px) {
          .ath-trust { margin-top: 16px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .ath-slot, .ath-brand, .ath-trust { animation: none; }
          .ath-back:hover, .ath-brand:hover { transform: none; }
        }
      `}</style>
    </div>
  )
}
