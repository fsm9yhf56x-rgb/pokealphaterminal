'use client'
import { useState, useRef, useEffect, useMemo } from 'react'

/**
 * Menu deroulant maison — remplace le <select> natif, dont le menu systeme
 * (typo de l'OS, coins carres) rompait la matiere du produit.
 *
 * Le panneau vit DANS LE FLUX (position:absolute sous le bouton), comme le
 * SetSelect du Pokedesk. Un position:fixed + recalcul au scroll se decrochait
 * a chaque frame ; ici le panneau suit la page sans une ligne de JS.
 */

export type KodoOption = {
  value: string
  label: string
  /** URL d'illustration (logo de serie). Chaine vide = repli sur l'initiale. */
  image?: string
  /** Compte affiche a droite (nombre de cartes possedees). */
  count?: number
}

type Props = {
  value: string
  options: KodoOption[]
  onChange: (v: string) => void
  icon?: React.ReactNode
  heading?: string
  ariaLabel?: string
  maxWidth?: number
  panelWidth?: number
  searchable?: boolean
  /** Bord du bouton sur lequel le panneau s'aligne. */
  align?: 'left' | 'right'
}

const INK = '#1D1D1F'
const MUTED = '#6E6E73'
const FAINT = '#86868B'

export function KodoSelect({
  value, options, onChange, icon, heading, ariaLabel,
  maxWidth = 168, panelWidth = 268, searchable = false, align = 'left',
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  const selected = options.find(o => o.value === value)
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const shown = useMemo(() => {
    if (!query.trim()) return options
    const q = norm(query)
    return options.filter(o => norm(o.label).includes(q))
  }, [options, query])

  useEffect(() => {
    if (!open) { setQuery(''); return }
    const i = options.findIndex(o => o.value === value)
    setActive(i < 0 ? 0 : i)
    if (searchable) setTimeout(() => searchRef.current?.focus(), 40)
  }, [open, options, value, searchable])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btnRef.current?.focus(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(i => Math.min(shown.length - 1, i + 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive(i => Math.max(0, i - 1)); return }
      if (e.key === 'Home') { e.preventDefault(); setActive(0); return }
      if (e.key === 'End') { e.preventDefault(); setActive(shown.length - 1); return }
      if (e.key === 'Enter') {
        e.preventDefault()
        const o = shown[active]
        if (o) { onChange(o.value); setOpen(false); btnRef.current?.focus() }
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [open, shown, active, onChange])

  useEffect(() => {
    if (!open) return
    panelRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <style>{`
        .ksel-btn{ display:inline-flex; align-items:center; gap:7px; height:34px; padding:0 11px 0 ${icon ? '10px' : '13px'}; border:none; border-radius:99px; background:rgba(255,255,255,.62); box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07); color:${INK}; font-size:11.5px; font-weight:600; font-family:var(--font-display); cursor:pointer; white-space:nowrap; max-width:${maxWidth}px; transition:background .2s ease, box-shadow .22s ease, transform .16s cubic-bezier(.2,.85,.3,1); }
        .ksel-btn:hover{ background:rgba(255,255,255,.92); transform:translateY(-1px); box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07), 0 4px 12px rgba(0,0,0,.07); }
        .ksel-btn:active{ transform:translateY(0) scale(.97); transition-duration:.07s; }
        .ksel-btn.on{ background:#FFF; box-shadow:inset 0 0 0 .5px rgba(0,0,0,.10), 0 4px 14px rgba(0,0,0,.09); }
        .ksel-btn:focus{ outline:none; }
        .ksel-btn:focus-visible{ outline:none; box-shadow:inset 0 0 0 .5px rgba(0,0,0,.07), 0 0 0 3px rgba(0,0,0,.09); }
        .ksel-lbl{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ksel-chev{ flex-shrink:0; transition:transform .26s cubic-bezier(.34,1.3,.4,1); }
        .ksel-btn.on .ksel-chev{ transform:rotate(180deg); }

        .ksel-wrap{ position:absolute; top:calc(100% + 9px); z-index:400; animation:kselIn .24s cubic-bezier(.2,1.05,.3,1); transform-origin:24px top; }
        @keyframes kselIn{ from{ opacity:0; transform:translateY(-7px) scale(.965) } to{ opacity:1; transform:none } }
        .ksel-tip{ position:absolute; top:-5px; left:20px; width:13px; height:13px; background:#FFF; transform:rotate(45deg); border-radius:3px; box-shadow:-1px -1px 0 rgba(0,0,0,.045); }
        .ksel-panel{ position:relative; z-index:1; background:#FFF; border-radius:14px; box-shadow:0 18px 46px rgba(16,20,38,.20), 0 4px 12px rgba(16,20,38,.08), inset 0 0 0 .5px rgba(0,0,0,.06); overflow:hidden; }
        .ksel-head{ padding:11px 14px 8px; font-size:9.5px; font-weight:700; letter-spacing:.10em; text-transform:uppercase; color:${FAINT}; font-family:var(--font-display); }
        .ksel-search{ margin:0 10px 8px; position:relative; }
        .ksel-search input{ width:100%; height:32px; padding:0 12px 0 30px; border:none; border-radius:99px; background:rgba(0,0,0,.045); color:${INK}; font-size:12px; font-family:var(--font-display); outline:none; box-sizing:border-box; transition:background .18s ease, box-shadow .18s ease; }
        .ksel-search input:focus{ background:#FFF; box-shadow:0 0 0 .5px rgba(0,0,0,.10), 0 0 0 3px rgba(0,0,0,.045); }
        .ksel-list{ max-height:326px; overflow-y:auto; padding:3px 6px 7px; scrollbar-width:thin; overscroll-behavior:contain; }
        .ksel-list::-webkit-scrollbar{ width:8px }
        .ksel-list::-webkit-scrollbar-thumb{ background:rgba(0,0,0,.14); border-radius:99px; border:2px solid transparent; background-clip:content-box }

        .ksel-item{ display:flex; align-items:center; gap:9px; width:100%; padding:7px 9px; border:none; background:transparent; border-radius:9px; cursor:pointer; text-align:left; font-family:var(--font-display); color:${INK}; transition:background .15s ease; animation:kselItem .3s cubic-bezier(.2,.9,.3,1) backwards; }
        @keyframes kselItem{ from{ opacity:0; transform:translateY(4px); filter:blur(3px) } to{ opacity:1; transform:none; filter:none } }
        .ksel-item:hover, .ksel-item.act{ background:rgba(0,0,0,.05); }
        .ksel-item.sel{ background:rgba(224,48,32,.07); }
        .ksel-item.sel .ksel-name{ font-weight:700; }
        .ksel-logo{ width:30px; height:20px; flex-shrink:0; display:flex; align-items:center; justify-content:center; }
        .ksel-logo img{ max-width:30px; max-height:20px; object-fit:contain; display:block; }
        .ksel-mono{ width:20px; height:20px; border-radius:6px; background:rgba(0,0,0,.06); display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:800; color:${FAINT}; font-family:var(--font-data); }
        .ksel-name{ flex:1; min-width:0; font-size:12.5px; font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .ksel-count{ flex-shrink:0; font-size:10.5px; font-weight:700; color:${FAINT}; font-family:var(--font-data); }
        .ksel-check{ flex-shrink:0; color:#E03020; }
        .ksel-empty{ padding:16px 12px 18px; text-align:center; font-size:11.5px; color:${MUTED}; font-family:var(--font-display); }

        @media (prefers-reduced-motion: reduce){
          .ksel-wrap, .ksel-item{ animation:none }
          .ksel-btn:hover, .ksel-btn:active{ transform:none }
          .ksel-chev{ transition:none }
        }
      `}</style>

      <button
        ref={btnRef}
        type="button"
        className={'ksel-btn' + (open ? ' on' : '')}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        {icon}
        <span className="ksel-lbl">{selected?.label ?? ''}</span>
        <svg className="ksel-chev" width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="#AEAEB2" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="ksel-wrap"
          style={{ width: panelWidth, ...(align === 'right' ? { right: 0 } : { left: 0 }) }}>
          <span className="ksel-tip" aria-hidden style={align === 'right' ? { left: 'auto', right: 20 } : undefined} />
          <div ref={panelRef} className="ksel-panel" role="listbox" aria-label={ariaLabel}>
            {heading && <div className="ksel-head">{heading}</div>}

            {searchable && (
              <div className="ksel-search">
                <input ref={searchRef} type="text" placeholder="Rechercher"
                  value={query} onChange={e => { setQuery(e.target.value); setActive(0) }} />
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#AEAEB2"
                  strokeWidth="2.5" strokeLinecap="round"
                  style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                  <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
                </svg>
              </div>
            )}

            <div className="ksel-list">
              {shown.length === 0 && <div className="ksel-empty">Aucun résultat</div>}
              {shown.map((o, i) => {
                const isSel = o.value === value
                return (
                  <button
                    key={o.value}
                    data-i={i}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className={'ksel-item' + (isSel ? ' sel' : '') + (i === active ? ' act' : '')}
                    style={{ animationDelay: Math.min(i, 10) * 18 + 'ms' }}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => { onChange(o.value); setOpen(false); btnRef.current?.focus() }}
                  >
                    {o.image !== undefined && (
                      <span className="ksel-logo">
                        {o.image
                          ? <img src={o.image} alt="" onError={e => {
                              const t = e.target as HTMLImageElement
                              t.style.display = 'none'
                              const p = t.parentElement
                              if (p && !p.querySelector('.ksel-mono')) {
                                const d = document.createElement('span')
                                d.className = 'ksel-mono'
                                d.textContent = (o.label[0] || '?').toUpperCase()
                                p.appendChild(d)
                              }
                            }} />
                          : <span className="ksel-mono">{(o.label[0] || '?').toUpperCase()}</span>}
                      </span>
                    )}
                    <span className="ksel-name">{o.label}</span>
                    {typeof o.count === 'number' && <span className="ksel-count">{o.count}</span>}
                    {isSel && (
                      <svg className="ksel-check" width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default KodoSelect
