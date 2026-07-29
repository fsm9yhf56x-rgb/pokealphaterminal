'use client'

/**
 * CollectorSidePanel — le contenu du panneau lateral en mode collectionneur.
 *
 * Remplace SpotlightV2 (panneau de marche : cote, historique, prix par etat).
 * Ici la question n'est pas "combien ca vaut" mais "est-ce que je l'ai, ou
 * j'en suis dans cette serie, et qu'est-ce qu'il y a autour".
 *
 * La bande du bas permet de FEUILLETER la serie sans fermer le panneau :
 * navigation interne (etat local), le parent n'a rien a savoir.
 *
 * Aucun appel externe : catalogue statique deja en cache + portfolio.
 * Le panneau s'ouvre instantanement, ce qui compte quand on parcourt une grille.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SNOW, FONT } from '@/lib/design/snow'
import { usePortfolio } from '@/lib/usePortfolio'
import { useGoals } from '@/lib/useGoals'
import { getCardImageUrl } from '@/lib/images'

type Lang = 'FR' | 'EN' | 'JP'
interface RawCard { id: string; lid: string; n: string; img?: string; r?: string | null }

const normNum = (n: unknown) => String(n ?? '').trim().replace(/^0+(?=\d)/, '').toLowerCase()
const bareSet = (x: string) => String(x ?? '').replace(/^(fr|en|jp)-/i, '')

/** 'fr-base3-1st-2' -> { setId: 'base3-1st', localId: '2' } */
function splitId(cardId: string) {
  const noLang = bareSet(cardId)
  const i = noLang.lastIndexOf('-')
  return i > 0 ? { setId: noLang.slice(0, i), localId: noLang.slice(i + 1) }
               : { setId: noLang, localId: '' }
}

/** Ere deduite du prefixe de set — meme table que la fiche carte. */
const ERAS: { re: RegExp; label: string; color: string }[] = [
  { re: /^(base|jungle|fossil|neo|gym|wizards|bp|si|tk)/i, label: 'Vintage WOTC', color: '#C9A227' },
  { re: /^(ecard|ex|np|pop)/i, label: 'E-Card / EX', color: '#3B7DD8' },
  { re: /^(dp|pl|hgss|col|hs|ru)/i, label: 'DPP / HGSS', color: '#16A085' },
  { re: /^(bw|dv|mc)/i, label: 'Noir & Blanc', color: '#6B7280' },
  { re: /^(xy|g1|dc)/i, label: 'XY', color: '#C2557A' },
  { re: /^(sm|smp)/i, label: 'Soleil & Lune', color: '#E08A3C' },
  { re: /^(swsh|cel|me)/i, label: 'Épée & Bouclier', color: '#5566C9' },
  { re: /^(sv|sve|svp|tcgp)/i, label: 'Écarlate & Violet', color: '#D93A3A' },
]
const eraOf = (setId: string) => ERAS.find(e => e.re.test(bareSet(setId))) || null

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (typeof window !== 'undefined'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / 800, 1)
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [to])
  return <>{n}</>
}

