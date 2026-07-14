'use client'
import Link from 'next/link'
import { BrandMark } from '@/components/brand/BrandMark'

/**
 * Footer v7.1 — glass premium discret en bas de page.
 *
 * - Glass v7 : rgba .62 + blur 24, double inset (refraction haut / glow bas)
 * - Hairline accent rouge en haut de cadre (détail premium)
 * - 4 colonnes : brand (logo + tagline) · Produit · Ressources · Légal
 * - Responsive complet (4 → 2 → 1 colonnes)
 * - Micro-interactions sur les liens (couleur + léger décalage)
 * - Barre du bas : © · conçu en France · statut systèmes · version
 */
export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer
      style={{
        marginTop: 60,
        paddingTop: 28,
        paddingBottom: 26,
        paddingInline: 0,
        position: 'relative' as const,
        zIndex: 1,
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.70) 100%)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.02)',
      }}
    >
      {/* Hairline accent */}
      <div
        aria-hidden
        style={{
          position: 'absolute' as const,
          top: 0,
          left: '12%',
          right: '12%',
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(224,48,32,0.30), transparent)',
        }}
      />

      <style>{`
        .kfoot-link {
          font-size: 12.5px;
          color: #6E6E73;
          text-decoration: none;
          font-family: var(--font-sora, 'Sora', sans-serif);
          font-weight: 500;
          letter-spacing: -0.005em;
          width: fit-content;
          transition: color .18s ease, transform .18s ease;
        }
        .kfoot-link:hover {
          color: #1D1D1F;
          transform: translateX(2px);
        }
        .kfoot-section-label {
          font-size: 10px;
          font-weight: 700;
          color: #AEAEB2;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-family: var(--font-sora, 'Sora', sans-serif);
          margin-bottom: 15px;
        }
        .kfoot-grid {
          max-width: 1160px;
          margin: 0 auto 30px;
          padding: 0 24px;
          display: grid;
          grid-template-columns: minmax(220px, 1.6fr) repeat(3, minmax(140px, 1fr));
          gap: 40px;
          align-items: start;
        }
        .kfoot-col { display: flex; flex-direction: column; gap: 10px; }
        .kfoot-social { display: flex; gap: 9px; margin-top: 18px; }
        .kfoot-social-link {
          width: 34px; height: 34px; border-radius: 9px;
          display: inline-flex; align-items: center; justify-content: center;
          color: #86868B; background: rgba(0,0,0,0.03);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06);
          transition: color .2s, background .2s, transform .2s, box-shadow .2s;
        }
        .kfoot-social-link:hover {
          color: #1D1D1F; background: rgba(0,0,0,0.05); transform: translateY(-2px);
          box-shadow: inset 0 0 0 1px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.06);
        }
        .kfoot-bottom {
          max-width: 1160px;
          margin: 0 auto;
          padding: 20px 24px 0;
          border-top: 0.5px solid rgba(0,0,0,0.05);
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          font-size: 11px;
          color: #86868B;
          font-family: var(--font-sora, 'Sora', sans-serif);
          letter-spacing: -0.005em;
        }
        .kfoot-grid, .kfoot-bottom { width: 100%; box-sizing: border-box; }
        .kfoot-col { min-width: 0; }
        @media (max-width: 860px) {
          .kfoot-grid { grid-template-columns: 1fr 1fr; gap: 32px 24px; }
        }
        @media (max-width: 767px) {
          /* C : masquer Produit (deja dans le burger), pas de redondance mobile */
          .kfoot-produit { display: none !important; }
          /* A : 2 colonnes compactes pour le reste */
          .kfoot-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 26px 20px !important;
            margin-bottom: 24px;
          }
          /* Brand s'etale sur les 2 colonnes en tete */
          .kfoot-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 767px) {
          /* Barre du bas : 2 lignes centrees nettes */
          .kfoot-bottom {
            flex-direction: column;
            justify-content: center;
            text-align: center;
            gap: 8px;
          }
          .kfoot-bottom > div { justify-content: center; }
          .kfoot-sep { display: none; }
        }
        @media (max-width: 520px) {
          .kfoot-grid { grid-template-columns: 1fr 1fr !important; gap: 24px 16px !important; }
        }
      `}</style>

      <div className="kfoot-grid">
        {/* Brand */}
        <div>
          <Link
            href="/home"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              textDecoration: 'none',
              marginBottom: 13,
              width: 'fit-content',
            }}
          >
            <BrandMark size={30} inline signature mark={false} />
          </Link>
          <p
            style={{
              fontSize: 12.5,
              color: '#86868B',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              lineHeight: 1.55,
              margin: 0,
              maxWidth: 260,
            }}
          >
            Toute votre collection Pokémon, réunie et suivie — en français,
            anglais et japonais.
          </p>
          <div className="kfoot-social">
            <a href="https://discord.gg" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M20.317 4.369a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </a>
            <a href="https://x.com" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/></svg>
            </a>
            <a href="https://instagram.com" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
          </div>
        </div>

        {/* Produit */}
        <div className="kfoot-produit">
          <div className="kfoot-section-label">Produit</div>
          <div className="kfoot-col">
            <Link href="/home" className="kfoot-link">Daily Hub</Link>
            <Link href="/portfolio" className="kfoot-link">Portefeuille</Link>
            <Link href="/cartes" className="kfoot-link">Pokédesk</Link>
            <Link href="/market" className="kfoot-link">Market</Link>
          </div>
        </div>

        {/* Ressources */}
        <div>
          <div className="kfoot-section-label">Ressources</div>
          <div className="kfoot-col">
            <Link href="/blog" className="kfoot-link">Blog</Link>
            <Link href="/a-propos" className="kfoot-link">À propos</Link>
            <Link href="/telecharger" className="kfoot-link">L’app mobile</Link>
            <a href="mailto:contact@kodocards.com" className="kfoot-link">Contact</a>
          </div>
        </div>

        {/* Légal */}
        <div>
          <div className="kfoot-section-label">Légal</div>
          <div className="kfoot-col">
            <Link href="/legal/cgu" className="kfoot-link">CGU</Link>
            <Link href="/legal/cgv" className="kfoot-link">CGV</Link>
            <Link href="/legal/confidentialite" className="kfoot-link">Confidentialité</Link>
            <Link href="/legal/mentions" className="kfoot-link">Mentions légales</Link>
            <Link href="/legal/cookies" className="kfoot-link">Cookies</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="kfoot-bottom">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const }}>
          <span>© {year} Kodo Cards · Tous droits réservés</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: '#2E9E6A',
              boxShadow: '0 0 6px rgba(46,158,106,0.5)',
            }}
          />
          <span style={{ fontWeight: 600, color: '#1D1D1F' }}>Tous systèmes opérationnels</span>
        </div>
      </div>
    </footer>
  )
}
