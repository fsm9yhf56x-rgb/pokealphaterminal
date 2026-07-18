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
            <a href="https://x.com/KodoCards" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"/></svg>
            </a>
            <a href="https://www.facebook.com/profile.php?id=61590946851834&locale=fr_FR" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="https://discord.com/invite/y5p3CqXP4" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="Discord">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.6 1.25a18.3 18.3 0 0 0-5.5 0c-.16-.4-.4-.87-.61-1.25a.08.08 0 0 0-.08-.04 19.7 19.7 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 6 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.22-2a.08.08 0 0 0-.04-.1 13 13 0 0 1-1.87-.9.08.08 0 0 1-.01-.13c.13-.09.25-.19.37-.29a.07.07 0 0 1 .08 0 14.2 14.2 0 0 0 12.06 0 .07.07 0 0 1 .08 0c.12.1.25.2.38.3a.08.08 0 0 1-.01.12c-.6.35-1.22.65-1.87.9a.08.08 0 0 0-.04.1c.36.7.77 1.37 1.22 2a.08.08 0 0 0 .08.03 19.8 19.8 0 0 0 6.02-3.03.08.08 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03ZM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42Zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.22 0 2.18 1.1 2.16 2.42 0 1.34-.94 2.42-2.16 2.42Z"/></svg>
            </a>
            <a href="https://www.instagram.com/kodocards/" className="kfoot-social-link" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069Zm0-2.163C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0Zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324ZM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881Z"/></svg>
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
            <div style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
              <Link href="/legal/cgu" className="kfoot-link">CGU</Link>
              <span className="kfoot-link" aria-hidden="true">&amp;</span>
              <Link href="/legal/cgv" className="kfoot-link">CGV</Link>
            </div>
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
