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
  current: string            // filSet ('all' ou un id)
  lang: Lang
  totalCount?: number        // nombre total de cartes (pour l'option "Toutes")
  onSelect: (setId: string) => void
  onClose: () => void
}

/**
 * SetPicker — sélecteur de set plein écran (mobile).
 *
 * Remplace la rangée scrollable de 200+ sets : recherche + liste groupée
 * par ère, noms complets. Rendu via portal sur <body> (échappe au header
 * qui a un backdrop-filter). Monté uniquement si open (pas de fantôme).
 */
export function SetPicker({ open, sets, current, lang, totalCount, onSelect, onClose }: Props) {
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
            ? formatJPSetName({ id: orig.id, name: orig.name, lang: 'JP' as any } as any, tcgSets)
            : orig?.name || set.id
          return display.toLowerCase().includes(needle)
        }),
      }))
      .filter(grp => grp.sets.length > 0)
  }, [sets, q, lang])

  const pick = (id: string) => { onSelect(id); onClose() }

  if (!mounted || !open) return null

  return createPortal(
    <>
      <style>{`
        .ksp-overlay {
          position: fixed; inset: 0; z-index: 2000;
          background: rgba(20,20,28,0.30);
          backdrop-filter: blur(6px) saturate(110%); -webkit-backdrop-filter: blur(6px) saturate(110%);
          animation: kspFade .28s ease;
        }
        @keyframes kspFade { from { opacity: 0; } to { opacity: 1; } }
        .ksp-panel {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 2001;
          max-height: 86vh; display: flex; flex-direction: column;
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(40px) saturate(190%); -webkit-backdrop-filter: blur(40px) saturate(190%);
          border-radius: 22px 22px 0 0;
          border-top: 0.5px solid rgba(255,255,255,0.7);
          box-shadow: 0 -16px 50px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.95);
          animation: kspUp .36s cubic-bezier(.2,.9,.25,1);
        }
        @keyframes kspUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        .ksp-grip { width: 38px; height: 4px; border-radius: 999px; background: rgba(0,0,0,0.15); margin: 10px auto 4px; flex-shrink: 0; }
        .ksp-head { padding: 6px 16px 12px; flex-shrink: 0; }
        .ksp-title { font-size: 17px; font-weight: 700; color: #1D1D1F; margin: 0 0 12px; font-family: var(--font-sora,Sora,sans-serif); letter-spacing: -0.02em; }
        .ksp-search {
          width: 100%; box-sizing: border-box; height: 44px; padding: 0 14px;
          border-radius: 12px; border: 1px solid rgba(0,0,0,0.08);
          background: rgba(245,245,247,0.8); font-size: 15px; color: #1D1D1F;
          font-family: var(--font-dm,"DM Sans",sans-serif); outline: none;
        }
        .ksp-search:focus { border-color: rgba(0,0,0,0.2); background: #fff; }
        .ksp-list { overflow-y: auto; padding: 4px 10px 24px; -webkit-overflow-scrolling: touch; }
        .ksp-era { font-size: 10px; font-weight: 700; color: #AEAEB2; text-transform: uppercase; letter-spacing: 0.14em; padding: 14px 10px 6px; font-family: var(--font-sora,Sora,sans-serif); }
        .ksp-item {
          width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;
          gap: 10px; padding: 13px 12px; border-radius: 11px; border: none; background: transparent;
          font-size: 15px; color: #1D1D1F; cursor: pointer; text-align: left;
          font-family: var(--font-dm,"DM Sans",sans-serif); transition: background .15s;
        }
        .ksp-item:active { background: rgba(0,0,0,0.05); }
        .ksp-item.on { background: rgba(224,48,32,0.08); font-weight: 600; }
        .ksp-item.on::after { content: '✓'; color: #E03020; font-weight: 700; }
        .ksp-count { font-size: 12px; color: #AEAEB2; font-family: var(--font-mono,monospace); flex-shrink: 0; }
        .ksp-all {
          width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;
          padding: 14px 12px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.06);
          background: rgba(245,245,247,0.6); margin: 8px 10px 4px; width: calc(100% - 20px);
          font-size: 15px; font-weight: 600; color: #1D1D1F; cursor: pointer;
          font-family: var(--font-sora,Sora,sans-serif);
        }
        .ksp-all.on { background: rgba(224,48,32,0.08); border-color: rgba(224,48,32,0.2); }
        .ksp-empty { text-align: center; color: #AEAEB2; font-size: 14px; padding: 40px 20px; font-family: var(--font-dm,"DM Sans",sans-serif); }
      `}</style>

      <div className="ksp-overlay" onClick={onClose} />
      <div className="ksp-panel" role="dialog" aria-label="Choisir un set">
        <div className="ksp-grip" />
        <div className="ksp-head">
          <p className="ksp-title">Choisir un set</p>
          <input
            className="ksp-search"
            placeholder="Rechercher un set…"
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
          />
        </div>
        <div className="ksp-list">
          <button className={`ksp-all${current === 'all' ? ' on' : ''}`} onClick={() => pick('all')}>
            <span>Toutes les séries</span>
            <span className="ksp-count">{totalCount ? totalCount.toLocaleString('fr-FR') : ''}</span>
          </button>

          {groups.length === 0 && <div className="ksp-empty">Aucun set trouvé</div>}

          {groups.map(g => (
            <div key={g.label}>
              <div className="ksp-era">{g.label}</div>
              {g.sets.map(set => {
                const orig = sets.find(o => o.id === set.id)
                if (!orig) return null
                const display = lang === 'JP'
                  ? formatJPSetName({ id: orig.id, name: orig.name, lang: 'JP' as any } as any,
                      sets.map(x => ({ id: x.id, name: x.name, lang: 'EN' as any, total: x.count } as TCGSet)))
                  : orig.name
                return (
                  <button
                    key={orig.id}
                    className={`ksp-item${current === orig.id ? ' on' : ''}`}
                    onClick={() => pick(orig.id)}
                  >
                    <span>{display}</span>
                    <span className="ksp-count">{orig.count ?? ''}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </>,
    document.body
  )
}
