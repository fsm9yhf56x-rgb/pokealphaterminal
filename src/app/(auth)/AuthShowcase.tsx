'use client'

/**
 * AuthShowcase — panneau droit de la porte d'entrée.
 *
 * Le parent (.ath-panel) est en position:fixed avec top ET bottom :
 * sa hauteur vaut la fenêtre moins les marges, par construction.
 * Ici on remplit ce parent (inset:0) et on ancre le message à son bord bas.
 * Aucune dépendance à une chaîne grid/flex → rien ne peut déborder.
 *
 * Vignettes : largeur FIXE (elles ne doivent pas enfler sur grand écran)
 * + repli en dégradé si l'image R2 manque.
 */

import { useState, useMemo } from 'react'

const R2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  || 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'

/** Vintage WotC : les petits numeros sont les holos. */
const VINTAGE: { set: string; max: number }[] = [
  { set: 'base1', max: 16 },
  { set: 'base2', max: 16 },
  { set: 'base3', max: 15 },
  { set: 'base4', max: 18 },
  { set: 'neo1',  max: 16 },
  { set: 'neo2',  max: 16 },
  { set: 'neo3',  max: 16 },
  { set: 'neo4',  max: 17 },
]

/** Series recentes : numeros de rares releves dans le catalogue (lid sur 3 chiffres). */
const MODERN: { set: string; nums: string[] }[] = [
  { set: 'sv08',    nums: ['004','011','014','031','036','037','038','042','048','056'] },
  { set: 'sv08.5',  nums: ['005','006','008','011','012','013','014','017','022','023'] },
  { set: 'sv09',    nums: ['003','011','018','021','024','030','031','037','041','043'] },
  { set: 'sv10',    nums: ['003','008','012','018','020','023','025','031','034','036'] },
  { set: 'sv10.5b', nums: ['003','012','016','023','026','028','033','034','044','046'] },
  { set: 'sv10.5w', nums: ['005','010','013','018','020','023','030','040','043','045'] },
]

/** Absentes de R2 (verifie par HEAD : 404) — sinon tuile vide dans le mur. */
const MISSING = new Set(['base4/8', 'base4/9'])

const POOL: { set: string; num: string }[] = [
  ...VINTAGE.flatMap(({ set, max }) =>
    Array.from({ length: max }, (_, i) => ({ set, num: String(i + 1) }))
  ),
  ...MODERN.flatMap(({ set, nums }) => nums.map(num => ({ set, num }))),
].filter(c => !MISSING.has(c.set + '/' + c.num))

const FALLBACKS = [
  'linear-gradient(150deg,#2B2F45,#4A3157)',
  'linear-gradient(150deg,#3A2B45,#5A3140)',
  'linear-gradient(150deg,#25384A,#3F5570)',
  'linear-gradient(150deg,#43302A,#6B4433)',
  'linear-gradient(150deg,#2C3F35,#47654F)',
  'linear-gradient(150deg,#332A46,#4E3A63)',
]

const COLS = 12
const PER_COL = 9

