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
