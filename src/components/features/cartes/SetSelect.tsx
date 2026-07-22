'use client'

import { useState, useRef, useEffect, useMemo } from 'react'

type SetLite = { id: string; name: string; count?: number }

interface Props {
  sets: SetLite[]
  value: string                                   // 'all' ou un setId
  onChange: (setId: string) => void
  /** setId -> libellé de bloc (dérivé de allCards, même source que la vue "Par blocs") */
  blocOf: (setId: string) => string
  /** ordre des blocs (ERA_ORDER de l'Encyclopédie) */
  blocOrder: string[]
  /** setId -> URL de logo */
  logos?: Record<string, string>
  /** setId -> date de sortie ISO (pour l'ordre chronologique) */
  dates?: Record<string, string>
  /** nom affiché (formatJPSetName en JP) */
  displayName?: (set: SetLite) => string
  disabled?: boolean
}

/**
 * SetSelect — sélection de série EN UN CLIC, dans la page.
 *
 * Remplace successivement : le carrousel à flèches (~30 clics pour atteindre
 * une série, et seulement ~30 sets codés en dur sur 202), le <select> natif
 * (illisible à 202 entrées, aucun visuel) et le SetPicker modal (un clic de
 * plus + masque la page).
 *
 * Ici : un champ de la même facture que ses voisins (Blocs, Raretés), et au
 * clic un panneau flottant sous lui — recherche + grille de logos groupée par
 * bloc. Ouvrir, choisir : deux interactions pour n'importe laquelle des 202.
 *
 * GRILLE HYBRIDE : logo quand il existe, sinon le nom en typo. TCGdex ne
 * fournit AUCUN logo japonais (0/177 vérifié) et ~167 sur 647 sets au total —
 * une grille de logos seule aurait été trouée. Les variantes (Éd1, Shadowless)
 * héritent du logo de leur set parent.
 */