function Tile({ src, i }: { src: string; i: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="as-tile" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
      {failed ? (
        // Silhouette de carte : cadre clair + cartouche + bandeau bas.
        // Se fond dans le mur au lieu de faire un trou sombre.
        <div className="as-ghost">
          <div className="as-ghost-art" />
          <div className="as-ghost-bar" />
          <div className="as-ghost-bar as-ghost-bar2" />
        </div>
      ) : (
        <img
          src={src}
          alt=""
          loading="eager"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </div>
  )
}

export function AuthShowcase() {
  const columns = useMemo(() => {
    // Melange deterministe (pas de Math.random : evite un ecart SSR/client)
    const deck = [...POOL]
    let seed = 20260723
    for (let i = deck.length - 1; i > 0; i--) {
      seed = (seed * 1103515245 + 12345) % 2147483648
      const j = seed % (i + 1)
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    // Distribution en serpentin : chaque colonne pioche des cartes distinctes
    return Array.from({ length: COLS }, (_, c) =>
      Array.from({ length: PER_COL }, (_, r) => deck[(c * PER_COL + r) % deck.length])
    )
  }, [])

  return (
    <aside className="as-root" aria-hidden>
      <div className="as-wall">
        {columns.map((col, ci) => (
          <div key={ci} className={`as-col as-col-${ci % 3}`}>
            {[...col, ...col].map((c, i) => (
              <Tile key={i} i={ci + i} src={`${R2}/fr/${c.set}/${c.num}.webp`} />
            ))}
          </div>
        ))}
      </div>

      <div className="as-veil" />

      <div className="as-content">
        <p className="as-kicker"><span className="as-dot" />Le pokédex de ta collection</p>
        <h2 className="as-title">Chaque carte,<br />sa vraie cote.</h2>
        <div className="as-stats">
          <div className="as-stat">
            <strong>70 000+</strong>
            <span>cartes référencées</span>
          </div>
          <div className="as-stat">
            <strong>FR · EN · JP</strong>
            <span>chaque marché à part</span>
          </div>
          <div className="as-stat">
            <strong>Chaque nuit</strong>
            <span>les cotes se rafraîchissent</span>
          </div>
        </div>
      </div>

      <style>{`
        /* Remplit exactement le parent fixed : pas de height:100%, pas de flex chain */
        .as-root {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #0A0A14;
          border-radius: 22px;
          isolation: isolate;
        }
        .as-wall {
          position: absolute;
          inset: -30% -25%;
          display: flex;
          justify-content: center;
          /* flex-start OBLIGATOIRE : en stretch (defaut), les colonnes prennent
             la hauteur du mur et le -50% de l animation porte sur CETTE hauteur,
             pas sur celle du contenu -> raccord decale = le saut. */
          align-items: flex-start;
          gap: 12px;
          transform: rotate(-8deg);
          opacity: 0.5;
          pointer-events: none;
        }
        .as-col {
          --as-shift: ${PER_COL * 191}px;
          display: flex;
          flex-direction: column;
          /* PAS de gap : avec 2n tuiles il y a 2n-1 intervalles, donc -50%
             tombe a un demi-intervalle du raccord = le saut visible.
             Avec une marge par tuile, la hauteur est exactement 2x -> boucle nette. */
          width: 128px;
          flex: 0 0 128px;
          will-change: transform;
        }
        .as-col-0 { animation: as-drift 60s linear infinite; }
        .as-col-1 { animation: as-drift 78s linear infinite; animation-delay: -20s; }
        .as-col-2 { animation: as-drift 68s linear infinite; animation-delay: -40s; }
        @keyframes as-drift {
          from { transform: translateY(0); }
          to   { transform: translateY(calc(-1 * var(--as-shift))); }
        }
        .as-tile {
          width: 128px;
          height: 179px;          /* 128 x 88/63, en dur : aspect-ratio arrondit */
          margin-bottom: 12px;
          border-radius: 6px;
          overflow: hidden;
          flex: 0 0 auto;
          box-shadow: 0 6px 16px rgba(0,0,0,0.45);
        }
        .as-ghost {
          width: 100%; height: 100%;
          padding: 7px;
          box-sizing: border-box;
          background: linear-gradient(160deg, #C9A227 0%, #E3C25A 42%, #A8851C 100%);
          display: flex; flex-direction: column; gap: 5px;
        }
        .as-ghost-art {
          flex: 1 1 auto;
          border-radius: 2px;
          background: linear-gradient(150deg, rgba(255,255,255,0.22), rgba(0,0,0,0.28));
        }
        .as-ghost-bar {
          height: 13px; border-radius: 2px;
          background: rgba(255,255,255,0.30);
        }
        .as-ghost-bar2 { height: 9px; width: 68%; }
        .as-veil {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(0deg, rgba(10,10,20,0.97) 0%, rgba(10,10,20,0.9) 28%, rgba(10,10,20,0.4) 58%, rgba(10,10,20,0.1) 100%);
          pointer-events: none;
        }

        /* Ancré au bord bas du panneau fixed → toujours visible */
        .as-content {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          padding: 0 42px 38px;
          color: #fff;
          z-index: 2;
        }
        .as-kicker {
          display: flex; align-items: center; gap: 8px;
          margin: 0 0 13px;
          font-family: var(--font-sora, system-ui);
          font-size: 10.5px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          color: rgba(255,255,255,0.72);
          animation: as-rise .7s cubic-bezier(.2,.85,.3,1) both .1s;
        }
        .as-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #E03020;
          box-shadow: 0 0 12px rgba(224,48,32,0.9);
          animation: as-pulse 2.4s ease-in-out infinite;
        }
        @keyframes as-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: .55; transform: scale(.82); }
        }
        .as-title {
          margin: 0 0 24px;
          font-family: var(--font-sora, system-ui);
          font-size: clamp(26px, 2.3vw, 36px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.08;
          text-shadow: 0 2px 30px rgba(0,0,0,0.7);
          animation: as-rise .8s cubic-bezier(.2,.85,.3,1) both .18s;
        }
        .as-stats {
          display: flex;
          gap: 26px;
          flex-wrap: wrap;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.14);
        }
        .as-stat {
          display: flex; flex-direction: column; gap: 2px;
          animation: as-rise .7s cubic-bezier(.2,.85,.3,1) both;
        }
        .as-stat:nth-child(1) { animation-delay: .30s; }
        .as-stat:nth-child(2) { animation-delay: .38s; }
        .as-stat:nth-child(3) { animation-delay: .46s; }
        .as-stat strong {
          font-family: var(--font-sora, system-ui);
          font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em;
          color: #fff;
        }
        .as-stat span {
          font-family: var(--font-dm, system-ui);
          font-size: 11.5px;
          color: rgba(255,255,255,0.55);
        }
        @keyframes as-rise {
          from { opacity: 0; transform: translateY(14px); filter: blur(5px); }
          to   { opacity: 1; transform: none; filter: none; }
        }
        @media (max-height: 780px) {
          .as-content { padding: 0 32px 28px; }
          .as-title { margin-bottom: 16px; font-size: clamp(24px, 2vw, 30px); }
          .as-stats { gap: 20px; padding-top: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .as-col, .as-dot, .as-kicker, .as-title, .as-stat {
            animation: none !important;
            opacity: 1 !important;
            transform: none !important;
            filter: none !important;
          }
          .as-wall { transform: rotate(-8deg); }
        }
      `}</style>
    </aside>
  )
}

export default AuthShowcase
