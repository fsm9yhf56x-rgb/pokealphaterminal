'use client'

import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { groupSetsByEra, filterCoreSets, formatJPSetName } from '@/lib/setGroups'
import type { TCGSet } from '@/lib/tcgApi'

type SetLite = { id: string; name: string; count?: number }
type Lang = 'EN' | 'FR' | 'JP'

interface Props {
  open: boolean
  sets: SetLite[]
  current: string                        // filSet ('all' ou un id)
  lang: Lang
  totalCount?: number                    // nombre total de cartes (option "Toutes")
  logos?: Record<string, string>         // setId -> URL logo (optionnel)
  onSelect: (setId: string) => void
  onClose: () => void
}

/**
 * SetPicker — sélecteur de série, GRILLE VISUELLE (desktop + mobile).
 *
 * Remplaçait déjà la rangée de 200+ sets sur mobile ; il est désormais monté
 * sur desktop aussi et rendu en grille : le carrousel à flèches demandait une
 * trentaine de clics pour atteindre une série, ici c'est recherche + 1 clic.
 *
 * GRILLE HYBRIDE (décision produit) : logo quand il existe, sinon tuile
 * typographique. TCGdex ne fournit AUCUN logo japonais (vérifié : 0/177) et
 * seulement ~167 logos sur 647 sets — une grille de logos aurait été trouée.
 * Une tuile texte bien dessinée n'est pas un pis-aller : l'ensemble reste
 * lisible et homogène, les logos l'enrichissent sans le fragmenter.
 *
 * Rendu via portal sur <body> (échappe au header qui a un backdrop-filter).
 */
