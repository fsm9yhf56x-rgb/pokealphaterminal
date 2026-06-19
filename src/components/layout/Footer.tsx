'use client'
import Link from 'next/link'

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
        paddingInline: 36,
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
          max-width: 1400px;
          margin: 0 auto 30px;
          display: grid;
          grid-template-columns: minmax(220px, 1.6fr) repeat(3, minmax(140px, 1fr));
          gap: 40px;
          align-items: start;
        }
        .kfoot-col { display: flex; flex-direction: column; gap: 10px; }
        .kfoot-bottom {
          max-width: 1400px;
          margin: 0 auto;
          padding-top: 20px;
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
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              textDecoration: 'none',
              marginBottom: 13,
              width: 'fit-content',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#1D1D1F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 800,
                fontSize: 13,
                boxShadow:
                  '0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14)',
                letterSpacing: '-0.02em',
              }}
            >
              K
            </div>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: '#1D1D1F',
                fontFamily: 'var(--font-sora, Sora, sans-serif)',
                letterSpacing: '-0.025em',
              }}
            >
              Kodo<span style={{ color: '#E03020' }}> Cards</span>
            </span>
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
            Toute ta collection Pokémon, réunie et estimée. En français, anglais
            et japonais.
          </p>
        </div>

        {/* Produit */}
        <div className="kfoot-produit">
          <div className="kfoot-section-label">Produit</div>
          <div className="kfoot-col">
            <Link href="/home" className="kfoot-link">Daily Hub</Link>
            <Link href="/portfolio" className="kfoot-link">Portefeuille</Link>
            <Link href="/cartes" className="kfoot-link">Pokédesk</Link>
            <Link href="/market" className="kfoot-link">Market</Link>
            <Link href="/releases" className="kfoot-link">Prochains Sets</Link>
          </div>
        </div>

        {/* Ressources */}
        <div>
          <div className="kfoot-section-label">Ressources</div>
          <div className="kfoot-col">
            <Link href="/blog" className="kfoot-link">Blog</Link>
            <Link href="/a-propos" className="kfoot-link">À propos</Link>
            <Link href="/telecharger" className="kfoot-link">Télécharger l’app</Link>
            <a href="https://discord.gg" className="kfoot-link" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://x.com" className="kfoot-link" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            <a href="https://instagram.com" className="kfoot-link" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="mailto:contact@kodocards.com" className="kfoot-link">Contact</a>
          </div>
        </div>

        {/* Légal */}
        <div>
          <div className="kfoot-section-label">Légal</div>
          <div className="kfoot-col">
            <Link href="/legal/cgu" className="kfoot-link">CGU</Link>
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
