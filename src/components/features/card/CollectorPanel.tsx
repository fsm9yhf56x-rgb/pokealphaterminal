'use client'

/**
 * CollectorPanel — l'onglet "Collection" de la fiche carte.
 *
 * La fiche repond a la question de l'investisseur : combien ca vaut, comment
 * ca evolue, faut-il grader. Ce panneau repond a celle du collectionneur :
 * qu'est-ce que cette carte, ou se place-t-elle, et OU J'EN SUIS.
 *
 * Le coeur du panneau est LE CLASSEUR : la serie entiere en une grille, mes
 * cartes en couleur, les absentes en pochettes vides. C'est exactement la
 * lecture d'un classeur reel — on voit son avancement d'un coup d'oeil, pas
 * dans deux listes separees. Les manquantes partent en wishlist d'un geste.
 *
 * Zero lexique finance. Aucune nouvelle source : catalogue statique + portfolio.
 */

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { SNOW, FONT } from '@/lib/design/snow'
import { usePortfolio } from '@/lib/usePortfolio'
import { useGoals } from '@/lib/useGoals'
import { getCardImageUrl } from '@/lib/images'

type Lang = 'FR' | 'EN' | 'JP'
type Filter = 'all' | 'mine' | 'missing'

interface Props {
  cardId: string
  lang: Lang
  setId: string
  setName: string
  localId: string
  name: string
  rarity?: string | null
  illustrator?: string | null
  era?: string | null
}

interface SetCard { id: string; lid: string; n: string; r?: string | null }

const normNum = (n: unknown) => String(n ?? '').trim().replace(/^0+(?=\d)/, '').toLowerCase()
const cap = (x: string) => (x ? x.charAt(0).toUpperCase() + x.slice(1) : x)
const bareSet = (x: string) => String(x ?? '').replace(/^(fr|en|jp)-/i, '')

const PAGE = 60

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 900, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}

