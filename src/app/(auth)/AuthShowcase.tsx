'use client'

/**
 * AuthShowcase — panneau droit de la porte d'entrée.
 *
 * Un MUR de cartes (dense, petites vignettes) qui dérive lentement.
 * L'effet cherché = la masse d'une collection, pas la lecture d'une carte.
 *
 * Robustesse : chaque vignette a un repli en dégradé si l'image R2 manque.
 * prefers-reduced-motion fige tout.
 */

import { useState, useMemo } from 'react'

const R2 = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
  || 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev'

/** Réservoir de cartes FR sûres (Base Set + Neo Destiny). */
const POOL: { set: string; num: string }[] = [
  ...Array.from({ length: 16 }, (_, i) => ({ set: 'base1', num: String(i + 1) })),
  ...Array.from({ length: 17 }, (_, i) => ({ set: 'neo4', num: String(i + 1) })),
]

const FALLBACKS = [
  'linear-gradient(150deg,#2B2F45,#4A3157)',
  'linear-gradient(150deg,#3A2B45,#5A3140)',
  'linear-gradient(150deg,#25384A,#3F5570)',
  'linear-gradient(150deg,#43302A,#6B4433)',
  'linear-gradient(150deg,#2C3F35,#47654F)',
  'linear-gradient(150deg,#332A46,#4E3A63)',
]

const COLS = 6
const PER_COL = 7

function Tile({ src, i }: { src: string; i: number }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="as-tile" style={{ background: FALLBACKS[i % FALLBACKS.length] }}>
      {!failed && (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
    </div>
  )
}

export function AuthShowcase() {
  // Répartition déterministe (pas de Math.random : évite un écart SSR/client)
  const columns = useMemo(() => {
    return Array.from({ length: COLS }, (_, c) =>
      Array.from({ length: PER_COL }, (_, r) => POOL[(c * PER_COL + r * 3) % POOL.length])
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
        .as-root {
          position: relative;
          overflow: hidden;
          background: #0A0A14;
          border-radius: 22px;
          isolation: isolate;
          height: 100%;
        }
        .as-wall {
          position: absolute;
          inset: -20% -10%;
          display: grid;
          grid-template-columns: repeat(${COLS}, 1fr);
          gap: 10px;
          transform: rotate(-8deg);
          transform-origin: center;
          opacity: 0.5;
        }
        .as-col {
          display: flex;
          flex-direction: column;
          gap: 10px;
          will-change: transform;
        }
        .as-col-0 { animation: as-drift 60s linear infinite; }
        .as-col-1 { animation: as-drift 78s linear infinite; animation-delay: -20s; }
        .as-col-2 { animation: as-drift 68s linear infinite; animation-delay: -40s; }
        @keyframes as-drift {
          from { transform: translateY(0); }
          to   { transform: translateY(-50%); }
        }
        .as-tile {
          aspect-ratio: 63 / 88;
          border-radius: 6px;
          overflow: hidden;
          flex: 0 0 auto;
          box-shadow: 0 6px 16px rgba(0,0,0,0.45);
        }
        .as-veil {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(0deg, rgba(10,10,20,0.97) 0%, rgba(10,10,20,0.9) 26%, rgba(10,10,20,0.42) 55%, rgba(10,10,20,0.12) 100%),
            radial-gradient(90% 60% at 50% 0%, rgba(10,10,20,0.55) 0%, transparent 70%);
          pointer-events: none;
        }
        .as-content {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          padding: 40px 42px 40px;
          color: #fff;
        }
        .as-kicker {
          display: flex; align-items: center; gap: 10px;
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
          margin: 0 0 26px;
          font-family: var(--font-sora, system-ui);
          font-size: clamp(26px, 2.4vw, 36px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.08;
          text-shadow: 0 2px 30px rgba(0,0,0,0.7);
          animation: as-rise .8s cubic-bezier(.2,.85,.3,1) both .18s;
        }
        .as-stats {
          display: flex;
          gap: 28px;
          flex-wrap: wrap;
          padding-top: 20px;
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
        /* Écrans courts : on allège pour que les preuves restent visibles */
        @media (max-height: 760px) {
          .as-content { padding: 28px 32px 28px; }
          .as-title { margin-bottom: 18px; }
          .as-stats { gap: 22px; padding-top: 15px; }
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
