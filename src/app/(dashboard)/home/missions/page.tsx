import Link from 'next/link'

/**
 * Missions — VERROUILLÉ (v2). Aperçu du futur menu gamifié (XP / badges /
 * quêtes) grisé en fond + modal explicatif par-dessus. Quand le module sera
 * prêt, remplacer cette page par le vrai menu Missions.
 */

const RED = '#E03020', GOLD = '#E0A020', INK = '#1D1D1F', MUTED = '#6E6E73', MUTED2 = '#86868B', LINE = '#E5E5EA'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"

function Lock({ size = 16, color = MUTED2 }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

const BADGES = ['Premier set', 'Série de 7', 'Collectionneur', '100 cartes', 'Vintage', 'Full FR']
const QUESTS = ['Ajoute 3 cartes aujourd’hui', 'Termine un set à 100 %', 'Connecte-toi 7 jours d’affilée']

export default function MissionsPage() {
  return (
    <div style={{ position: 'relative', width: '100%', minHeight: 'calc(100vh - 160px)', padding: '8px 4px 48px', overflow: 'hidden' }}>
      <style>{`@keyframes ms-in{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .ms-modal{animation:ms-in .6s cubic-bezier(.32,.72,0,1) both}
        @media(prefers-reduced-motion:reduce){.ms-modal{animation:none}}`}</style>

      {/* ░ APERÇU GRISÉ DU FUTUR MENU (fond verrouillé) ░ */}
      <div aria-hidden style={{ filter: 'blur(2px) saturate(0.6)', opacity: 0.5, pointerEvents: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* barre XP */}
        <div style={{ ...glass, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, color: INK }}>Niveau 1 · Dresseur</span>
            <span style={{ fontFamily: MONO, fontSize: 12, color: MUTED }}>0 / 500 XP</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: '#ECECEF', overflow: 'hidden' }}>
            <div style={{ width: '8%', height: '100%', background: `linear-gradient(90deg, ${GOLD}, ${RED})` }} />
          </div>
        </div>
        {/* badges */}
        <div style={{ ...glass, padding: '20px 22px' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 16 }}>Badges</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 16 }}>
            {BADGES.map(b => (
              <div key={b} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #F4F4F6, #E2E2E7)', border: `1.5px solid ${LINE}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Lock size={20} /></div>
                <span style={{ fontFamily: DISPLAY, fontSize: 11.5, color: MUTED, textAlign: 'center' }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
        {/* quêtes */}
        <div style={{ ...glass, padding: '20px 22px' }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, color: INK, marginBottom: 14 }}>Quêtes du jour</div>
          {QUESTS.map((q, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
              <div style={{ width: 22, height: 22, borderRadius: 6, border: `1.5px solid ${LINE}`, flexShrink: 0 }} />
              <span style={{ flex: 1, fontFamily: DISPLAY, fontSize: 14, color: INK }}>{q}</span>
              <span style={{ fontFamily: MONO, fontSize: 11, color: GOLD, fontWeight: 700 }}>+50 XP</span>
            </div>
          ))}
        </div>
      </div>

      {/* ░ MODAL EXPLICATIF (par-dessus) ░ */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '56px 16px' }}>
        <div className="ms-modal" style={{
          width: '100%', maxWidth: 480, borderRadius: 22, padding: 'clamp(26px, 5vw, 38px)', textAlign: 'center',
          background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(30px) saturate(180%)', WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.8)', boxShadow: '0 24px 60px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.9)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div aria-hidden style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}22 0%, transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <div style={{ width: 60, height: 60, borderRadius: 18, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(160deg, ${GOLD}22, ${RED}18)`, color: RED }}>
              <Lock size={26} color={RED} />
            </div>
            <div style={{ marginTop: 16, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: RED }}>Bientôt</div>
            <h1 style={{ margin: '10px 0 0', fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(23px, 4vw, 29px)', letterSpacing: '-0.03em', color: INK, lineHeight: 1.1 }}>Les Missions arrivent</h1>
            <p style={{ margin: '12px auto 0', maxWidth: '40ch', fontFamily: DISPLAY, fontSize: 14.5, color: MUTED, lineHeight: 1.55 }}>
              Bientôt, ta collection devient un jeu : gagne de l’XP, enchaîne les séries, débloque des badges et complète des quêtes quotidiennes pour décrocher des récompenses.
            </p>

            {/* mini-aperçu des mécaniques */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 22, margin: '22px 0 6px' }}>
              {[
                { n: 'XP', d: 'Progresse' },
                { n: 'Badges', d: 'Débloque' },
                { n: 'Quêtes', d: 'Relève' },
              ].map(m => (
                <div key={m.n} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, color: INK }}>{m.n}</div>
                  <div style={{ fontFamily: MONO, fontSize: 10, color: MUTED2, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{m.d}</div>
                </div>
              ))}
            </div>

            <Link href="/home" style={{ display: 'inline-block', marginTop: 18, textDecoration: 'none', padding: '12px 24px', borderRadius: 999, background: INK, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, boxShadow: '0 6px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16)' }}>
              Revenir à l’accueil →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

const glass = {
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 100%)',
  border: '0.5px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.85)',
} as const