export function CollectorPanel({
  cardId, lang, setId, setName, localId, name, rarity, illustrator, era,
}: Props) {
  const router = useRouter()
  const { cards: owned } = usePortfolio()
  const { wishlist, addWishItem } = useGoals()

  const [setCards, setSetCards] = useState<SetCard[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [limit, setLimit] = useState(PAGE)
  const [busy, setBusy] = useState<string | null>(null)
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(`/data/cards-${lang}.json`, { cache: 'force-cache' })
        if (!r.ok) return
        const all = await r.json()
        // set_id vaut 'fr-base3-1st', la cle du catalogue est 'base3-1st'.
        if (alive) setSetCards(all[setId] || all[bareSet(setId)] || [])
      } catch { /* le panneau se degrade, la fiche ne casse pas */ }
    })()
    return () => { alive = false }
  }, [lang, setId])

  const say = (m: string) => {
    setToast(m)
    if (toastT.current) clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToast(null), 2600)
  }

  /** Ce que je possede dans cette serie, par numero. */
  const mine = useMemo(() => {
    const m = new Set<string>()
    const b = bareSet(setId)
    for (const c of owned || []) {
      if (bareSet((c as any).set_id) !== b) continue
      m.add(normNum((c as any).card_number))
    }
    return m
  }, [owned, setId])

  const inWish = useMemo(() => {
    const s = new Set<string>()
    const b = bareSet(setId)
    for (const w of wishlist || []) {
      if (bareSet((w as any).set_id) !== b) continue
      s.add(normNum((w as any).card_number))
    }
    return s
  }, [wishlist, setId])

  const stats = useMemo(() => {
    if (!setCards) return null
    const total = setCards.length
    const have = setCards.filter(c => mine.has(normNum(c.lid))).length
    const position = setCards.findIndex(c => normNum(c.lid) === normNum(localId)) + 1
    return { total, have, missing: total - have, position, pct: total ? Math.round((have * 100) / total) : 0 }
  }, [setCards, mine, localId])

  const shown = useMemo(() => {
    if (!setCards) return []
    if (filter === 'mine') return setCards.filter(c => mine.has(normNum(c.lid)))
    if (filter === 'missing') return setCards.filter(c => !mine.has(normNum(c.lid)))
    return setCards
  }, [setCards, filter, mine])

  useEffect(() => { setLimit(PAGE) }, [filter])

  async function wish(c: SetCard) {
    const key = normNum(c.lid)
    if (busy || inWish.has(key) || added.has(key)) return
    setBusy(key)
    try {
      const res = await addWishItem({
        name: c.n,
        set_id: bareSet(setId),
        set_name: setName,
        card_number: c.lid,
        lang,
        rarity: c.r ?? null,
        priority: 2,
      } as any)
      if (res === null) say('Limite du plan Gratuit atteinte (3 cartes en wishlist).')
      else { setAdded(p => new Set(p).add(key)); say(c.n + ' ajoutée à ta wishlist.') }
    } catch {
      say("Impossible d'ajouter cette carte pour le moment.")
    } finally { setBusy(null) }
  }

  const chips: { k: string; v: string }[] = []
  if (era) chips.push({ k: 'Ère', v: cap(era) })
  if (rarity) chips.push({ k: 'Rareté', v: cap(rarity) })
  if (illustrator) chips.push({ k: 'Illustration', v: illustrator })

  const R = 26, C = 2 * Math.PI * R

  return (
    <div className="cp">
      {/* ══ Ce qu'est cette carte ══ */}
      <section className="cp-sec">
        <h3 className="cp-h">Cette carte</h3>
        <div className="cp-chips">
          {chips.map((c, i) => (
            <div key={c.k} className="cp-chip" style={{ animationDelay: 0.04 * i + 's' }}>
              <span className="cp-chip-k">{c.k}</span>
              <span className="cp-chip-v">{c.v}</span>
            </div>
          ))}
          {stats && stats.position > 0 && (
            <div className="cp-chip" style={{ animationDelay: '.16s' }}>
              <span className="cp-chip-k">Dans la série</span>
              <span className="cp-chip-v">{stats.position}<span className="cp-dim"> / {stats.total}</span></span>
            </div>
          )}
        </div>
        {illustrator && (
          <button className="cp-a" onClick={() => router.push('/culture/artistes')}>
            Découvrir {illustrator}
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        )}
      </section>

      {/* ══ Le classeur ══ */}
      {stats && stats.total > 0 && (
        <section className="cp-sec">
          <h3 className="cp-h">{setName}</h3>

          <div className={'cp-prog' + (stats.pct === 100 ? ' is-done' : '')}>
            <div className="cp-ring">
              <svg viewBox="0 0 64 64">
                <circle cx="32" cy="32" r={R} className="cp-ring-bg" />
                <circle cx="32" cy="32" r={R} className="cp-ring-fg"
                  strokeDasharray={C} strokeDashoffset={C - (C * stats.pct) / 100} />
              </svg>
              <span className="cp-ring-n"><CountUp to={stats.pct} />%</span>
            </div>
            <div className="cp-prog-txt">
              <div className="cp-prog-count">
                <strong><CountUp to={stats.have} /></strong>
                <span className="cp-dim"> / {stats.total} cartes réunies</span>
              </div>
              {stats.pct === 100 ? (
                <p className="cp-done">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Série complète. Rien ne manque ici.
                </p>
              ) : (
                <p className="cp-sub">
                  Il te manque <strong>{stats.missing}</strong> carte{stats.missing > 1 ? 's' : ''} pour boucler la série.
                </p>
              )}
            </div>
          </div>

          {/* filtres */}
          <div className="cp-filters">
            {([
              ['all', 'Tout', stats.total],
              ['mine', 'J\u2019ai', stats.have],
              ['missing', 'Il me manque', stats.missing],
            ] as [Filter, string, number][]).map(([k, label, n]) => (
              <button key={k} className={'cp-f' + (filter === k ? ' on' : '')}
                onClick={() => setFilter(k)} disabled={n === 0}>
                {label}<span className="cp-f-n">{n}</span>
              </button>
            ))}
          </div>

          {/* la grille : le classeur */}
          <div className="cp-binder">
            {shown.slice(0, limit).map((c, i) => {
              const key = normNum(c.lid)
              const have = mine.has(key)
              const done = inWish.has(key) || added.has(key)
              const isThis = key === normNum(localId)
              return (
                <div key={c.id}
                  className={'cp-slot' + (have ? ' has' : '') + (isThis ? ' cur' : '')}
                  style={{ animationDelay: Math.min(i * 0.014, 0.42) + 's' }}
                  title={c.n + ' \u00b7 n\u00b0' + c.lid}>
                  <div className="cp-slot-in">
                    <img
                      src={getCardImageUrl({ lang, setId: bareSet(setId), localId: c.lid })}
                      alt=""
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                    />
                    <span className="cp-slot-num">{c.lid}</span>
                    {have && (
                      <span className="cp-owned" title="Dans ta collection">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                    {!have && (
                      <button
                        className={'cp-wish' + (done ? ' on' : '')}
                        disabled={done || busy === key}
                        title={done ? 'Déjà dans ta wishlist' : 'Ajouter à ma wishlist'}
                        onClick={() => wish(c)}>
                        {done ? (
                          <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>
                        )}
                      </button>
                    )}
                  </div>
                  <span className="cp-slot-n">{c.n}</span>
                </div>
              )
            })}
          </div>

          {shown.length > limit && (
            <button className="cp-more" onClick={() => setLimit(l => l + PAGE)}>
              Voir {Math.min(PAGE, shown.length - limit)} cartes de plus
              <span className="cp-more-n">{limit} / {shown.length}</span>
            </button>
          )}

          <button className="cp-a" onClick={() => router.push('/cartes?set=' + bareSet(setId))}>
            Ouvrir la série dans le Pokédesk
            <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </section>
      )}

      {toast && <div className="cp-toast">{toast}</div>}

      <style>{`
        .cp { display: flex; flex-direction: column; gap: 34px; position: relative; }
        .cp-sec { animation: cpUp .5s cubic-bezier(.2,.85,.3,1) both; }
        .cp-sec:nth-of-type(2) { animation-delay: .07s; }
        .cp-h {
          margin: 0 0 16px; font-family: ${FONT.display};
          font-size: 11.5px; font-weight: 700; letter-spacing: .09em;
          text-transform: uppercase; color: ${SNOW.muted};
        }
        .cp-dim { color: ${SNOW.mutedLight}; font-weight: 500; }

        .cp-chips { display: flex; flex-wrap: wrap; gap: 9px; }
        .cp-chip {
          display: flex; flex-direction: column; gap: 3px;
          padding: 10px 15px; border-radius: 13px;
          background: rgba(255,255,255,.66);
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 1px 2px rgba(20,20,40,.04), 0 6px 18px rgba(20,20,40,.05);
          backdrop-filter: blur(14px) saturate(170%);
          -webkit-backdrop-filter: blur(14px) saturate(170%);
          animation: cpUp .5s cubic-bezier(.2,.85,.3,1) both;
          transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease;
        }
        .cp-chip:hover { transform: translateY(-2px); box-shadow: 0 2px 4px rgba(20,20,40,.05), 0 12px 26px rgba(20,20,40,.09); }
        .cp-chip-k { font-family: ${FONT.display}; font-size: 9.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: ${SNOW.mutedLight}; }
        .cp-chip-v { font-family: ${FONT.display}; font-size: 14px; font-weight: 600; color: ${SNOW.ink}; }

        .cp-a {
          display: inline-flex; align-items: center; gap: 6px;
          margin-top: 16px; padding: 0; border: none; background: none; cursor: pointer;
          font-family: ${FONT.display}; font-size: 13px; font-weight: 600; color: #E03020;
          transition: gap .2s cubic-bezier(.2,.8,.2,1), opacity .18s ease;
        }
        .cp-a svg { width: 14px; height: 14px; }
        .cp-a:hover { gap: 10px; opacity: .82; }

        /* ── progression ── */
        .cp-prog {
          display: flex; align-items: center; gap: 20px;
          padding: 20px 22px; border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,255,255,.78), rgba(255,255,255,.55));
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 1px 3px rgba(20,20,40,.04), 0 14px 40px rgba(20,20,40,.06);
          backdrop-filter: blur(18px) saturate(180%);
          -webkit-backdrop-filter: blur(18px) saturate(180%);
        }
        .cp-prog.is-done {
          background: linear-gradient(135deg, rgba(29,158,117,.10), rgba(255,255,255,.6));
          border-color: rgba(29,158,117,.28);
        }
        .cp-ring { position: relative; width: 64px; height: 64px; flex: 0 0 64px; }
        .cp-ring svg { width: 64px; height: 64px; transform: rotate(-90deg); }
        .cp-ring-bg { fill: none; stroke: rgba(0,0,0,.07); stroke-width: 6; }
        .cp-ring-fg { fill: none; stroke: #E03020; stroke-width: 6; stroke-linecap: round;
          transition: stroke-dashoffset 1.1s cubic-bezier(.2,.85,.3,1); }
        .cp-prog.is-done .cp-ring-fg { stroke: #1D9E75; }
        .cp-ring-n { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.data}; font-size: 14px; font-weight: 700; color: ${SNOW.ink}; }
        .cp-prog-count { font-family: ${FONT.display}; font-size: 20px; color: ${SNOW.ink}; line-height: 1.2; }
        .cp-prog-count strong { font-weight: 800; letter-spacing: -.02em; }
        .cp-sub, .cp-done { margin: 6px 0 0; font-family: ${FONT.body}; font-size: 13.5px; color: ${SNOW.muted}; line-height: 1.5; }
        .cp-sub strong { color: ${SNOW.ink}; font-weight: 700; }
        .cp-done { display: inline-flex; align-items: center; gap: 7px; color: #1D9E75; font-weight: 600; }
        .cp-done svg { width: 14px; height: 14px; flex: 0 0 14px; }

        /* ── filtres ── */
        .cp-filters { display: flex; gap: 7px; margin: 18px 0 14px; flex-wrap: wrap; }
        .cp-f {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: 999px; cursor: pointer;
          border: 1px solid rgba(0,0,0,.07); background: rgba(255,255,255,.66);
          font-family: ${FONT.display}; font-size: 12.5px; font-weight: 600; color: ${SNOW.muted};
          transition: all .18s cubic-bezier(.2,.8,.2,1);
        }
        .cp-f:hover:not(:disabled) { background: #fff; color: ${SNOW.ink}; transform: translateY(-1px); }
        .cp-f:disabled { opacity: .4; cursor: default; }
        .cp-f.on {
          background: ${SNOW.ink}; color: #fff; border-color: ${SNOW.ink};
          box-shadow: 0 4px 14px rgba(20,20,40,.18);
        }
        .cp-f-n {
          font-family: ${FONT.data}; font-size: 10.5px; font-weight: 700;
          padding: 1px 6px; border-radius: 999px;
          background: rgba(0,0,0,.06); color: ${SNOW.muted};
        }
        .cp-f.on .cp-f-n { background: rgba(255,255,255,.22); color: #fff; }

        /* ── le classeur ── */
        .cp-binder {
          padding: 16px; border-radius: 16px;
          background: linear-gradient(180deg, rgba(0,0,0,.028), rgba(0,0,0,.012));
          border: 1px solid rgba(0,0,0,.05);
          display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 12px;
        }
        .cp-slot {
          display: flex; flex-direction: column; gap: 6px; min-width: 0;
          animation: cpSlot .4s cubic-bezier(.2,.85,.3,1) both;
        }
        .cp-slot-in {
          position: relative; aspect-ratio: 63/88; border-radius: 8px; overflow: hidden;
          background: linear-gradient(158deg, #E9E9EE, #DEDEE5);
          /* pochette VIDE : liseré en creux, ce n'est pas une carte */
          border: 1px dashed rgba(0,0,0,.16);
          box-shadow: inset 0 2px 8px rgba(0,0,0,.07);
          transition: transform .24s cubic-bezier(.2,.85,.3,1), box-shadow .24s ease, border-color .24s ease;
        }
        .cp-slot-in img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          filter: grayscale(1) contrast(.85); opacity: .28;
          transition: filter .3s ease, opacity .3s ease, transform .3s cubic-bezier(.2,.85,.3,1);
        }
        /* pochette REMPLIE : la carte est la, en couleur, avec du relief */
        .cp-slot.has .cp-slot-in {
          border: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 2px 8px rgba(20,20,40,.10);
        }
        .cp-slot.has .cp-slot-in img { filter: none; opacity: 1; }
        /* la carte qu'on est en train de regarder */
        .cp-slot.cur .cp-slot-in { border: 2px solid #E03020; box-shadow: 0 0 0 3px rgba(224,48,32,.14); }

        .cp-slot:hover .cp-slot-in { transform: translateY(-3px); box-shadow: 0 10px 26px rgba(20,20,40,.18); }
        .cp-slot:not(.has):hover .cp-slot-in { border-color: transparent; }
        .cp-slot:not(.has):hover .cp-slot-in img { filter: none; opacity: 1; transform: scale(1.03); }

        .cp-slot-num {
          position: absolute; left: 5px; bottom: 5px;
          font-family: ${FONT.data}; font-size: 9px; font-weight: 700; color: ${SNOW.muted};
          background: rgba(255,255,255,.88); border-radius: 4px; padding: 1px 5px;
          transition: opacity .2s ease;
        }
        .cp-slot:hover .cp-slot-num { opacity: 0; }

        .cp-owned {
          position: absolute; right: 5px; top: 5px;
          width: 18px; height: 18px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          background: #1D9E75; color: #fff;
          box-shadow: 0 2px 7px rgba(29,158,117,.42);
        }
        .cp-owned svg { width: 10px; height: 10px; }

        .cp-wish {
          position: absolute; right: 5px; bottom: 5px;
          width: 24px; height: 24px; border-radius: 8px;
          border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,.94); color: ${SNOW.ink};
          box-shadow: 0 2px 8px rgba(0,0,0,.18);
          opacity: 0; transform: scale(.8) translateY(4px);
          transition: opacity .2s ease, transform .24s cubic-bezier(.34,1.4,.4,1), background .18s ease;
        }
        .cp-slot:hover .cp-wish { opacity: 1; transform: none; }
        .cp-wish:hover { background: #E03020; color: #fff; }
        .cp-wish svg { width: 12px; height: 12px; }
        .cp-wish.on { opacity: 1; transform: none; background: #1D9E75; color: #fff; cursor: default; }

        .cp-slot-n {
          font-family: ${FONT.display}; font-size: 11px; font-weight: 600; color: ${SNOW.mutedLight};
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          transition: color .2s ease;
        }
        .cp-slot.has .cp-slot-n { color: ${SNOW.ink}; }
        .cp-slot:hover .cp-slot-n { color: ${SNOW.ink}; }

        .cp-more {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          width: 100%; margin-top: 12px; padding: 12px;
          border-radius: 12px; border: 1px dashed rgba(0,0,0,.12);
          background: rgba(255,255,255,.5); cursor: pointer;
          font-family: ${FONT.display}; font-size: 12.5px; font-weight: 600; color: ${SNOW.muted};
          transition: all .18s ease;
        }
        .cp-more:hover { background: #fff; color: ${SNOW.ink}; border-style: solid; }
        .cp-more-n { font-family: ${FONT.data}; font-size: 10.5px; color: ${SNOW.mutedLight}; }

        .cp-toast {
          position: sticky; bottom: 14px; align-self: center;
          margin-top: 4px; padding: 11px 18px; border-radius: 999px;
          background: rgba(29,29,31,.93); color: #fff;
          font-family: ${FONT.display}; font-size: 12.5px; font-weight: 600;
          box-shadow: 0 10px 30px rgba(0,0,0,.24);
          backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
          animation: cpToast .32s cubic-bezier(.2,.9,.25,1) both; z-index: 5;
        }

        @keyframes cpUp    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        @keyframes cpSlot  { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
        @keyframes cpToast { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .cp-sec, .cp-chip, .cp-slot, .cp-toast { animation: none !important; }
          .cp-ring-fg, .cp-slot-in, .cp-slot-in img, .cp-wish, .cp-f { transition: none !important; }
        }
      `}</style>
    </div>
  )
}

export default CollectorPanel
