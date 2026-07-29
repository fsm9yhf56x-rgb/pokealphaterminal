'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolio } from '@/lib/usePortfolio'
import { getCultureDaily } from '@/lib/cultureDaily'
import { deriveEra } from '@/components/features/portfolio/allocation/Allocation'
import { SNOW, FONT, RADIUS } from '@/lib/design/snow'

/**
 * Bloc "Culture du jour" du Daily Hub collectionneur.
 *
 * Pepite (anecdote / artiste / ere) en rotation quotidienne deterministe,
 * reliee a la collection quand pertinent ("X dans ta collection").
 *
 * Traitement EDITORIAL : le titre porte, le texte respire, un seul accent
 * colore. L'icone generique dans son carre a saute — c'est ce qui faisait
 * "composant de template" plutot que "rendez-vous quotidien".
 */
export function HubCultureDaily() {
  const router = useRouter()
  const { cards } = usePortfolio()
  const item = useMemo(() => getCultureDaily(), [])

  const ownedCount = useMemo(() => {
    const list = (cards ?? []) as any[]
    if (item.era) {
      return list.reduce((n, c) => n + (deriveEra(c.set_name ?? null) === item.era ? (Number(c.qty) || 1) : 0), 0)
    }
    return 0
  }, [cards, item])

  const kindLabel = item.kind === 'anecdote' ? 'Curiosité' : item.kind === 'artiste' ? 'Artiste' : 'Ère'

  return (
    <button className="cd-root" onClick={() => router.push(item.href)}
      style={{ ['--acc' as any]: item.color }}>

      {/* Halo qui respire : la couleur de la pepite donne le ton */}
      <span className="cd-halo" aria-hidden />
      {/* Filet d'accent : la seule couleur franche du bloc */}
      <span className="cd-rule" aria-hidden />
      {/* Filigrane typographique : remplit la droite sans rien inventer.
          Procede editorial classique — le mot devient de la matiere. */}
      <span className="cd-ghost" aria-hidden>{kindLabel}</span>

      <div className="cd-body">
        <div className="cd-top">
          <span className="cd-eyebrow">{item.eyebrow}</span>
          <span className="cd-kind">{kindLabel}</span>
          {ownedCount > 0 && (
            <span className="cd-owned">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ownedCount} dans ta collection
            </span>
          )}
        </div>

        <h3 className="cd-title">{item.title}</h3>
        <p className="cd-text">{item.text}</p>

        <div className="cd-foot">
          <span className="cd-cta">
            En savoir plus
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </div>
      </div>

      <style>{`
        .cd-root {
          position: relative; overflow: hidden;
          display: block; width: 100%; text-align: left; cursor: pointer;
          padding: 26px 30px 24px 34px;
          border-radius: ${RADIUS.lg};
          background: linear-gradient(135deg, rgba(255,255,255,.82), rgba(255,255,255,.58));
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 1px 3px rgba(20,20,40,.04), 0 14px 40px rgba(20,20,40,.06);
          backdrop-filter: blur(20px) saturate(180%);
          -webkit-backdrop-filter: blur(20px) saturate(180%);
          transition: transform .26s cubic-bezier(.2,.85,.3,1), box-shadow .26s ease;
          animation: cdIn .6s cubic-bezier(.2,.85,.3,1) both;
        }
        .cd-root:hover {
          transform: translateY(-3px);
          box-shadow: 0 2px 6px rgba(20,20,40,.05), 0 22px 54px rgba(20,20,40,.11);
        }

        /* Filet vertical : l'unique aplat de couleur, il signe le bloc */
        .cd-rule {
          position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 55%, transparent));
          transition: top .26s cubic-bezier(.2,.85,.3,1), bottom .26s cubic-bezier(.2,.85,.3,1);
        }
        .cd-root:hover .cd-rule { top: 0; bottom: 0; }

        .cd-halo {
          position: absolute; top: -120px; right: -90px;
          width: 300px; height: 300px; border-radius: 50%;
          background: radial-gradient(circle, color-mix(in srgb, var(--acc) 17%, transparent), transparent 68%);
          pointer-events: none;
          animation: cdBreath 7s ease-in-out infinite;
        }

        .cd-ghost {
          position: absolute; right: -14px; bottom: -26px;
          font-family: ${FONT.display};
          font-size: clamp(64px, 9vw, 108px); font-weight: 800;
          letter-spacing: -.06em; line-height: 1;
          color: var(--acc); opacity: .085;
          pointer-events: none; user-select: none; white-space: nowrap;
          transition: opacity .3s ease, transform .4s cubic-bezier(.2,.85,.3,1);
        }
        .cd-root:hover .cd-ghost { opacity: .085; transform: translateX(-6px); }
        @media (max-width: 720px) { .cd-ghost { display: none; } }

        .cd-body { position: relative; z-index: 1; }

        .cd-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
        .cd-eyebrow {
          font-family: ${FONT.display}; font-size: 10.5px; font-weight: 800;
          letter-spacing: .12em; text-transform: uppercase; color: var(--acc);
          animation: cdUp .5s cubic-bezier(.2,.85,.3,1) both .06s;
        }
        .cd-kind {
          font-family: ${FONT.body}; font-size: 9.5px; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase; color: ${SNOW.mutedLight};
          padding: 3px 8px; border-radius: 999px; background: rgba(0,0,0,.045);
          animation: cdUp .5s cubic-bezier(.2,.85,.3,1) both .1s;
        }
        .cd-owned {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: ${FONT.body}; font-size: 10.5px; font-weight: 700; color: #B8860B;
          padding: 3px 9px; border-radius: 999px;
          background: rgba(212,175,55,.14); border: 1px solid rgba(212,175,55,.3);
          animation: cdUp .5s cubic-bezier(.2,.85,.3,1) both .14s;
        }
        .cd-owned svg { width: 11px; height: 11px; }

        /* Le titre porte le bloc : c'est lui qu'on lit en diagonale */
        .cd-title {
          margin: 0 0 9px;
          font-family: ${FONT.display}; font-size: clamp(21px, 2.4vw, 27px);
          font-weight: 800; letter-spacing: -.035em; line-height: 1.1; color: ${SNOW.ink};
          animation: cdUp .55s cubic-bezier(.2,.85,.3,1) both .16s;
        }
        .cd-text {
          margin: 0; max-width: 78ch;
          font-family: ${FONT.body}; font-size: 14.5px; line-height: 1.62; color: ${SNOW.muted};
          animation: cdUp .55s cubic-bezier(.2,.85,.3,1) both .22s;
        }

        .cd-foot { display: flex; align-items: center; justify-content: flex-end; margin-top: 18px; }
        .cd-cta {
          display: inline-flex; align-items: center; gap: 7px;
          font-family: ${FONT.display}; font-size: 12.5px; font-weight: 700; color: var(--acc);
          animation: cdUp .5s cubic-bezier(.2,.85,.3,1) both .28s;
          transition: gap .22s cubic-bezier(.2,.8,.2,1);
        }
        .cd-cta svg { width: 14px; height: 14px; }
        .cd-root:hover .cd-cta { gap: 11px; }

        @keyframes cdIn    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes cdUp    { from { opacity: 0; transform: translateY(9px); }  to { opacity: 1; transform: none; } }
        @keyframes cdBreath{ 0%,100% { opacity: .85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.09); } }

        @media (max-width: 640px) {
          .cd-root { padding: 22px 20px 20px 26px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cd-root, .cd-eyebrow, .cd-kind, .cd-owned, .cd-title, .cd-text, .cd-cta, .cd-halo {
            animation: none !important;
          }
          .cd-root, .cd-rule, .cd-cta { transition: none !important; }
        }
      `}</style>
    </button>
  )
}

export default HubCultureDaily
