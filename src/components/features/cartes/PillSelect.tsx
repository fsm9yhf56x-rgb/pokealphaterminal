'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  options: string[]                 // libellés proposés
  value: string                     // 'all' ou un libellé (mode simple)
  onChange: (v: string) => void
  /** mode multi-sélection (raretés) : plusieurs valeurs cumulables */
  multi?: boolean
  values?: string[]
  onChangeMulti?: (v: string[]) => void
  allLabel?: string
  disabled?: boolean
  minWidth?: number
}

/**
 * PillSelect — sélecteur léger, même matière que SetSelect.
 *
 * Le <select> natif jurait à côté : menu système bleu, typo OS, aucun lien
 * avec le verre du reste. Ici la même DA (verre dense, bordure blanche,
 * accent Kodo) mais SANS recherche ni grille : 11 blocs, une liste suffit.
 */
export function PillSelect({ options, value, onChange, multi, values = [], onChangeMulti, allLabel = 'Tous', disabled, minWidth = 170 }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

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

  // Multi : le panneau RESTE ouvert (on cumule), simple : il se ferme.
  const pick = (v: string) => {
    if (multi) {
      if (v === 'all') { onChangeMulti?.([]); setOpen(false); return }
      onChangeMulti?.(values.includes(v) ? values.filter(x => x !== v) : [...values, v])
      return
    }
    onChange(v); setOpen(false)
  }
  const active = multi ? values.length > 0 : value !== 'all'
  const btnLabel = multi
    ? (values.length === 0 ? allLabel : values.length === 1 ? values[0] : `${values.length} raretés`)
    : (value !== 'all' ? value : allLabel)
  const isOn = (v: string) => (multi ? values.includes(v) : value === v)

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <style>{`
        @keyframes kpsIn { 0% { opacity: 0; transform: translateY(-8px) scale(.955) } 68% { opacity: 1; transform: translateY(1px) scale(1.006) } 100% { opacity: 1; transform: none } }
        @keyframes kpsRow { from { opacity: 0; transform: translateY(5px); filter: blur(3px) } to { opacity: 1; transform: none; filter: blur(0) } }
        @keyframes kpsTip { from { opacity: 0; transform: translateY(-4px) rotate(45deg) } to { opacity: 1; transform: rotate(45deg) } }
        .kps-panel {
          position: absolute; top: calc(100% + 7px); left: 0; z-index: 60;
          min-width: 100%; width: max-content; max-width: 420px; max-height: 320px; overflow-y: auto;
          padding: 6px;
          background: linear-gradient(180deg, rgba(255,255,255,0.97), rgba(250,250,253,0.95));
          backdrop-filter: blur(36px) saturate(190%); -webkit-backdrop-filter: blur(36px) saturate(190%);
          border: 0.5px solid rgba(255,255,255,0.85); border-radius: 14px;
          box-shadow: 0 16px 40px rgba(16,20,38,0.14), 0 3px 8px rgba(16,20,38,0.05), inset 0 1px 0 rgba(255,255,255,0.95);
          transform-origin: 24px top;
          animation: kpsIn .3s cubic-bezier(.16,1.2,.3,1) both;
        }
        .kps-tip {
          position: absolute; top: calc(100% + 2px); left: 22px; width: 12px; height: 12px;
          background: rgba(255,255,255,0.97); border-left: 0.5px solid rgba(255,255,255,0.9);
          border-top: 0.5px solid rgba(255,255,255,0.9);
          transform: rotate(45deg); border-radius: 3px 0 0 0; z-index: 61; pointer-events: none;
          animation: kpsTip .3s cubic-bezier(.16,1.2,.3,1) .04s both;
          box-shadow: -2px -2px 5px rgba(16,20,38,0.03);
        }
        .kps-item {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          width: 100%; box-sizing: border-box; padding: 8px 10px; border: none; border-radius: 8px;
          background: transparent; cursor: pointer; text-align: left;
          font-family: var(--font-sora,Sora,sans-serif); font-size: 12.5px; font-weight: 500; color: #1D1D1F;
          transition: background .13s, transform .13s cubic-bezier(.2,.85,.3,1);
          animation: kpsRow .34s cubic-bezier(.2,.85,.3,1) backwards;
        }
        .kps-item:hover { background: rgba(0,0,0,0.05); transform: translateX(2px); }
        .kps-item:active { transform: scale(.985); }
        @media (prefers-reduced-motion: reduce) { .kps-panel, .kps-tip, .kps-item { animation: none !important } }
        .kps-item.on { background: rgba(224,48,32,0.08); color: #1D1D1F; font-weight: 600; box-shadow: inset 2px 0 0 #E03020; }
        .kps-sep { height: 0.5px; background: rgba(0,0,0,0.06); margin: 5px 6px; }
        .kps-grid { display: grid; grid-template-columns: repeat(2, minmax(150px, 1fr)); gap: 2px; }
      `}</style>

      <button
        type="button"
        className="fsel"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, minWidth, maxWidth: 240,
          color: active ? '#1D1D1F' : '#AAA',
          background: open ? 'rgba(243,243,246,0.95)' : (active ? 'rgba(224,48,32,0.04)' : undefined),
          borderColor: open ? 'rgba(0,0,0,0.10)' : (active ? 'rgba(224,48,32,0.35)' : undefined),
          transition: 'background .18s, border-color .18s',
        }}
      >
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {btnLabel}
        </span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, opacity: 0.45, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (<>
        <span className="kps-tip" aria-hidden />
        <div className="kps-panel">
          <button className={`kps-item${!active ? ' on' : ''}`} onClick={() => pick('all')}>
            <span>{allLabel}</span>
          </button>
          <div className="kps-sep" />
          <div className="kps-grid">
            {options.map((o, i) => (
              <button key={o} className={`kps-item${isOn(o) ? ' on' : ''}`} onClick={() => pick(o)} style={{ animationDelay: (0.03 + i * 0.016) + 's' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o}</span>
                {multi && isOn(o) && <span style={{ fontWeight: 700, color: '#E03020', flexShrink: 0 }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </>)}
    </div>
  )
}
