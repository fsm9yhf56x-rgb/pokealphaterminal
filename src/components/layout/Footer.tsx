'use client'
import Link from 'next/link'

/**
 * Footer v7 - glass premium discret en bas de page.
 *
 * - Background glass aligne SpotDrawer ref
 * - 3 sections: brand (logo + tagline), nav (liens utiles), legal (CGU, etc.)
 * - Version courante visible en bas (v0.9 maintenant)
 * - Reste discret, ne perturbe pas le contenu principal
 */
export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{
      marginTop: 60,
      paddingTop: 24,
      paddingBottom: 24,
      paddingInline: 36,
      position: 'relative' as const,
      zIndex: 1,
      background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.62) 100%)',
      backdropFilter: 'blur(28px) saturate(180%)',
      WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      borderTop: '0.5px solid rgba(255,255,255,0.55)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85), 0 -1px 0 rgba(0,0,0,0.02)',
    }}>
      <style>{`
        .kfoot-link {
          font-size: 12px;
          color: #6E6E73;
          text-decoration: none;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          font-weight: 500;
          transition: color .2s, transform .2s;
          letter-spacing: -0.005em;
        }
        .kfoot-link:hover {
          color: #1D1D1F;
        }
        .kfoot-section-label {
          font-size: 10px;
          font-weight: 700;
          color: #AEAEB2;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-family: var(--font-sora, \'Sora\', sans-serif);
          margin-bottom: 14px;
        }
      `}</style>

      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'minmax(220px, 1.5fr) repeat(3, minmax(140px, 1fr))',
        gap: 40,
        alignItems: 'start',
        marginBottom: 28,
      }}>
        {/* Brand */}
        <div>
          <Link href="/home" style={{
            display: 'flex', alignItems: 'center', gap: 9,
            textDecoration: 'none', marginBottom: 12,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#1D1D1F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 13,
              boxShadow: '0 2px 6px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.14)',
              letterSpacing: '-0.02em',
            }}>K</div>
            <span style={{
              fontSize: 14, fontWeight: 700,
              color: '#1D1D1F',
              fontFamily: 'var(--font-sora, Sora, sans-serif)',
              letterSpacing: '-0.025em',
            }}>Kodo<span style={{ color: '#C42E1F' }}> Cards</span></span>
          </Link>
          <p style={{
            fontSize: 12,
            color: '#86868B',
            fontFamily: 'var(--font-sora, Sora, sans-serif)',
            lineHeight: 1.55,
            margin: 0,
            maxWidth: 260,
          }}>
            Le Bloomberg du TCG. Prix temps réel, signaux alpha, gestion de portefeuille.
          </p>
        </div>

        {/* Produit */}
        <div>
          <div className="kfoot-section-label">Produit</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9 }}>
            <Link href="/home" className="kfoot-link">Daily Hub</Link>
            <Link href="/portfolio" className="kfoot-link">Portefeuille</Link>
            <Link href="/cartes" className="kfoot-link">Pokédesk</Link>
            <Link href="/market" className="kfoot-link">Market</Link>
            <Link href="/alpha" className="kfoot-link">Alpha Signals</Link>
            <Link href="/releases" className="kfoot-link">Prochains Sets</Link>
          </div>
        </div>

        {/* Ressources */}
        <div>
          <div className="kfoot-section-label">Ressources</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9 }}>
            <a href="https://discord.gg" className="kfoot-link" target="_blank" rel="noopener noreferrer">Discord</a>
            <a href="https://x.com" className="kfoot-link" target="_blank" rel="noopener noreferrer">X / Twitter</a>
            <a href="https://instagram.com" className="kfoot-link" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="mailto:contact@kodocards.com" className="kfoot-link">Contact</a>
          </div>
        </div>

        {/* Legal */}
        <div>
          <div className="kfoot-section-label">Légal</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 9 }}>
            <Link href="/legal/cgu" className="kfoot-link">CGU</Link>
            <Link href="/legal/confidentialite" className="kfoot-link">Confidentialité</Link>
            <Link href="/legal/mentions" className="kfoot-link">Mentions légales</Link>
            <Link href="/legal/cookies" className="kfoot-link">Cookies</Link>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        maxWidth: 1400,
        margin: '0 auto',
        paddingTop: 20,
        borderTop: '0.5px solid rgba(0,0,0,0.05)',
        display: 'flex',
        flexWrap: 'wrap' as const,
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        fontSize: 11,
        color: '#86868B',
        fontFamily: 'var(--font-sora, Sora, sans-serif)',
        letterSpacing: '-0.005em',
      }}>
        <div>© {year} Kodo Cards · Tous droits réservés</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>v0.9 · Infra Solide</span>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#2E9E6A',
            boxShadow: '0 0 6px rgba(46,158,106,0.5)',
          }} />
          <span style={{ fontWeight: 600, color: '#1D1D1F' }}>Tous systèmes opérationnels</span>
        </div>
      </div>
    </footer>
  )
}
