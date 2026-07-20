'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import { NORI_TOUR, NORI_LINKS } from '@/lib/nori/script'

// Mets ici l'URL R2 de l'avatar de Nori si tu en as une ; sinon emblème ✦.
const NORI_AVATAR = ''
import { useAuth } from '@/lib/useAuth'
const SEEN_KEY_BASE = 'nori_tour_seen_v1'
let noriAutoOpened = false
const GAP = 64           // distance centre-orbe -> bord bulle
const BUBBLE_EST = 270   // hauteur estimée pour éviter tout débordement vertical
const M = 16

// Nori voyage : un ancrage différent par étape (zig-zag = mouvement), tiers gauche/droite.
const ANCHOR: Record<string, [number, number]> = {
  intro: [0.50, 0.28],
  dailyhub: [0.82, 0.34],
  pokedesk: [0.17, 0.34],
  add: [0.84, 0.60],
  portfolio: [0.16, 0.54],
  performance: [0.84, 0.30],
  allocation: [0.16, 0.58],
  graded: [0.17, 0.32],
  market: [0.84, 0.32],
  culture: [0.84, 0.32],
  plans: [0.50, 0.66],
  outro: [0.85, 0.74],
  hub: [0.85, 0.74],
}

type Side = 'above' | 'below'
type Pos = { orbX: number; orbY: number; side: Side; bubbleW: number; tx: number; tailLeft: number }

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

// Investisseur SSI un lien /market existe dans la barre du haut (PAS le footer, qui liste tout).
function detectInvestor() {
  if (typeof document === 'undefined') return false
  const links = Array.from(document.querySelectorAll('a[href="/market"]')) as HTMLElement[]
  return links.some((a) => !a.closest('footer') && a.getBoundingClientRect().top < 160)
}

// Une modale plein ecran est-elle VISIBLE ? Nori doit attendre qu'elles soient
// toutes fermees avant de s'ouvrir (WelcomeBeta, PersonaOnboarding, cookies...).
// On ne se fie PAS a role="dialog" : PersonaOnboarding ne le porte pas. On
// detecte le motif commun a ces overlays -> un element position:fixed qui couvre
// une large part de l'ecran avec un z-index eleve. La bulle de Nori (~300px)
// n'atteint jamais le seuil de 60% -> elle est exclue naturellement, pas besoin
// de la marquer.
function blockingModalOpen() {
  if (typeof document === 'undefined') return false
  const vw = window.innerWidth, vh = window.innerHeight
  const nodes = Array.from(document.body.querySelectorAll('div')) as HTMLElement[]
  for (const el of nodes) {
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed') continue
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) continue
    const z = parseInt(cs.zIndex || '0', 10)
    if (!Number.isFinite(z) || z < 1000) continue
    const r = el.getBoundingClientRect()
    // Couvre une large part de l'ecran = overlay bloquant (pas la bulle de Nori,
    // pas un FAB).
    if (r.width >= vw * 0.6 && r.height >= vh * 0.6) return true
  }
  return false
}