export function SetPicker({ open, sets, current, lang, totalCount, logos, onSelect, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const [q, setQ] = useState('')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Reset la recherche a chaque ouverture
  useEffect(() => { if (open) setQ('') }, [open])

  const groups = useMemo(() => {
    const tcgSets: TCGSet[] = sets.map(s => ({ id: s.id, name: s.name, lang: 'EN' as any, total: s.count } as TCGSet))
    const g = groupSetsByEra(filterCoreSets(tcgSets))
    const needle = q.trim().toLowerCase()
    if (!needle) return g
    return g
      .map(grp => ({
        ...grp,
        sets: grp.sets.filter(set => {
          const orig = sets.find(o => o.id === set.id)
          const display = lang === 'JP' && orig
            ? formatJPSetName({ id: orig.id, name: orig.name, lang: 'JP' as any } as any,
                sets.map(x => ({ id: x.id, name: x.name, lang: 'EN' as any, total: x.count } as TCGSet)))
            : (orig?.name ?? set.id)
          return display.toLowerCase().includes(needle) || set.id.toLowerCase().includes(needle)
        }),
      }))
      .filter(grp => grp.sets.length > 0)
  }, [sets, q, lang])

  const totalShown = useMemo(() => groups.reduce((n, g) => n + g.sets.length, 0), [groups])

  if (!mounted || !open) return null

  const pick = (id: string) => { onSelect(id); onClose() }

  return createPortal(
    <>
      <style>{`
        .ksp-overlay {
          position: fixed; inset: 0; z-index: 2147483000;
          background: rgba(20,20,28,0.34);
          backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
          animation: kspFade .2s ease both;
        }
        @keyframes kspFade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes kspRise { from { opacity: 0; transform: translateY(14px) scale(.985) } to { opacity: 1; transform: none } }

        .ksp-panel {
          position: fixed; z-index: 2147483001;
          left: 0; right: 0; top: 50%; transform: translateY(-50%);
          width: min(920px, calc(100vw - 48px)); margin-inline: auto;
          max-height: min(760px, calc(100vh - 80px));
          display: flex; flex-direction: column;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);
          border: 0.5px solid rgba(255,255,255,0.9);
          border-radius: 22px;
          box-shadow: 0 30px 80px rgba(16,20,38,0.24), 0 4px 14px rgba(0,0,0,0.07);
          animation: kspRise .3s cubic-bezier(.2,.85,.3,1) both;
          overflow: hidden;
        }
        /* Mobile : plein écran, le drawer d'origine */
        @media (max-width: 700px) {
          .ksp-panel {
            left: 0; right: 0; top: auto; bottom: 0; transform: none;
            width: 100%; max-width: 100%; max-height: 88vh;
            border-radius: 20px 20px 0 0;
          }
        }

        .ksp-head { padding: 20px 22px 14px; border-bottom: 0.5px solid rgba(0,0,0,0.06); flex-shrink: 0; }
        .ksp-title {
          margin: 0 0 12px; font-size: 17px; font-weight: 700; color: #1D1D1F;
          font-family: var(--font-sora,Sora,sans-serif); letter-spacing: -0.02em;
          display: flex; align-items: baseline; gap: 9px;
        }
        .ksp-title span { font-size: 12px; font-weight: 500; color: #AEAEB2; font-family: var(--font-mono,monospace); }
        .ksp-search {
          width: 100%; box-sizing: border-box; height: 42px; padding: 0 14px;
          border: 1px solid rgba(0,0,0,0.08); border-radius: 11px;
          background: rgba(245,245,247,0.7); font-size: 14px; color: #1D1D1F;
          outline: none; font-family: var(--font-dm,"DM Sans",sans-serif);
          transition: border-color .15s, background .15s;
        }
        .ksp-search:focus { border-color: rgba(224,48,32,0.35); background: #fff; }

        .ksp-list { overflow-y: auto; padding: 6px 16px 20px; flex: 1; overscroll-behavior: contain; }
        .ksp-era {
          font-size: 10px; font-weight: 700; color: #AEAEB2; text-transform: uppercase;
          letter-spacing: .13em; font-family: var(--font-sora,Sora,sans-serif);
          padding: 18px 6px 9px; position: sticky; top: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.97) 70%, rgba(255,255,255,0));
          z-index: 1;
        }

        /* LA GRILLE : auto-fill = 2 colonnes sur mobile, 4-5 sur desktop */
        .ksp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(158px, 1fr)); gap: 8px; }

        .ksp-tile {
          display: flex; flex-direction: column; align-items: flex-start; justify-content: space-between;
          gap: 8px; min-height: 78px; padding: 11px 12px;
          border: 1px solid rgba(0,0,0,0.06); border-radius: 13px;
          background: rgba(255,255,255,0.6); cursor: pointer; text-align: left;
          font-family: var(--font-sora,Sora,sans-serif);
          transition: transform .16s cubic-bezier(.2,.85,.3,1), box-shadow .16s ease, border-color .16s ease;
        }
        .ksp-tile:hover {
          transform: translateY(-2px); border-color: rgba(0,0,0,0.12);
          box-shadow: 0 6px 16px rgba(0,0,0,0.07);
        }
        .ksp-tile.on { border-color: rgba(224,48,32,0.4); background: rgba(224,48,32,0.05); }
        .ksp-logo { height: 26px; max-width: 100%; object-fit: contain; object-position: left center; }
        .ksp-name {
          font-size: 12.5px; font-weight: 600; color: #1D1D1F; line-height: 1.3;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .ksp-foot { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 6px; }
        .ksp-count { font-size: 11px; color: #AEAEB2; font-family: var(--font-mono,monospace); }
        .ksp-check { color: #E03020; font-weight: 700; font-size: 12px; }

        .ksp-all {
          width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;
          padding: 13px 14px; border-radius: 13px; border: 1px solid rgba(0,0,0,0.06);
          background: rgba(245,245,247,0.7); margin: 10px 0 4px;
          font-size: 14.5px; font-weight: 600; color: #1D1D1F; cursor: pointer;
          font-family: var(--font-sora,Sora,sans-serif); transition: background .15s, border-color .15s;
        }
        .ksp-all:hover { background: rgba(245,245,247,1); }
        .ksp-all.on { background: rgba(224,48,32,0.07); border-color: rgba(224,48,32,0.25); }
        .ksp-empty { text-align: center; color: #AEAEB2; font-size: 14px; padding: 44px 20px; font-family: var(--font-dm,"DM Sans",sans-serif); }

        .ksp-close {
          position: absolute; top: 16px; right: 16px; width: 30px; height: 30px;
          border-radius: 50%; border: none; background: rgba(0,0,0,0.04);
          color: #6E6E73; font-size: 16px; cursor: pointer; line-height: 1;
          display: flex; align-items: center; justify-content: center; transition: background .15s;
        }
        .ksp-close:hover { background: rgba(0,0,0,0.08); }
      `}</style>

      <div className="ksp-overlay" onClick={onClose} />
      <div className="ksp-panel" role="dialog" aria-label="Choisir une série">
        <button className="ksp-close" onClick={onClose} aria-label="Fermer">×</button>

        <div className="ksp-head">
          <p className="ksp-title">
            Choisir une série
            <span>{totalShown} {totalShown > 1 ? 'séries' : 'série'}</span>
            {current !== 'all' && (
              <button onClick={() => pick('all')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#E03020', fontFamily: 'var(--font-sora,Sora,sans-serif)', padding: 0 }}>
                Tout afficher
              </button>
            )}
          </p>
          <input
            className="ksp-search"
            placeholder="Rechercher une série…"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
          />
        </div>

        <div className="ksp-list">
          {groups.length === 0 && <div className="ksp-empty">Aucune série trouvée</div>}

          {groups.map(g => (
            <div key={g.label}>
              <div className="ksp-era">{g.label}</div>
              <div className="ksp-grid">
                {g.sets.map(set => {
                  const orig = sets.find(o => o.id === set.id)
                  if (!orig) return null
                  const display = lang === 'JP'
                    ? formatJPSetName({ id: orig.id, name: orig.name, lang: 'JP' as any } as any,
                        sets.map(x => ({ id: x.id, name: x.name, lang: 'EN' as any, total: x.count } as TCGSet)))
                    : orig.name
                  const parentId = orig.id.replace(/-1st$|-shadowless$|-shadowless-ns$/, '')
                  const logo = logos?.[orig.id] || logos?.[parentId]
                  const isOn = current === orig.id
                  return (
                    <button
                      key={orig.id}
                      className={`ksp-tile${isOn ? ' on' : ''}`}
                      onClick={() => pick(orig.id)}
                      title={display}
                    >
                      {logo
                        ? <img className="ksp-logo" src={logo} alt="" loading="lazy"
                            onError={e => { const t = e.target as HTMLImageElement; t.style.display = 'none' }} />
                        : <div className="ksp-name">{display}</div>}
                      <div className="ksp-foot">
                        {logo && <span className="ksp-count" style={{ fontFamily: 'var(--font-sora,Sora,sans-serif)', color: '#6E6E73', fontWeight: 600, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{display}</span>}
                        {!logo && <span className="ksp-count">{orig.count ?? ''}</span>}
                        {isOn && <span className="ksp-check">✓</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
