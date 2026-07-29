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
 * Pepite en rotation quotidienne deterministe, reliee a la collection quand
 * pertinent ("X dans ta collection").
 *
 * COMPACT par principe : c'est une anecdote, donc un detail. Elle se lit d'un
 * coup d'oeil et le texte occupe toute la largeur — un bloc haut avec du vide
 * a droite donnait a un aparte l'importance d'une affiche.
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

      <span className="cd-rule" aria-hidden />

      <div className="cd-body">
        <div className="cd-head">
          <span className="cd-eyebrow">{item.eyebrow}</span>
          <span className="cd-sep" aria-hidden />
          <h3 className="cd-title">{item.title}</h3>
          <span className="cd-kind">{kindLabel}</span>
          {ownedCount > 0 && (
            <span className="cd-owned">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              {ownedCount} dans ta collection
            </span>
          )}
        </div>
        <p className="cd-text">{item.text}</p>
      </div>

      <svg className="cd-arrow" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <style>{`
        .cd-root {
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 16px;
          width: 100%; text-align: left; cursor: pointer;
          padding: 15px 18px 15px 22px;
          border-radius: ${RADIUS.lg};
          background: linear-gradient(135deg, color-mix(in srgb, var(--acc) 7%, rgba(255,255,255,.78)), rgba(255,255,255,.6));
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 1px 3px rgba(20,20,40,.04), 0 8px 24px rgba(20,20,40,.05);
          backdrop-filter: blur(18px) saturate(175%);
          -webkit-backdrop-filter: blur(18px) saturate(175%);
          transition: transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s ease;
          animation: cdIn .55s cubic-bezier(.2,.85,.3,1) both;
        }
        .cd-root:hover {
          transform: translateY(-2px);
          box-shadow: 0 2px 5px rgba(20,20,40,.05), 0 14px 34px rgba(20,20,40,.09);
        }

        /* Filet vertical : l'unique aplat de couleur */
        .cd-rule {
          position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, var(--acc), color-mix(in srgb, var(--acc) 50%, transparent));
          transition: top .22s cubic-bezier(.2,.85,.3,1), bottom .22s cubic-bezier(.2,.85,.3,1);
        }
        .cd-root:hover .cd-rule { top: 0; bottom: 0; }

        .cd-body { flex: 1; min-width: 0; }

        /* Tout l'en-tete sur UNE ligne : l'anecdote reste un aparte */
        .cd-head {
          display: flex; align-items: baseline; gap: 9px; flex-wrap: wrap;
          margin-bottom: 5px;
        }
        .cd-eyebrow {
          font-family: ${FONT.display}; font-size: 9.5px; font-weight: 800;
          letter-spacing: .13em; text-transform: uppercase; color: var(--acc);
          flex-shrink: 0;
        }
        .cd-sep { width: 3px; height: 3px; border-radius: 50%; background: ${SNOW.mutedLight}; align-self: center; flex-shrink: 0; }
        .cd-title {
          margin: 0; font-family: ${FONT.display};
          font-size: 15.5px; font-weight: 700; letter-spacing: -.02em; color: ${SNOW.ink};
        }
        .cd-kind {
          font-family: ${FONT.body}; font-size: 9px; font-weight: 700;
          letter-spacing: .06em; text-transform: uppercase; color: ${SNOW.mutedLight};
          padding: 2px 7px; border-radius: 999px; background: rgba(0,0,0,.045);
          flex-shrink: 0;
        }
        .cd-owned {
          display: inline-flex; align-items: center; gap: 4px;
          font-family: ${FONT.body}; font-size: 9.5px; font-weight: 700; color: #B8860B;
          padding: 2px 8px; border-radius: 999px;
          background: rgba(212,175,55,.14); border: 1px solid rgba(212,175,55,.3);
          flex-shrink: 0;
        }
        .cd-owned svg { width: 10px; height: 10px; }

        /* Le texte occupe TOUTE la largeur : plus de vide a droite */
        .cd-text {
          margin: 0; max-width: none;
          font-family: ${FONT.body}; font-size: 13px; line-height: 1.55; color: ${SNOW.muted};
        }

        .cd-arrow {
          width: 16px; height: 16px; flex-shrink: 0;
          color: ${SNOW.mutedLight};
          transition: transform .22s cubic-bezier(.2,.8,.2,1), color .22s ease;
        }
        .cd-root:hover .cd-arrow { transform: translateX(3px); color: var(--acc); }

        @keyframes cdIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

        @media (max-width: 640px) {
          .cd-root { padding: 13px 14px 13px 18px; gap: 11px; }
          .cd-title { font-size: 14.5px; }
          .cd-text { font-size: 12.5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cd-root { animation: none !important; }
          .cd-root, .cd-rule, .cd-arrow { transition: none !important; }
        }
      `}</style>
    </button>
  )
}

export default HubCultureDaily