export function NoriGuide() {
  const router = useRouter()
  const pathname = usePathname()
  const navStepRef = useRef<number | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)
  const [isInvestor, setIsInvestor] = useState(false)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<'tour' | 'hub'>('tour')
  const [i, setI] = useState(0)
  const [seen, setSeen] = useState(true)
  const [pulse, setPulse] = useState(false)
  const [flying, setFlying] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)

  const steps = useMemo(
    () => NORI_TOUR.filter((s) => !s.only || (s.only === 'investor') === isInvestor),
    [isInvestor]
  )

  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1
  const stepKey = mode === 'hub' ? 'hub' : step?.id

  // Coordonnées via une règle plein écran (gère le zoom de la page).
  const measure = useCallback(() => {
    const root = rulerRef.current
    const vw = (root && root.clientWidth) || (typeof window !== 'undefined' ? window.innerWidth : 1280)
    const vh = (root && root.clientHeight) || (typeof window !== 'undefined' ? window.innerHeight : 800)
    if (vw <= 600) {
      const bw = Math.min(330, vw - 18)
      const orbX = vw / 2, orbY = vh - 150
      const desiredLeft = clamp(orbX - bw / 2, 10, vw - bw - 10)
      setPos({ orbX, orbY, side: 'above', bubbleW: bw, tx: desiredLeft - orbX, tailLeft: orbX - desiredLeft })
      return
    }
    const a = ANCHOR[stepKey || 'intro'] || ANCHOR.intro
    const orbX = clamp(a[0] * vw, 74, vw - 74)
    const orbY = clamp(a[1] * vh, 96, vh - 96)
    let side: Side = a[1] < 0.5 ? 'below' : 'above'
    if (side === 'below' && orbY + GAP + BUBBLE_EST > vh - M && orbY - GAP - BUBBLE_EST > M) side = 'above'
    if (side === 'above' && orbY - GAP - BUBBLE_EST < M && orbY + GAP + BUBBLE_EST < vh - M) side = 'below'
    const bubbleW = Math.min(300, vw - 28)
    const desiredLeft = clamp(orbX - bubbleW / 2, 14, vw - bubbleW - 14)
    setPos({ orbX, orbY, side, bubbleW, tx: desiredLeft - orbX, tailLeft: orbX - desiredLeft })
  }, [stepKey])

  // Montage + détection persona
  const { user } = useAuth() as any
  const seenKey = user?.id ? SEEN_KEY_BASE + ':' + user.id : null
  useEffect(() => {
    setMounted(true)
    let s = false
    try { s = seenKey ? !!localStorage.getItem(seenKey) : true } catch {}
    setSeen(s)
    const idt = setTimeout(() => setIsInvestor(detectInvestor()), 60)
    if (!s && seenKey && !noriAutoOpened) {
      noriAutoOpened = true
      // On n'arme plus par un simple timer : Nori attend que l'accueil beta ET
      // l'onboarding persona soient fermes (plus aucune modale plein ecran).
      // Poll toutes les 400 ms. Une fois le terrain degage, petite respiration
      // (pulse a +0,8 s, tour a +1,6 s) puis on consomme le flag SEULEMENT la
      // (avant, il etait brule d'avance -> le tour pouvait ne jamais se lancer).
      let pulseT: ReturnType<typeof setTimeout> | undefined
      let tourT: ReturnType<typeof setTimeout> | undefined
      let killed = false
      const start = Date.now()
      const poll = setInterval(() => {
        if (killed) return
        // Garde-fou : au-dela de 45 s d'attente, on lance quand meme (mieux vaut
        // un empilement rare qu'un tour jamais vu).
        const timedOut = Date.now() - start > 45000
        if (blockingModalOpen() && !timedOut) return
        clearInterval(poll)
        pulseT = setTimeout(() => { if (!killed) setPulse(true) }, 800)
        tourT = setTimeout(() => {
          if (killed) return
          setIsInvestor(detectInvestor()); setMode('tour'); setI(0); setOpen(true); setPulse(false); markSeen()
        }, 1600)
      }, 400)
      return () => { killed = true; clearTimeout(idt); clearInterval(poll); if (pulseT) clearTimeout(pulseT); if (tourT) clearTimeout(tourT) }
    }
    return () => clearTimeout(idt)
  }, [seenKey])

  // Re-détecte le persona si la nav change (toggle Collectionneur/Investisseur)
  useEffect(() => { if (mounted) setIsInvestor(detectInvestor()) }, [pathname, mounted])

  // Mesure + resize (rAF pour laisser la règle se poser)
  useEffect(() => {
    if (!open) return
    measure()
    const r = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    return () => { cancelAnimationFrame(r); window.removeEventListener('resize', measure) }
  }, [open, measure])

  // Vol : bond/étincelles à chaque changement d'étape (et à l'ouverture)
  useEffect(() => {
    if (!open) return
    setFlying(true)
    const t = setTimeout(() => setFlying(false), 740)
    return () => clearTimeout(t)
  }, [open, stepKey])

  // Navigation : Nori se rend sur la page de l'étape courante
  useEffect(() => {
    if (!open || mode !== 'tour') return
    if (navStepRef.current === i) return
    const firstRun = navStepRef.current === null
    navStepRef.current = i
    if (firstRun) return
    const p = step?.page
    if (p && pathname !== p) router.push(p)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, i, step?.page, router])

  function markSeen() { setSeen(true); try { if (seenKey) localStorage.setItem(seenKey, '1') } catch {} }
  function openFromFab() { setPulse(false); setIsInvestor(detectInvestor()); setMode(seen ? 'hub' : 'tour'); if (!seen) setI(0); setOpen(true) }
  function next() { if (last) { finish(); return } setI((v) => Math.min(v + 1, steps.length - 1)) }
  function prev() { setI((v) => Math.max(v - 1, 0)) }
  function go(route: string) { router.push(route) }
  function finish() { markSeen(); setOpen(false); setMode('hub'); setTimeout(() => setI(0), 350) }
  function restart() { setMode('tour'); setI(0) }

  const ctaTone = step?.cta || step?.tag

  if (!mounted) return null

  const tree = (
    <>
      <style>{CSS}</style>

      {/* Règle invisible plein écran : sert de repère de coordonnées (anti-zoom). */}
      <div ref={rulerRef} className="nori-ruler" aria-hidden="true" />

      {/* Orbe repliée (FAB) */}
      {!open && (
        <button className={'nori-fab' + (pulse ? ' nori-pulse' : '')} onClick={openFromFab} aria-label="Ouvrir Nori, ton guide">
          <Orb mini />
          {!seen && <span className="nori-beacon" />}
        </button>
      )}

      {/* Compagnon flottant */}
      {open && pos && step && (
        <div className="nori-overlay">
          <div className="nori-companion" style={{ left: pos.orbX + 'px', top: pos.orbY + 'px' }}>
            {/* Orbe (Nori) */}
            <div className={'nori-orbpos' + (flying ? ' fly' : '')}>
              <span className="nori-aura" />
              <Orb />
              <span className="nori-orbit"><i /><i /><i /></span>
              <span className="nori-burst" key={'burst-' + stepKey}><i /><i /><i /><i /><i /><i /></span>
              <span className="nori-speed" key={'speed-' + stepKey}><i /><i /><i /><i /></span>
            </div>

            {/* Bulle (glass v7), au-dessus ou en-dessous selon la position */}
            <div
              className="nori-bubble-pos"
              style={{ transform: pos.side === 'above' ? `translate(${pos.tx}px, calc(-100% - ${GAP}px))` : `translate(${pos.tx}px, ${GAP}px)` }}
            >
              <div className="nori-bubble" role="dialog" aria-label="Nori, ton guide" style={{ width: pos.bubbleW }}>
                <span className={'nori-trail ' + (pos.side === 'above' ? 'up' : 'down')} style={{ left: pos.tailLeft + 'px' }}><i /><i /></span>

                <div className="nori-head">
                  <span className="nori-name">Nori</span>
                  <span className="nori-sub">ton guide</span>
                  <button className="nori-x" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
                </div>

                {mode === 'tour' ? (
                  <>
                    <div className="nori-step" key={stepKey}>
                      <div className="nori-title">
                        <span>{step.title}</span>
                        {step.tag && <span className={'nori-tier ' + step.tag}>{step.tag === 'pro' ? 'PRO' : 'PREMIUM'}</span>}
                      </div>
                      {step.lines.map((l, k) => <p className="nori-line" key={k}>{l}</p>)}
                    </div>

                    <div className="nori-dots">
                      {steps.map((s, k) => (
                        <button key={s.id} className={'nori-dot' + (k === i ? ' on' : k < i ? ' done' : '')} onClick={() => setI(k)} aria-label={'Étape ' + (k + 1)} />
                      ))}
                    </div>

                    <div className="nori-actions">
                      {i > 0
                        ? <button className="nori-prev" onClick={prev} aria-label="Précédent">‹</button>
                        : <button className="nori-skip" onClick={finish}>Passer</button>}
                      <div className="nori-spacer" />
                      {step.route && (
                        <button
                          className={'nori-show' + (ctaTone === 'premium' ? ' t-prem' : ctaTone === 'pro' ? ' t-pro' : ctaTone === 'accent' ? ' t-accent' : '')}
                          onClick={() => go(step.route!)}
                        >
                          {step.showLabel || 'Montre-moi →'}
                        </button>
                      )}
                      <button className="nori-next" onClick={next}>{last ? "C'est parti" : 'Suivant'}</button>
                    </div>
                  </>
                ) : (
                  <div className="nori-step" key="hub">
                    <div className="nori-title"><span>Re-coucou&nbsp;!</span></div>
                    <p className="nori-line">Besoin d'un coup de main ?</p>
                    <div className="nori-links">
                      {NORI_LINKS.map((l, k) => <button key={k} className="nori-chip" onClick={() => go(l.href)}>{l.label}</button>)}
                    </div>
                    <div className="nori-actions" style={{ justifyContent: 'center' }}>
                      <button className="nori-next" onClick={restart}>↻ Refaire le tour</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )

  return createPortal(tree, document.body)
}

function Orb({ mini }: { mini?: boolean }) {
  return (
    <div className={'nori-orb' + (mini ? ' mini' : '')}>
      <span className="nori-ring" />
      {NORI_AVATAR ? <img className="nori-face" src={NORI_AVATAR} alt="Nori" /> : <span className="nori-core">✦</span>}
      <span className="nori-shine" />
    </div>
  )
}

const CSS = `
  .nori-ruler{ position:fixed; inset:0; pointer-events:none; visibility:hidden; z-index:-1; }

  /* ---------- Orbe repliée (FAB) ---------- */
  .nori-fab{ position:fixed; right:22px; bottom:22px; z-index:2147483000; width:60px; height:60px; border:none; background:transparent; cursor:pointer; padding:0; display:flex; align-items:center; justify-content:center; transition:transform .2s cubic-bezier(.16,1,.3,1); animation:fabIn .55s cubic-bezier(.16,1,.3,1); }
  .nori-fab:hover{ transform:translateY(-3px) scale(1.06); }
  .nori-pulse{ animation:fabIn .55s cubic-bezier(.16,1,.3,1), noriWiggle 1.7s ease-in-out .6s 2; }
  .nori-beacon{ position:absolute; top:4px; right:4px; width:12px; height:12px; border-radius:50%; background:#E03020; border:2px solid #fff; animation:beacon 1.8s ease-out infinite; }
  @keyframes fabIn{ from{opacity:0; transform:scale(.5) translateY(12px)} to{opacity:1; transform:scale(1) translateY(0)} }
  @keyframes noriWiggle{ 0%,100%{transform:rotate(0)} 20%{transform:rotate(-9deg)} 40%{transform:rotate(9deg)} 60%{transform:rotate(-5deg)} 80%{transform:rotate(5deg)} }
  @keyframes beacon{ 0%{box-shadow:0 0 0 0 rgba(224,48,32,.5)} 70%{box-shadow:0 0 0 8px rgba(224,48,32,0)} 100%{box-shadow:0 0 0 0 rgba(224,48,32,0)} }

  /* ---------- Compagnon : il VOYAGE (transition souple + rebond) ---------- */
  .nori-overlay{ position:fixed; inset:0; z-index:2147483000; pointer-events:none; }
  .nori-companion{ position:absolute; width:0; height:0; pointer-events:none;
    transition:left .74s cubic-bezier(.34,1.32,.5,1), top .74s cubic-bezier(.34,1.32,.5,1); }

  /* Orbe au point d'ancrage — bond en arc pendant le vol */
  .nori-orbpos{ position:absolute; left:0; top:0; transform:translate(-50%,-50%); pointer-events:none; }
  .nori-orbpos.fly{ animation:hopc .74s cubic-bezier(.4,0,.25,1); }
  @keyframes hopc{
    0%{ transform:translate(-50%,-50%) translateY(0) rotate(0) scale(1); }
    28%{ transform:translate(-50%,-50%) translateY(-46px) rotate(-11deg) scale(1.07); }
    62%{ transform:translate(-50%,-50%) translateY(-8px) rotate(6deg) scale(1); }
    100%{ transform:translate(-50%,-50%) translateY(0) rotate(0) scale(1); }
  }

  .nori-orb{ position:relative; width:70px; height:70px; border-radius:50%; pointer-events:auto; cursor:default;
    background:radial-gradient(circle at 32% 26%, rgba(255,255,255,0.96), rgba(244,244,247,0.6) 58%, rgba(228,228,234,0.4));
    backdrop-filter:blur(12px) saturate(190%); -webkit-backdrop-filter:blur(12px) saturate(190%);
    border:1px solid rgba(255,255,255,0.75);
    box-shadow:0 16px 38px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -9px 20px rgba(0,0,0,0.05), 0 0 26px rgba(224,48,32,0.10);
    display:flex; align-items:center; justify-content:center;
    animation:bob 4.4s ease-in-out infinite, orbIn .6s cubic-bezier(.16,1,.3,1); }
  .nori-orb:hover{ animation:bob 4.4s ease-in-out infinite, jiggle .5s ease; }
  .nori-orb.mini{ width:52px; height:52px; animation:bob 4.4s ease-in-out infinite; }
  .nori-core{ font-size:31px; color:#E03020; line-height:1; filter:drop-shadow(0 2px 7px rgba(224,48,32,0.4)); animation:coreGlow 3s ease-in-out infinite; }
  .nori-orb.mini .nori-core{ font-size:24px; }
  .nori-face{ width:72%; height:72%; border-radius:50%; object-fit:cover; }
  .nori-shine{ position:absolute; top:12%; left:20%; width:34%; height:24%; border-radius:50%; background:radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%); filter:blur(2px); pointer-events:none; }
  .nori-ring{ position:absolute; inset:-8px; border-radius:50%; border:1.5px solid rgba(224,48,32,0.18); animation:ring 2.9s ease-out infinite; pointer-events:none; }
  .nori-aura{ position:absolute; left:0; top:0; width:140px; height:140px; transform:translate(-50%,-50%); border-radius:50%; background:radial-gradient(circle, rgba(224,48,32,0.18) 0%, rgba(195,135,245,0.11) 48%, transparent 72%); filter:blur(10px); animation:auraPulse 5s ease-in-out infinite; pointer-events:none; }

  .nori-orbit{ position:absolute; left:0; top:0; width:0; height:0; animation:spin 9s linear infinite; pointer-events:none; }
  .nori-orbit i{ position:absolute; width:5px; height:5px; border-radius:50%; background:#fff; box-shadow:0 0 8px rgba(255,255,255,0.95), 0 0 4px rgba(224,48,32,0.5); }
  .nori-orbit i:nth-child(1){ transform:translate(42px,-6px); }
  .nori-orbit i:nth-child(2){ transform:translate(-40px,12px); width:4px; height:4px; }
  .nori-orbit i:nth-child(3){ transform:translate(8px,-42px); width:3px; height:3px; }

  .nori-burst{ position:absolute; left:0; top:0; pointer-events:none; }
  .nori-burst i{ position:absolute; left:0; top:0; width:5px; height:5px; border-radius:50%; opacity:0; animation:burst .7s ease-out forwards; }
  .nori-burst i:nth-child(1){ --bx:50px; --by:0px; background:#E03020; }
  .nori-burst i:nth-child(2){ --bx:-46px; --by:8px; background:#C387F5; }
  .nori-burst i:nth-child(3){ --bx:18px; --by:-48px; background:#6E96FF; }
  .nori-burst i:nth-child(4){ --bx:-26px; --by:-40px; background:#E03020; }
  .nori-burst i:nth-child(5){ --bx:38px; --by:32px; background:#C387F5; }
  .nori-burst i:nth-child(6){ --bx:-32px; --by:36px; background:#6E96FF; }

  .nori-speed{ position:absolute; left:0; top:0; pointer-events:none; }
  .nori-speed i{ position:absolute; left:0; top:0; width:2px; height:18px; border-radius:2px; background:linear-gradient(#1D1D1F, transparent); opacity:0; transform-origin:center -42px; animation:speed .62s ease-out forwards; }
  .nori-speed i:nth-child(1){ transform:rotate(25deg); }
  .nori-speed i:nth-child(2){ transform:rotate(115deg); animation-delay:.04s; }
  .nori-speed i:nth-child(3){ transform:rotate(205deg); animation-delay:.08s; }
  .nori-speed i:nth-child(4){ transform:rotate(295deg); animation-delay:.12s; }

  @keyframes bob{ 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes jiggle{ 0%,100%{transform:translateY(-8px) rotate(0)} 30%{transform:translateY(-8px) rotate(-7deg)} 60%{transform:translateY(-8px) rotate(7deg)} }
  @keyframes orbIn{ from{opacity:0; transform:scale(.55)} to{opacity:1; transform:scale(1)} }
  @keyframes coreGlow{ 0%,100%{transform:scale(1); opacity:.92} 50%{transform:scale(1.1); opacity:1} }
  @keyframes ring{ 0%{transform:scale(1); opacity:.55} 70%{opacity:0} 100%{transform:scale(1.6); opacity:0} }
  @keyframes auraPulse{ 0%,100%{opacity:.55; transform:translate(-50%,-50%) scale(1)} 50%{opacity:.9; transform:translate(-50%,-50%) scale(1.12)} }
  @keyframes spin{ from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes burst{ 0%{opacity:1; transform:translate(0,0) scale(1)} 100%{opacity:0; transform:translate(var(--bx),var(--by)) scale(.2)} }
  @keyframes speed{ 0%{opacity:.6; transform:rotate(var(--r,0)) translateY(0)} 100%{opacity:0; transform:rotate(var(--r,0)) translateY(-16px)} }

  /* ---------- Bulle (glass v7) ---------- */
  .nori-bubble-pos{ position:absolute; left:0; top:0; transition:transform .74s cubic-bezier(.34,1.2,.5,1); }
  .nori-bubble{ position:relative; pointer-events:auto;
    background:rgba(255,255,255,0.76);
    backdrop-filter:blur(30px) saturate(200%); -webkit-backdrop-filter:blur(30px) saturate(200%);
    border:1px solid rgba(255,255,255,0.7); border-radius:22px;
    box-shadow:0 26px 64px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.92);
    overflow:hidden; animation:bubbleIn .5s cubic-bezier(.16,1,.3,1); }
  @keyframes bubbleIn{ from{opacity:0; transform:translateY(8px) scale(.94)} to{opacity:1; transform:scale(1)} }

  .nori-trail{ position:absolute; transform:translateX(-50%); display:flex; align-items:center; gap:5px; }
  .nori-trail.down{ top:100%; padding-top:7px; flex-direction:column; }
  .nori-trail.up{ bottom:100%; padding-bottom:7px; flex-direction:column-reverse; }
  .nori-trail i{ border-radius:50%; background:rgba(255,255,255,0.84); border:1px solid rgba(255,255,255,0.7); box-shadow:0 4px 10px rgba(0,0,0,0.10); }
  .nori-trail i:nth-child(1){ width:12px; height:12px; }
  .nori-trail i:nth-child(2){ width:7px; height:7px; }

  .nori-head{ display:flex; align-items:baseline; gap:7px; padding:13px 14px 6px; }
  .nori-name{ font-weight:700; font-size:14px; color:#1D1D1F; font-family:var(--font-sora, Sora, sans-serif); }
  .nori-sub{ font-size:11px; color:#86868B; font-family:var(--font-sora, Sora, sans-serif); }
  .nori-x{ margin-left:auto; border:none; background:rgba(0,0,0,0.05); width:26px; height:26px; border-radius:50%; cursor:pointer; color:#6E6E73; font-size:17px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all .15s ease; }
  .nori-x:hover{ background:rgba(0,0,0,0.09); color:#1D1D1F; }

  .nori-step{ padding:2px 16px; animation:stepIn .42s cubic-bezier(.16,1,.3,1); }
  @keyframes stepIn{ from{opacity:0; transform:translateY(8px)} to{opacity:1; transform:translateY(0)} }
  .nori-title{ display:flex; align-items:center; flex-wrap:wrap; gap:7px; font-size:16px; font-weight:700; color:#1D1D1F; margin:4px 0 8px; letter-spacing:-0.3px; font-family:var(--font-sora, Sora, sans-serif); }
  .nori-line{ font-size:13px; line-height:1.55; color:#48484A; margin:0 0 6px; font-family:var(--font-sora, Sora, sans-serif); }

  .nori-tier{ margin-left:auto; padding:2px 8px; border-radius:999px; font-size:9px; font-weight:800; letter-spacing:.07em; color:#fff; font-family:var(--font-sora, Sora, sans-serif); box-shadow:0 3px 9px rgba(0,0,0,0.18); }
  .nori-tier.pro{ background:#185FA5; }
  .nori-tier.premium{ background:#6E56CF; }

  .nori-dots{ display:flex; gap:5px; justify-content:center; padding:6px 0 2px; flex-wrap:wrap; }
  .nori-dot{ width:6px; height:6px; border-radius:50%; background:rgba(0,0,0,0.12); border:none; padding:0; cursor:pointer; transition:all .25s cubic-bezier(.16,1,.3,1); }
  .nori-dot.on{ background:#1D1D1F; width:16px; border-radius:3px; }
  .nori-dot.done{ background:rgba(0,0,0,0.28); }

  .nori-actions{ display:flex; align-items:center; gap:8px; padding:10px 14px 14px; }
  .nori-spacer{ flex:1; }
  .nori-skip{ border:none; background:none; color:#AEAEB2; font-size:12.5px; cursor:pointer; font-family:var(--font-sora, Sora, sans-serif); }
  .nori-skip:hover{ color:#86868B; }
  .nori-prev{ width:30px; height:30px; border-radius:50%; border:1px solid rgba(0,0,0,0.1); background:rgba(255,255,255,0.6); color:#6E6E73; cursor:pointer; font-size:16px; line-height:1; display:flex; align-items:center; justify-content:center; transition:all .15s ease; }
  .nori-prev:hover{ background:#fff; color:#1D1D1F; }
  .nori-show{ border:1px solid rgba(0,0,0,0.14); background:rgba(255,255,255,0.55); color:#1D1D1F; padding:8px 13px; border-radius:999px; font-size:12.5px; font-weight:600; cursor:pointer; font-family:var(--font-sora, Sora, sans-serif); transition:all .15s ease; backdrop-filter:blur(8px); white-space:nowrap; }
  .nori-show:hover{ background:#fff; transform:translateY(-1px); }
  .nori-show.t-pro{ background:#185FA5; color:#fff; border-color:transparent; box-shadow:0 6px 16px rgba(24,95,165,.3); }
  .nori-show.t-prem{ background:#6E56CF; color:#fff; border-color:transparent; box-shadow:0 6px 16px rgba(110,86,207,.32); }
  .nori-show.t-accent{ background:#E03020; color:#fff; border-color:transparent; box-shadow:0 6px 16px rgba(224,48,32,.3); }
  .nori-show.t-pro:hover, .nori-show.t-prem:hover, .nori-show.t-accent:hover{ transform:translateY(-1px); filter:brightness(1.05); }
  .nori-next{ border:none; background:#1D1D1F; color:#fff; padding:9px 16px; border-radius:999px; font-size:13px; font-weight:700; cursor:pointer; font-family:var(--font-sora, Sora, sans-serif); transition:all .15s ease; box-shadow:0 6px 16px rgba(0,0,0,0.2); white-space:nowrap; }
  .nori-next:hover{ background:#000; transform:translateY(-1px); }

  .nori-links{ display:flex; flex-wrap:wrap; gap:7px; justify-content:center; padding:8px 2px 2px; }
  .nori-chip{ border:1px solid rgba(0,0,0,0.12); background:rgba(255,255,255,0.55); color:#1D1D1F; cursor:pointer; padding:7px 12px; border-radius:999px; font-size:12.5px; font-weight:600; font-family:var(--font-sora, Sora, sans-serif); transition:all .15s ease; backdrop-filter:blur(8px); }
  .nori-chip:hover{ background:#fff; transform:translateY(-1px); }

  @media (max-width:600px){ .nori-fab{ right:16px; bottom:84px; } }
  @media (prefers-reduced-motion:reduce){
    .nori-fab, .nori-pulse, .nori-beacon, .nori-orb, .nori-orb.mini, .nori-core, .nori-ring, .nori-aura, .nori-orbit, .nori-burst i, .nori-speed i, .nori-bubble, .nori-step, .nori-orbpos.fly{ animation:none !important; }
    .nori-companion, .nori-bubble-pos{ transition:none !important; }
  }
`
