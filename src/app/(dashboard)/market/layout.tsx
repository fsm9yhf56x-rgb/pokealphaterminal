import Link from 'next/link'

/**
 * Verrou v2.0 — ferme TOUTE la zone /market en attendant la v2.
 * Ce layout ne rend jamais les pages enfants : il les remplace par un écran
 * "Bientôt". La sidebar Market (rendue par le layout parent) reste visible.
 * Pour rouvrir le Marché : supprimer ce fichier.
 */

const BLUE = '#185FA5', INK = '#1D1D1F', MUTED = '#6E6E73', MUTED2 = '#86868B', LINE = '#E5E5EA'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"

const TOOLS = [
  { t: 'Terminal', d: 'Cours, indices et flux en temps réel.' },
  { t: 'Sous-évalués', d: 'Les cartes sous leur juste valeur.' },
  { t: 'Deal Hunter', d: 'Les bonnes affaires, scannées en continu.' },
  { t: 'Spreads', d: 'Les écarts d\u2019arbitrage US / EU / JP.' },
  { t: 'Whale Tracker', d: 'Les mouvements des plus gros portefeuilles.' },
]

export default function MarketLayout() {
  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', padding: '32px 8px 64px' }}>
      <style>{`@keyframes mk-in{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        .mk-card{animation:mk-in .6s cubic-bezier(.32,.72,0,1) both}
        .mk-row{animation:mk-in .5s cubic-bezier(.32,.72,0,1) both}
        .mk-row:nth-child(1){animation-delay:120ms}.mk-row:nth-child(2){animation-delay:180ms}
        .mk-row:nth-child(3){animation-delay:240ms}.mk-row:nth-child(4){animation-delay:300ms}
        .mk-row:nth-child(5){animation-delay:360ms}
        @media(prefers-reduced-motion:reduce){.mk-card,.mk-row{animation:none}}`}</style>

      <div className="mk-card" style={{
        width: '100%', maxWidth: 620, borderRadius: 22, padding: 'clamp(26px, 5vw, 44px)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%)',
        backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        border: '0.5px solid rgba(255,255,255,0.7)',
        boxShadow: '0 16px 44px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: `radial-gradient(circle, ${BLUE}22 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative' }}>
          {/* icône */}
          <div style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${BLUE}14`, color: BLUE }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M7 14l3-3 3 2 5-6" /></svg>
          </div>

          <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: BLUE }}>
            En construction · v2.0
          </div>

          <h1 style={{ margin: '10px 0 0', fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(24px, 4vw, 32px)', letterSpacing: '-0.03em', color: INK, lineHeight: 1.08 }}>
            Le Marché arrive bientôt
          </h1>

          <p style={{ margin: '12px auto 0', maxWidth: '44ch', fontFamily: DISPLAY, fontSize: 15, color: MUTED, lineHeight: 1.55 }}>
            Le terminal temps réel, les signaux et les outils d\u2019arbitrage débarquent dans la prochaine version. On veut de la vraie donnée, pas du décor — alors on prend le temps de bien faire.
          </p>

          {/* liste des outils à venir */}
          <div style={{ marginTop: 26, display: 'grid', gap: 1, textAlign: 'left', borderRadius: 14, overflow: 'hidden', border: `1px solid ${LINE}` }}>
            {TOOLS.map((it) => (
              <div key={it.t} className="mk-row" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'rgba(255,255,255,0.5)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: BLUE, flexShrink: 0 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14.5, color: INK }}>{it.t}</span>
                  <span style={{ display: 'block', fontFamily: DISPLAY, fontSize: 12.5, color: MUTED, marginTop: 1 }}>{it.d}</span>
                </span>
                <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: MUTED2, border: `1px solid ${LINE}`, borderRadius: 5, padding: '3px 7px', whiteSpace: 'nowrap' }}>BIENTÔT</span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
            <Link href="/home" style={{ textDecoration: 'none', padding: '12px 22px', borderRadius: 999, background: INK, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16)' }}>
              Revenir à l\u2019accueil →
            </Link>
            <Link href="/portfolio" style={{ textDecoration: 'none', padding: '12px 22px', borderRadius: 999, background: 'rgba(255,255,255,0.6)', color: INK, fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, border: `0.5px solid ${LINE}` }}>
              Voir mon portefeuille
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