export function CollectorSidePanel({ cardId, lang = 'FR' }: { cardId: string; lang?: Lang }) {
  const router = useRouter()
  const { cards: owned } = usePortfolio()
  const { wishlist, addWishItem } = useGoals()

  const base = useMemo(() => splitId(cardId), [cardId])
  const setId = base.setId

  // Navigation interne : on feuillette la serie sans fermer le panneau.
  const [viewNum, setViewNum] = useState(base.localId)
  useEffect(() => { setViewNum(base.localId) }, [base.localId])

  const [setCards, setSetCards] = useState<RawCard[] | null>(null)
  const [setName, setSetName] = useState('')
  const [busy, setBusy] = useState(false)
  const [wished, setWished] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const glareRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [rc, rs] = await Promise.all([
          fetch(`/data/cards-${lang}.json`, { cache: 'force-cache' }),
          fetch(`/data/sets-${lang}.json`, { cache: 'force-cache' }),
        ])
        if (rc.ok) {
          const all = await rc.json()
          if (alive) setSetCards(all[setId] || all[bareSet(setId)] || [])
        }
        if (rs.ok) {
          const sets = await rs.json()
          const arr = Array.isArray(sets) ? sets : (sets.sets || [])
          const f = arr.find((x: any) => x.id === setId || x.id === bareSet(setId))
          if (alive && f) setSetName(f.name || '')
        }
      } catch { /* le panneau se degrade sans casser */ }
    })()
    return () => { alive = false }
  }, [lang, setId])

  const card = useMemo(
    () => (setCards || []).find(c => normNum(c.lid) === normNum(viewNum)) || null,
    [setCards, viewNum],
  )

  /** Ce que je possede dans cette serie, par numero. */
  const haveSet = useMemo(() => {
    const b = bareSet(setId)
    const m = new Set<string>()
    for (const c of owned || []) {
      if (bareSet((c as any).set_id) !== b) continue
      m.add(normNum((c as any).card_number))
    }
    return m
  }, [owned, setId])

  /** Mes exemplaires de la carte affichee. */
  const mine = useMemo(() => {
    const b = bareSet(setId)
    return (owned || []).filter((c: any) =>
      bareSet(c.set_id) === b && normNum(c.card_number) === normNum(viewNum))
  }, [owned, setId, viewNum])

  const units = mine.reduce((n, c: any) => n + (Number(c.qty) || 1), 0)

  const stats = useMemo(() => {
    if (!setCards || !setCards.length) return null
    const have = setCards.filter(c => haveSet.has(normNum(c.lid))).length
    const idx = setCards.findIndex(c => normNum(c.lid) === normNum(viewNum))
    return { total: setCards.length, have, idx, pct: Math.round((have * 100) / setCards.length) }
  }, [setCards, haveSet, viewNum])

  const alreadyWished = useMemo(() => {
    const b = bareSet(setId)
    return (wishlist || []).some((w: any) =>
      bareSet(w.set_id) === b && normNum(w.card_number) === normNum(viewNum))
      || wished.has(normNum(viewNum))
  }, [wishlist, setId, viewNum, wished])

  /** La bande centre automatiquement la carte courante. */
  useEffect(() => {
    const el = stripRef.current
    if (!el) return
    const cur = el.querySelector('[data-cur="1"]') as HTMLElement | null
    if (cur) el.scrollTo({ left: cur.offsetLeft - el.clientWidth / 2 + cur.clientWidth / 2, behavior: 'smooth' })
  }, [viewNum, setCards])

  const onMove = (e: React.MouseEvent) => {
    const el = tiltRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width
    const py = (e.clientY - r.top) / r.height
    el.style.transform =
      `perspective(760px) rotateX(${(0.5 - py) * 11}deg) rotateY(${(px - 0.5) * 11}deg) scale(1.025)`
    if (glareRef.current) {
      glareRef.current.style.opacity = '1'
      glareRef.current.style.background =
        `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,.55), transparent 58%)`
    }
  }
  const onLeave = () => {
    if (tiltRef.current) tiltRef.current.style.transform = ''
    if (glareRef.current) glareRef.current.style.opacity = '0'
  }

  async function wish() {
    if (busy || alreadyWished || !card) return
    setBusy(true)
    try {
      const res = await addWishItem({
        name: card.n, set_id: bareSet(setId), set_name: setName || setId,
        card_number: card.lid, lang, rarity: card.r ?? null, priority: 2,
      } as any)
      if (res === null) setToast('Limite du plan Gratuit atteinte (3 cartes).')
      else { setWished(p => new Set(p).add(normNum(card.lid))); setToast('Ajoutée à ta wishlist.') }
    } catch { setToast('Impossible pour le moment.') }
    finally { setBusy(false); setTimeout(() => setToast(null), 2600) }
  }

  const img = card?.img || getCardImageUrl({ lang, setId: bareSet(setId), localId: viewNum })
  const era = eraOf(setId)
  const R = 20, C = 2 * Math.PI * R
  const changed = normNum(viewNum) !== normNum(base.localId)

  return (
    <div className="csp">
      {/* ══ La carte ══ */}
      <div className="csp-hero">
        <div key={viewNum} ref={tiltRef} className="csp-card" onMouseMove={onMove} onMouseLeave={onLeave}>
          <img src={img} alt={card?.n || ''} loading="eager"
            onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
          <div ref={glareRef} className="csp-glare" />
        </div>
      </div>

      {/* ══ Identité ══ */}
      <div className="csp-id">
        <p className="csp-set">
          {setName || setId} · n°{card?.lid ?? viewNum}
        </p>
        <h2 className="csp-name">{card?.n || '—'}</h2>
        <div className="csp-tags">
          {units > 0 ? (
            <span className="csp-tag own">
              <svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              {units > 1 ? `${units} exemplaires` : 'Tu l\u2019as'}
            </span>
          ) : (
            <span className="csp-tag miss">Il te manque</span>
          )}
          {card?.r && <span className="csp-tag">{card.r}</span>}
          {era && (
            <span className="csp-tag" style={{ background: era.color + '14', color: SNOW.ink, borderColor: era.color + '33' }}>
              <span className="csp-dot" style={{ background: era.color }} />
              {era.label}
            </span>
          )}
        </div>
      </div>

      {/* ══ Progression ══ */}
      {stats && (
        <div className={'csp-prog' + (stats.pct === 100 ? ' done' : '')}>
          <div className="csp-ring">
            <svg viewBox="0 0 48 48">
              <circle cx="24" cy="24" r={R} className="bg" />
              <circle cx="24" cy="24" r={R} className="fg"
                strokeDasharray={C} strokeDashoffset={C - (C * stats.pct) / 100} />
            </svg>
            <span><CountUp to={stats.pct} />%</span>
          </div>
          <div>
            <div className="csp-prog-n">
              <strong><CountUp to={stats.have} /></strong>
              <span> / {stats.total} réunies</span>
            </div>
            <div className="csp-prog-s">
              {stats.pct === 100 ? 'Série complète.' : `Il t'en manque ${stats.total - stats.have}.`}
            </div>
          </div>
        </div>
      )}

      {/* ══ Feuilleter la série ══ */}
      {setCards && setCards.length > 1 && (
        <div className="csp-strip-wrap">
          <p className="csp-h">Dans la série</p>
          <div className="csp-strip" ref={stripRef}>
            {setCards.map(c => {
              const k = normNum(c.lid)
              const cur = k === normNum(viewNum)
              const has = haveSet.has(k)
              return (
                <button key={c.id} data-cur={cur ? '1' : undefined}
                  className={'csp-mini' + (cur ? ' cur' : '') + (has ? ' has' : '')}
                  title={c.n + ' \u00b7 n\u00b0' + c.lid}
                  onClick={() => setViewNum(c.lid)}>
                  <img src={getCardImageUrl({ lang, setId: bareSet(setId), localId: c.lid })} alt=""
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  {has && <span className="csp-mini-ok" />}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ Mes exemplaires ══ */}
      {mine.length > 0 && (
        <div className="csp-mine">
          <p className="csp-h">Ce que tu as</p>
          {mine.slice(0, 4).map((c: any, i) => (
            <div key={c.id || i} className="csp-ex" style={{ animationDelay: 0.05 * i + 's' }}>
              <span className="csp-ex-c">
                {c.graded ? `${c.grade_company || 'Gradée'} ${c.grade_value ?? ''}`.trim()
                          : (c.condition || 'Non précisé')}
              </span>
              {Number(c.qty) > 1 && <span className="csp-ex-q">×{c.qty}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ══ Actions ══ */}
      <div className="csp-act">
        {units === 0 && (
          <button className="csp-b csp-b1" onClick={wish} disabled={busy || alreadyWished}>
            {alreadyWished ? (
              <><svg viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>Dans ta wishlist</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"/></svg>Ajouter à ma wishlist</>
            )}
          </button>
        )}
        <button className="csp-b csp-b2"
          onClick={() => router.push('/carte/' + (changed ? `${lang.toLowerCase()}-${setId}-${viewNum}` : cardId))}>
          Voir la fiche complète
          <svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {toast && <div className="csp-toast">{toast}</div>}

      <style>{`
        .csp { display: flex; flex-direction: column; gap: 20px; padding-top: 4px; }

        .csp-hero { display: flex; justify-content: center; perspective: 900px; padding: 6px 0 2px; }
        .csp-card {
          position: relative; width: 62%; max-width: 205px; aspect-ratio: 63/88;
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 18px 44px rgba(20,20,40,.20), 0 3px 10px rgba(20,20,40,.10);
          transition: transform .5s cubic-bezier(.2,.85,.3,1), box-shadow .3s ease;
          animation: cspCard .45s cubic-bezier(.2,.85,.3,1) both;
          will-change: transform;
        }
        .csp-card img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .csp-glare { position: absolute; inset: 0; opacity: 0; transition: opacity .25s ease; pointer-events: none; }

        .csp-id { text-align: center; animation: cspIn .5s cubic-bezier(.2,.85,.3,1) both .08s; }
        .csp-set {
          margin: 0 0 5px; font-family: ${FONT.display}; font-size: 10.5px; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase; color: ${SNOW.mutedLight};
        }
        .csp-name {
          margin: 0 0 11px; font-family: ${FONT.display};
          font-size: 22px; font-weight: 800; letter-spacing: -.03em; color: ${SNOW.ink}; line-height: 1.15;
        }
        .csp-tags { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; }
        .csp-tag {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 999px;
          background: rgba(0,0,0,.05); border: 1px solid transparent; color: ${SNOW.muted};
          font-family: ${FONT.display}; font-size: 11px; font-weight: 600;
        }
        .csp-tag svg { width: 10px; height: 10px; }
        .csp-tag.own { background: rgba(29,158,117,.13); color: #17805F; border-color: rgba(29,158,117,.25); font-weight: 700; }
        .csp-tag.miss { background: rgba(224,48,32,.09); color: #C0281A; border-color: rgba(224,48,32,.2); }
        .csp-dot { width: 6px; height: 6px; border-radius: 50%; }

        .csp-prog {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 16px; border-radius: 15px;
          background: linear-gradient(135deg, rgba(255,255,255,.78), rgba(255,255,255,.5));
          border: 1px solid rgba(255,255,255,.9);
          box-shadow: 0 1px 3px rgba(20,20,40,.04), 0 10px 28px rgba(20,20,40,.05);
          backdrop-filter: blur(16px) saturate(175%); -webkit-backdrop-filter: blur(16px) saturate(175%);
          animation: cspIn .5s cubic-bezier(.2,.85,.3,1) both .14s;
        }
        .csp-prog.done { background: linear-gradient(135deg, rgba(29,158,117,.10), rgba(255,255,255,.6)); border-color: rgba(29,158,117,.28); }
        .csp-ring { position: relative; width: 48px; height: 48px; flex: 0 0 48px; }
        .csp-ring svg { width: 48px; height: 48px; transform: rotate(-90deg); }
        .csp-ring .bg { fill: none; stroke: rgba(0,0,0,.07); stroke-width: 4.5; }
        .csp-ring .fg { fill: none; stroke: #E03020; stroke-width: 4.5; stroke-linecap: round;
          transition: stroke-dashoffset 1s cubic-bezier(.2,.85,.3,1); }
        .csp-prog.done .csp-ring .fg { stroke: #1D9E75; }
        .csp-ring span { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
          font-family: ${FONT.data}; font-size: 11.5px; font-weight: 700; color: ${SNOW.ink}; }
        .csp-prog-n { font-family: ${FONT.display}; font-size: 16px; color: ${SNOW.ink}; line-height: 1.2; }
        .csp-prog-n strong { font-weight: 800; letter-spacing: -.02em; }
        .csp-prog-n span { color: ${SNOW.mutedLight}; font-weight: 500; }
        .csp-prog-s { font-family: ${FONT.body}; font-size: 12px; color: ${SNOW.muted}; margin-top: 2px; }
        .csp-prog.done .csp-prog-s { color: #1D9E75; font-weight: 600; }

        .csp-h { margin: 0 0 9px; font-family: ${FONT.display}; font-size: 10.5px; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase; color: ${SNOW.mutedLight}; }

        /* ── feuilleter ── */
        .csp-strip-wrap { animation: cspIn .5s cubic-bezier(.2,.85,.3,1) both .2s; }
        .csp-strip {
          display: flex; gap: 7px; overflow-x: auto; padding: 3px 1px 8px;
          scrollbar-width: none; -ms-overflow-style: none;
          scroll-snap-type: x proximity;
        }
        .csp-strip::-webkit-scrollbar { height: 0; display: none; }
        .csp-mini {
          position: relative; flex: 0 0 42px; width: 42px; aspect-ratio: 63/88;
          border-radius: 5px; overflow: hidden; padding: 0; cursor: pointer;
          border: 1px solid rgba(0,0,0,.07); background: #EDEDF1;
          scroll-snap-align: center;
          transition: transform .22s cubic-bezier(.2,.85,.3,1), box-shadow .22s ease, border-color .2s ease;
        }
        .csp-mini img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          filter: grayscale(1); opacity: .34; transition: filter .25s ease, opacity .25s ease;
        }
        .csp-mini.has img { filter: none; opacity: 1; }
        .csp-mini:hover { transform: translateY(-3px); box-shadow: 0 8px 18px rgba(20,20,40,.18); }
        .csp-mini:hover img { filter: none; opacity: 1; }
        .csp-mini.cur {
          border: 2px solid #E03020;
          box-shadow: 0 0 0 3px rgba(224,48,32,.14), 0 6px 16px rgba(20,20,40,.16);
          transform: translateY(-3px);
        }
        .csp-mini.cur img { filter: none; opacity: 1; }
        .csp-mini-ok {
          position: absolute; right: 2px; top: 2px; width: 8px; height: 8px;
          border-radius: 50%; background: #1D9E75; border: 1.5px solid #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,.25);
        }

        .csp-mine { animation: cspIn .5s cubic-bezier(.2,.85,.3,1) both .24s; }
        .csp-ex {
          display: flex; align-items: center; justify-content: space-between;
          padding: 9px 13px; border-radius: 11px; margin-bottom: 6px;
          background: rgba(255,255,255,.6); border: 1px solid rgba(0,0,0,.05);
          animation: cspIn .4s cubic-bezier(.2,.85,.3,1) both;
        }
        .csp-ex-c { font-family: ${FONT.display}; font-size: 12.5px; font-weight: 600; color: ${SNOW.ink}; }
        .csp-ex-q { font-family: ${FONT.data}; font-size: 11px; font-weight: 700; color: ${SNOW.muted}; }

        .csp-act { display: flex; flex-direction: column; gap: 8px; animation: cspIn .5s cubic-bezier(.2,.85,.3,1) both .3s; }
        .csp-b {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 13px 18px; border-radius: 12px; cursor: pointer;
          font-family: ${FONT.display}; font-size: 13.5px; font-weight: 700;
          transition: transform .2s cubic-bezier(.2,.8,.2,1), box-shadow .2s ease, background .2s ease;
        }
        .csp-b svg { width: 14px; height: 14px; }
        .csp-b1 { border: none; background: ${SNOW.ink}; color: #fff; box-shadow: 0 4px 14px rgba(20,20,40,.18); }
        .csp-b1:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(20,20,40,.24); }
        .csp-b1:disabled { background: #1D9E75; cursor: default; box-shadow: none; }
        .csp-b2 { border: 1px solid rgba(0,0,0,.08); background: rgba(255,255,255,.7); color: ${SNOW.ink}; }
        .csp-b2:hover { background: #fff; transform: translateY(-1px); }
        .csp-b2 svg { transition: transform .2s cubic-bezier(.2,.8,.2,1); }
        .csp-b2:hover svg { transform: translateX(3px); }

        .csp-toast {
          position: sticky; bottom: 10px; align-self: center;
          padding: 10px 16px; border-radius: 999px;
          background: rgba(29,29,31,.93); color: #fff;
          font-family: ${FONT.display}; font-size: 12px; font-weight: 600;
          box-shadow: 0 10px 30px rgba(0,0,0,.24);
          animation: cspIn .3s cubic-bezier(.2,.9,.25,1) both;
        }

        @keyframes cspIn   { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes cspCard { from { opacity: 0; transform: translateY(14px) scale(.96); } to { opacity: 1; transform: none; } }

        @media (prefers-reduced-motion: reduce) {
          .csp-card, .csp-id, .csp-prog, .csp-strip-wrap, .csp-mine, .csp-ex, .csp-act, .csp-toast { animation: none !important; }
          .csp-card, .csp-ring .fg, .csp-b, .csp-mini { transition: none !important; }
        }
      `}</style>
    </div>
  )
}

export default CollectorSidePanel