export function SetSelect({ sets, value, onChange, blocOf, blocOrder, logos, dates, displayName, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const label = (s: SetLite) => (displayName ? displayName(s) : s.name)
  const logoOf = (id: string) => logos?.[id] || logos?.[id.replace(/-1st$|-shadowless$|-shadowless-ns$/, '')]

  // Fermeture au clic extérieur + Échap
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [open])

  useEffect(() => { if (open) { setQ(''); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])

  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

  const groups = useMemo(() => {
    const needle = norm(q.trim())
    const kept = needle
      ? sets.filter(s => norm(label(s)).includes(needle) || norm(s.id).includes(needle))
      : sets
    const byBloc = new Map<string, SetLite[]>()
    for (const s of kept) {
      const b = blocOf(s.id) || 'Autre'
      if (!byBloc.has(b)) byBloc.set(b, [])
      byBloc.get(b)!.push(s)
    }
    // Chronologique DANS chaque bloc : l'ordre du catalogue est alphabetique
    // (Aquapolis avant Set de Base), ce qui n'a aucun sens pour un collectionneur.
    // sets[] arrive deja trie par sortie -> on garde cet ordre d'origine.
    // Cle de tri : (parent, variante). Le parent porte sa date si elle existe,
    // sinon son rang dans le catalogue ; la variante suit immediatement.
    // Ordre canonique des sets sans date (TCGdex n'en fournit quasi aucune :
    // 1 set FR sur 9). Ces sets sont figes depuis 1999, la liste ne bougera pas.
    const CANON = ['base1','base2','base3','base4','base5','base6','gym1','gym2',
      'neo1','neo2','neo3','neo4','ecard1','ecard2','ecard3','si1','ex1','ex2','ex3']
    const canonRank = (id: string) => { const i = CANON.indexOf(id); return i < 0 ? 999 : i }
    const parentOf = (id: string) => id.replace(/-1st$|-shadowless$|-shadowless-ns$/, '')
    const isVariant = (id: string) => id !== parentOf(id)
    const rank = new Map(sets.map((s, i) => [s.id, i]))
    for (const arr of byBloc.values()) {
      arr.sort((a, b) => {
        const pa = parentOf(a.id), pb = parentOf(b.id)
        if (pa !== pb) {
          const da = dates?.[pa] || '', db = dates?.[pb] || ''
          if (da && db && da !== db) return da.localeCompare(db)
          const ca = canonRank(pa), cb = canonRank(pb)
          if (ca !== cb) return ca - cb
          return (rank.get(pa) ?? rank.get(a.id) ?? 0) - (rank.get(pb) ?? rank.get(b.id) ?? 0)
        }
        // meme parent : le set de base d'abord, ses variantes ensuite
        return (isVariant(a.id) ? 1 : 0) - (isVariant(b.id) ? 1 : 0)
      })
    }
    return [...byBloc.keys()]
      .sort((a, b) => {
        const ia = blocOrder.indexOf(a), ib = blocOrder.indexOf(b)
        return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
      })
      .map(b => ({ bloc: b, list: byBloc.get(b)! }))
  }, [sets, q, blocOf, blocOrder, displayName, dates])

  const shown = groups.reduce((n, g) => n + g.list.length, 0)
  const current = value === 'all' ? null : sets.find(s => s.id === value)

  const pick = (id: string) => { onChange(id); setOpen(false) }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <style>{`
        @keyframes kssIn { 0% { opacity: 0; transform: translateY(-10px) scale(.955) } 68% { opacity: 1; transform: translateY(1px) scale(1.005) } 100% { opacity: 1; transform: none } }
        @keyframes kssRow { from { opacity: 0; transform: translateY(6px); filter: blur(4px) } to { opacity: 1; transform: none; filter: blur(0) } }
        @keyframes kssTip { from { opacity: 0; transform: translateY(-3px) rotate(45deg) } to { opacity: 1; transform: translateY(0) rotate(45deg) } }
        .kss-panel {
          position: absolute; top: calc(100% + 7px); left: 0; z-index: 60;
          width: min(880px, calc(100vw - 40px));
          background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(250,250,253,0.95));
          backdrop-filter: blur(40px) saturate(200%); -webkit-backdrop-filter: blur(40px) saturate(200%);
          border: 0.5px solid rgba(255,255,255,0.85); border-radius: 18px;
          box-shadow: 0 20px 50px rgba(16,20,38,0.15), 0 3px 10px rgba(16,20,38,0.05), inset 0 1px 0 rgba(255,255,255,0.95);
          transform-origin: 28px top;
          animation: kssIn .32s cubic-bezier(.16,1.2,.3,1) both;
          display: flex; flex-direction: column; max-height: 520px; overflow: hidden;
        }
        /* La pointe : le panneau vient DU bouton, physiquement */
        .kss-tip {
          position: absolute; top: calc(100% + 2px); left: 22px; width: 14px; height: 14px;
          background: rgba(243,243,246,0.97); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-left: 0.5px solid rgba(255,255,255,0.9);
          border-top: 0.5px solid rgba(255,255,255,0.9);
          transform: rotate(45deg); border-radius: 3px 0 0 0; z-index: 61;
          animation: kssTip .26s cubic-bezier(.16,1.1,.3,1) both; pointer-events: none;
        }
        .kss-search {
          width: 100%; height: 38px; padding: 0 14px 0 38px; box-sizing: border-box;
          border: 0.5px solid rgba(255,255,255,0.9); border-radius: 99px; background: rgba(255,255,255,0.95); backdrop-filter: blur(14px) saturate(180%); -webkit-backdrop-filter: blur(14px) saturate(180%); box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
          font-size: 13px; color: #1D1D1F; outline: none;
          font-family: var(--font-dm,"DM Sans",sans-serif); transition: all .16s cubic-bezier(.2,.85,.3,1);
        }
        .kss-searchwrap { position: relative; padding: 12px 14px; background: rgba(243,243,246,0.92); backdrop-filter: blur(16px) saturate(180%); -webkit-backdrop-filter: blur(16px) saturate(180%); border-bottom: 0.5px solid rgba(255,255,255,0.7); border-radius: 17px 17px 0 0; }
        .kss-loupe { position: absolute; left: 26px; top: 50%; transform: translateY(-50%); pointer-events: none; opacity: .38; }
        .kss-search:focus { border-color: rgba(224,48,32,0.45); box-shadow: 0 0 0 3px rgba(224,48,32,0.08), inset 0 1px 2px rgba(0,0,0,0.02); background: rgba(255,255,255,0.92); box-shadow: inset 0 1px 2px rgba(0,0,0,0.03), 0 2px 10px rgba(224,48,32,0.07); }
        .kss-body { overflow-y: auto; padding: 2px 10px 12px; overscroll-behavior: contain; }
        .kss-bloc {
          font-size: 10px; font-weight: 700; color: #1D1D1F; text-transform: uppercase;
          letter-spacing: .1em; font-family: var(--font-sora,Sora,sans-serif); opacity: .38;
          padding: 16px 6px 8px; position: sticky; top: 0;
          background: linear-gradient(180deg, rgba(253,253,255,0.99) 76%, rgba(253,253,255,0)); z-index: 1;
        }
        .kss-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(232px, 1fr)); gap: 3px; }
        .kss-tile {
          display: flex; flex-direction: row; align-items: center;
          gap: 11px; min-height: 46px; padding: 8px 12px; text-align: left;
          border: 0.5px solid rgba(255,255,255,0.7); border-radius: 11px; background: rgba(255,255,255,0.96); backdrop-filter: blur(10px) saturate(160%); -webkit-backdrop-filter: blur(10px) saturate(160%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
          cursor: pointer; font-family: var(--font-sora,Sora,sans-serif);
          transition: transform .16s cubic-bezier(.2,.85,.3,1), border-color .16s, box-shadow .16s, background .16s;
          animation: kssRow .4s cubic-bezier(.2,.85,.3,1) backwards;
        }
        .kss-tile:hover { border-color: rgba(0,0,0,0.10); background: rgba(255,255,255,1); box-shadow: 0 5px 14px rgba(16,20,38,0.08), inset 0 1px 0 rgba(255,255,255,1); transform: translateY(-1px); }
        .kss-tile.on { border-color: #E03020; background: rgba(224,48,32,0.05); box-shadow: 0 2px 8px rgba(224,48,32,0.12); }
        .kss-tile:active { transform: scale(.985) }
        .kss-tile:hover .kss-logo { transform: scale(1.07) }
        @media (prefers-reduced-motion: reduce) { .kss-panel, .kss-tip, .kss-tile { animation: none !important } }
        .kss-logo { transition: transform .18s cubic-bezier(.2,.85,.3,1); height: 18px; width: 44px; flex-shrink: 0; object-fit: contain; object-position: center; padding: 4px 5px; border-radius: 7px; background: rgba(245,245,247,0.7); box-sizing: content-box; }
        .kss-nologo { width: 54px; height: 26px; flex-shrink: 0; border-radius: 4px; background: rgba(0,0,0,0.05); }
        .kss-name { font-size: 13px; font-weight: 600; color: #1D1D1F; line-height: 1.3; letter-spacing: -0.011em; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kss-sub { font-size: 10px; font-weight: 500; color: #AEAEB2; font-family: var(--font-sora,Sora,sans-serif); flex-shrink: 0; letter-spacing: 0; }
        .kss-empty { text-align: center; color: #AEAEB2; font-size: 13px; padding: 28px 10px; font-family: var(--font-dm,"DM Sans",sans-serif); }
        .kss-head { display: flex; align-items: center; justify-content: space-between; padding: 0 12px 8px; }
        .kss-clear { background: none; border: none; cursor: pointer; font-size: 11.5px; font-weight: 600; color: #E03020; font-family: var(--font-sora,Sora,sans-serif); padding: 0; }
        @media (max-width: 767px) { .kss-panel { width: calc(100vw - 32px); left: 0; } }
      `}</style>

      <button
        type="button"
        className="fsel"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth: 200, maxWidth: 260,
          color: current ? '#1D1D1F' : '#AAA',
          background: open ? 'rgba(243,243,246,0.95)' : (current ? 'rgba(224,48,32,0.04)' : undefined),
          borderColor: open ? '#E5E5EA' : (current ? 'rgba(224,48,32,0.35)' : undefined),
          boxShadow: open ? '0 2px 8px rgba(16,20,38,0.06)' : undefined,
          transition: 'background .18s, border-color .18s, box-shadow .18s',
        }}
      >
        {current && logoOf(current.id) && (
          <img src={logoOf(current.id)} alt="" style={{ height: 16, maxWidth: 46, objectFit: 'contain' }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current ? label(current) : `Toutes les séries${sets.length ? ` (${sets.length})` : ''}`}
        </span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (<>
        <span className="kss-tip" aria-hidden />
        <div className="kss-panel">
          <div className="kss-searchwrap">
            <svg className="kss-loupe" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D1D1F" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input ref={inputRef} className="kss-search" placeholder="Rechercher une série…"
              value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="kss-head">
            <span style={{ fontSize: 10.5, fontWeight: 500, color: '#AEAEB2', fontFamily: 'var(--font-sora,Sora,sans-serif)' }}>{shown} série{shown > 1 ? 's' : ''}</span>
            {value !== 'all' && <button className="kss-clear" onClick={() => pick('all')}>Tout afficher</button>}
          </div>
          <div className="kss-body">
            {shown === 0 && <div className="kss-empty">Aucune série trouvée</div>}
            {groups.map(g => (
              <div key={g.bloc}>
                <div className="kss-bloc">{g.bloc}</div>
                <div className="kss-grid">
                  {g.list.map((s, ri) => {
                    const logo = logoOf(s.id)
                    const nm = label(s)
                    const on = value === s.id
                    return (
                      <button key={s.id} className={`kss-tile${on ? ' on' : ''}`} onClick={() => pick(s.id)} title={nm} style={{ animationDelay: Math.min(0.04 + ri * 0.012, 0.32) + 's' }}>
                        {logo
                          ? <img className="kss-logo" src={logo} alt="" loading="lazy"
                              onError={e => { const t = e.target as HTMLImageElement; t.style.visibility = 'hidden' }} />
                          : <span className="kss-nologo" />}
                        <span className="kss-name">{nm}</span>
                        <span className="kss-sub">{s.count ?? ''}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>)}
    </div>
  )
}
