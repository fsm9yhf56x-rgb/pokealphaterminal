'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/lib/usePortfolio'
import { useMarketData } from '@/lib/useMarketData'
import { useSpreads } from '@/lib/useSpreads'
import { usePlan } from '@/lib/usePlan'
import { usePersona } from '@/lib/usePersona'
import type { PortfolioCard } from '@/lib/database.types'
import { getCardImageUrl } from '@/lib/images'
import { HubHeader } from './HubHeader'
import { HubInsight } from './HubInsight'
import { HubPortfolioHero } from './HubPortfolioHero'
import { HubCardOfDay } from './HubCardOfDay'
import { HubCultureDaily } from './HubCultureDaily'
import { HubCompletion } from './HubCompletion'
import { HubReleases } from './HubReleases'
import { HubSpreadsTeaser } from './HubSpreadsTeaser'
import { HubMarketMovers } from './HubMarketMovers'
import { HubMarketPulse } from './HubMarketPulse'
import { HubFooterQuote } from './HubFooterQuote'
import { HubQuickActions } from './HubQuickActions'
import { HubNews } from './HubNews'
import { UpgradeModal } from '@/components/upgrade/UpgradeModal'

/* ── Palette locale (Snow+) ─────────────────────────────────────── */
const ACCENT = { collector: '#E03020', investor: '#185FA5' } as const
const INK = '#1D1D1F', MUTED = '#6E6E73', MUTED2 = '#86868B', LINE = '#E5E5EA'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"
const SHONEN = "var(--font-shonen, 'Sora', sans-serif)"

const glassCard = {
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 100%)',
  backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: '0.5px solid rgba(255,255,255,0.6)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.85)',
} as const

function eur(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' K€'
  return Math.round(n) + ' €'
}

/* ── Contexte d'upgrade (passé à la modale) ─────────────────────── */
type Tier = 'pro' | 'premium'
type UpgradeCtx = { tier: Tier; title?: string; sub?: string; previewHref?: string }
type LockInfo = { title: string; sub: string }
type OnLock = (tier: Tier, href: string, lock?: LockInfo) => void


/**
 * Daily Hub v7 — "KODO DAILY". Une de journal hiérarchisée et vivante.
 * Deux niveaux de rubriques (grande = perso important / petite = secondaire),
 * etageres holo 3D, feed leger pour le monde, brief data-driven, gating.
 */
export function DailyHub() {
  const portfolio = usePortfolio()
  const { isCollector, persona } = usePersona()
  const market = useMarketData(!isCollector)
  const spreads = useSpreads(!isCollector)
  const { isPro, isPremium } = usePlan()
  const accent = ACCENT[persona] ?? ACCENT.collector
  const cards = (portfolio.cards || []) as PortfolioCard[]

  // Modale de conversion (déclenchée par les rubriques / lignes verrouillées)
  const [upgrade, setUpgrade] = useState<UpgradeCtx | null>(null)
  const openUpgrade: OnLock = (tier, href, lock) =>
    setUpgrade({ tier, title: lock?.title, sub: lock?.sub, previewHref: href })

  const recent = cards.slice(0, 24)
  const graded = cards.filter(c => c?.graded).slice(0, 24)
  const topValue = [...cards].sort((a, b) => (Number(b?.current_price) || 0) - (Number(a?.current_price) || 0)).slice(0, 24)

  const tagline = isCollector ? 'Tout l\u2019univers des cartes Pokémon' : 'Le terminal des cartes Pokémon'

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <style>{`
        @keyframes kd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kd-tilein { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes kd-sweep { to { transform: translateX(130%); } }
        @keyframes kd-rule { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes kd-pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }
        .kd-mast { animation: kd-in .6s cubic-bezier(.32,.72,0,1) both; }
        .kd-stagger > * { opacity: 0; animation: kd-in .55s cubic-bezier(.32,.72,0,1) forwards; }
        .kd-stagger > *:nth-child(1){animation-delay:40ms}
        .kd-stagger > *:nth-child(2){animation-delay:90ms}
        .kd-stagger > *:nth-child(3){animation-delay:140ms}
        .kd-stagger > *:nth-child(4){animation-delay:190ms}
        .kd-stagger > *:nth-child(5){animation-delay:240ms}
        .kd-stagger > *:nth-child(6){animation-delay:290ms}
        .kd-stagger > *:nth-child(7){animation-delay:340ms}
        .kd-stagger > *:nth-child(8){animation-delay:390ms}
        .kd-stagger > *:nth-child(9){animation-delay:440ms}
        .kd-stagger > *:nth-child(10){animation-delay:490ms}
        .kd-stagger > *:nth-child(11){animation-delay:540ms}
        .kd-stagger > *:nth-child(12){animation-delay:590ms}
        .kd-stagger > *:nth-child(13){animation-delay:640ms}
        .kd-stagger > *:nth-child(n+14){animation-delay:690ms}
        .kd-sweep { position:absolute; inset:0; pointer-events:none; transform: translateX(-130%);
          background: linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.7) 50%, transparent 62%);
          animation: kd-sweep 1.4s cubic-bezier(.4,0,.2,1) .25s 1; }
        .kd-livedot { animation: kd-pulse 2.4s ease-in-out infinite; }
        .kd-drawrule { transform-origin: left; animation: kd-rule .7s cubic-bezier(.4,0,.2,1) both; }
        .kd-rubrique { transition: transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s, border-color .2s; }
        .kd-rubrique:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.92); border-color: rgba(255,255,255,0.85); }
        .kd-cta { transition: transform .18s cubic-bezier(.2,.85,.3,1); }
        .kd-cta:hover { transform: translateY(-1px); }
        .kd-shelf { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x proximity; -ms-overflow-style: none; scrollbar-width: none; }
        .kd-shelf::-webkit-scrollbar { height: 0; display: none; }
        /* indice de defilement : fondu sur le bord droit tant qu il reste des cartes */
        .kd-shelfwrap { position: relative; }
        .kd-shelfwrap::after {
          content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 56px;
          background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.82) 70%, rgba(255,255,255,0.95) 100%);
          pointer-events: none; opacity: 1; transition: opacity .25s ease; border-radius: 0 12px 12px 0;
        }
        .kd-shelfwrap.at-end::after { opacity: 0; }
        .kd-tile { scroll-snap-align: start; position: relative; opacity: 0; animation: kd-tilein .5s cubic-bezier(.2,.85,.3,1) forwards; }
        .kd-tile:hover { z-index: 10; }
        .kd-shelf { cursor: grab; }
        .kd-shelf.kd-dragging { cursor: grabbing; scroll-snap-type: none; }
        .kd-shelf.kd-dragging .kd-tiltcard { transform: none !important; transition: none !important; }
        .kd-shelf.kd-dragging * { user-select: none; }
        .kd-tiltcard { transition: transform .16s ease-out; will-change: transform; transform: perspective(700px); }
        .kd-shine { position:absolute; inset:0; border-radius:10px; opacity:0; transition:opacity .2s; pointer-events:none; mix-blend-mode: overlay;
          background: radial-gradient(circle at var(--mx,50%) var(--my,50%), rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 45%); }
        .kd-brief { transition: background .15s; }
        .kd-brief:hover { background: rgba(0,0,0,0.025); }
        .kd-brief .kd-arrow { transition: transform .18s; }
        .kd-brief:hover .kd-arrow { transform: translateX(3px); }
        @media (prefers-reduced-motion: reduce) {
          .kd-mast, .kd-stagger > *, .kd-tile, .kd-drawrule, .kd-livedot { animation: none !important; opacity: 1 !important; transform: none !important; }
          .kd-sweep { display: none; }
        }
      `}</style>

      {/* ── MASTHEAD ─────────────────────────────────────────────── */}
      <div className="kd-mast" style={{ marginBottom: 2 }}>
        <div style={{ textAlign: 'center', padding: '4px 0 12px' }}>
          <span style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', padding: '0 6px' }}>
            <span style={{ fontFamily: SHONEN, fontWeight: 700, fontSize: 'clamp(30px, 5vw, 48px)', letterSpacing: '0.04em', color: INK, lineHeight: 1, textTransform: 'uppercase' }}>
              Kodo <span style={{ color: accent }}>Daily</span>
            </span>
            <span className="kd-sweep" />
          </span>
        </div>
        <div style={{ height: 1, background: LINE }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '9px 2px', fontFamily: MONO, fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          <span className="kd-livedot" style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}88` }} />
          <span>{tagline}</span>
        </div>
        <div style={{ height: 1, background: LINE }} />
      </div>

      {/* ── CORPS (cascade) ──────────────────────────────────────── */}
      <div className="kd-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <HubHeader />
        <HubQuickActions />

        <HubNews accent={accent} />

        {isCollector ? <>
          {/* ░░ LA UNE — héros + joyau (importance max) */}
          <GrandeRubrique label="À la une" accent={accent} sub="Ta pièce du jour" />
          <HubCardOfDay />
          {/* La pepite suit la carte du jour : les deux racontent l'univers,
              elles se repondent. Isolee en fin de page, elle n'etait pas lue. */}
          <div style={{ marginTop: 14 }}><HubCultureDaily /></div>
          <HubInsight cards={cards} spreads={spreads.allSignals} indices={market.indices} loading={portfolio.loading || spreads.loading || market.loading} />

          {/* ░░ TA QUÊTE — le moteur de complétion (remonté) */}
          <GrandeRubrique label="Ta quête" accent={accent} sub="Ton prochain set à finir" />
          <HubCompletion />

          {/* ░░ TES CARTES — vignettes holo (fierté visuelle) */}
          <GrandeRubrique label="Tes cartes" accent={accent} sub="Ta vitrine" />
          <CardShelf items={recent} loading={portfolio.loading} accent={accent} showPrice={false}
            emptyLabel="Ta collec est vide — ajoute ta première carte." emptyHref="/cartes" />
          {graded.length > 0 && <>
            <Rubrique label="Tes pièces certifiées" accent={accent} />
            <CardShelf items={graded} loading={false} accent={accent} showPrice={false} />
          </>}

          {/* ▒ TA COLLEC EN CHIFFRES — stats légères (rétrogradé) */}
          <Rubrique label="Ta collec en chiffres" accent={accent} />
          <PrideStats cards={cards} />
        </> : <>
          {/* ░░ LA UNE — portefeuille (importance max) */}
          <GrandeRubrique label="À la une" accent={accent} sub="Ton portefeuille" />
          <HubPortfolioHero cards={cards} indices={market.indices} loading={portfolio.loading || market.loading} />
          <HubInsight cards={cards} spreads={spreads.allSignals} indices={market.indices} loading={portfolio.loading || spreads.loading || market.loading} />

          {/* ░░ TON BRIEF — actionnable (perso important) */}
          {cards.length > 0 && <>
            <GrandeRubrique label="Ton brief du jour" accent={accent} sub="Ce qui mérite ton attention" />
            <BriefCard cards={cards} accent={accent} isPro={isPro} isPremium={isPremium} onLock={openUpgrade} />
          </>}

          {/* ░░ TES POSITIONS — vignettes + cote (visuel) */}
          <GrandeRubrique label="Tes positions" accent={accent} sub="Tes plus grosses valeurs" />
          <CardShelf items={topValue} loading={portfolio.loading} accent={accent} showPrice={true}
            emptyLabel="Aucune position — ajoute ta première carte." emptyHref="/cartes" />
        </>}

        {/* ▒ EXPLORER — navigation (secondaire) — investisseur */}
        {!isCollector && <>
          <Rubrique label="Explorer" accent={accent} />
          <RubriqueGrid accent={accent} isPro={isPro} isPremium={isPremium} onLock={openUpgrade} />

          {/* ▒ LE MARCHÉ — vitrine (secondaire, SOON) */}
          <Rubrique label="Le marché" accent={accent} soon />
          <HubMarketPulse indices={market.indices} loading={market.loading} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
            <HubSpreadsTeaser signals={spreads.allSignals} loading={spreads.loading} />
            <HubMarketMovers />
          </div>
        </>}

        {/* ▒ LE MONDE POKÉMON — actu réelle + sorties + culture (partagé) */}
        <Rubrique label="Le monde Pokémon" accent={accent} />
        <HubReleases />

        {/* CONVERSION + signature */}
        {!isPremium && <Conversion isCollector={isCollector} accent={accent} />}
        <HubFooterQuote />
      </div>

      {/* ── MODALE DE CONVERSION (pro / premium) ─────────────────── */}
      <UpgradeModal
        open={!!upgrade}
        onClose={() => setUpgrade(null)}
        tier={upgrade?.tier ?? 'pro'}
        feature={upgrade ? { title: upgrade.title, subtitle: upgrade.sub, previewHref: upgrade.previewHref } : undefined}
      />
    </div>
  )
}

/* ── GrandeRubrique (section majeure — filet noir qui se trace) ──── */
function GrandeRubrique({ label, accent, sub }: { label: string; accent: string; sub?: string }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 22, height: 4, background: accent, borderRadius: 2 }} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase', color: INK }}>{label}</span>
        </span>
        {sub && <span style={{ fontFamily: MONO, fontSize: 10.5, color: MUTED2, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{sub}</span>}
      </div>
      <div className="kd-drawrule" style={{ height: 1, marginTop: 10, background: `linear-gradient(90deg, ${accent} 0%, ${accent}66 16%, ${LINE} 52%, transparent 100%)` }} />
    </div>
  )
}

/* ── Rubrique (section secondaire — filet fin) ──────────────────── */
function Rubrique({ label, accent, soon }: { label: string; accent: string; soon?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
      <span style={{ width: 16, height: 3, background: accent, borderRadius: 2, flexShrink: 0, opacity: 0.85 }} />
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED, whiteSpace: 'nowrap' }}>{label}</span>
      {soon && <span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: MUTED2, border: `1px solid ${LINE}`, borderRadius: 5, padding: '2px 6px', letterSpacing: '0.08em' }}>BIENTÔT</span>}
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  )
}

/* ── CountUp (chiffre animé 0 → valeur) ─────────────────────────── */
function CountUp({ value, dur = 900 }: { value: number; dur?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur)
      setN(Math.round((1 - Math.pow(1 - p, 3)) * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, dur])
  return <>{n}</>
}

/* ── Vignette carte (image_url + fallback) ──────────────────────── */
function CardThumb({ url, name }: { url: string | null; name: string }) {
  const [err, setErr] = useState(false)
  if (!url || err) {
    const initial = (name || '?').trim().charAt(0).toUpperCase()
    return (
      <div style={{ width: '100%', aspectRatio: '5 / 7', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg, #F0F0F3 0%, #E2E2E7 100%)', color: '#B8B8BF', fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, border: '0.5px solid rgba(0,0,0,0.06)' }}>{initial}</div>
    )
  }
  return <img src={url} alt={name} loading="lazy" onError={() => setErr(true)} style={{ width: '100%', aspectRatio: '5 / 7', objectFit: 'cover', borderRadius: 10, display: 'block', border: '0.5px solid rgba(0,0,0,0.06)' }} />
}

/* ── TiltTile (carte holo 3D suivant le curseur) ────────────────── */
function TiltTile({ c, accent, showPrice, index }: { c: PortfolioCard; accent: string; showPrice: boolean; index: number }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const shineRef = useRef<HTMLDivElement>(null)
  const reduced = useRef(false)
  useEffect(() => { reduced.current = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches }, [])
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced.current || !cardRef.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height
    cardRef.current.style.transform = `perspective(700px) rotateX(${(0.5 - py) * 16}deg) rotateY(${(px - 0.5) * 16}deg) scale(1.06)`
    if (shineRef.current) {
      shineRef.current.style.opacity = '1'
      shineRef.current.style.setProperty('--mx', `${px * 100}%`)
      shineRef.current.style.setProperty('--my', `${py * 100}%`)
    }
  }
  const onLeave = () => {
    if (cardRef.current) cardRef.current.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg) scale(1)'
    if (shineRef.current) shineRef.current.style.opacity = '0'
  }
  const grade = [c?.grade_company, c?.grade_value].filter(Boolean).join(' ')
  const price = Number(c?.current_price) || 0
  return (
    <div className="kd-tile" style={{ width: 120, flex: '0 0 120px', animationDelay: `${index * 45}ms` }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={cardRef} className="kd-tiltcard" style={{ position: 'relative', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,0.12)' }}>
        <CardThumb url={c?.image_url || getCardImageUrl({ lang: c?.lang as any, setId: c?.set_id || '', localId: c?.card_number || '' }) || null} name={c?.name} />
        {grade && <span style={{ position: 'absolute', top: 6, left: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: '#fff', background: 'rgba(20,20,22,0.82)', padding: '2px 6px', borderRadius: 5, letterSpacing: '0.03em', backdropFilter: 'blur(4px)' }}>{grade}</span>}
        {c?.is_favorite && <span style={{ position: 'absolute', top: 6, right: 6, fontSize: 12, color: '#F5A623', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.4))' }}>★</span>}
        {c?.qty > 1 && <span style={{ position: 'absolute', bottom: 6, right: 6, fontFamily: MONO, fontSize: 9, fontWeight: 700, color: INK, background: 'rgba(255,255,255,0.92)', padding: '1px 5px', borderRadius: 5 }}>×{c.qty}</span>}
        <div ref={shineRef} className="kd-shine" />
      </div>
      <div style={{ marginTop: 8, fontFamily: DISPLAY, fontWeight: 600, fontSize: 12.5, color: INK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c?.name || 'Carte'}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 11, color: MUTED, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c?.set_name || '—'}</div>
      {showPrice && price > 0 && <div style={{ marginTop: 2, fontFamily: MONO, fontSize: 12, fontWeight: 700, color: accent }}>{eur(price)}</div>}
    </div>
  )
}

/* ── CardShelf ──────────────────────────────────────────────────── */
/* Glisser-deposer a la souris sur une rangee scrollable.
   Seuil de 4px : en dessous c est un clic (la fiche s ouvre), au dessus un glissement. */
function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let down = false, moved = false, startX = 0, startScroll = 0

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      down = true; moved = false
      startX = e.clientX; startScroll = el.scrollLeft
    }
    const onMove = (e: PointerEvent) => {
      if (!down) return
      const dx = e.clientX - startX
      if (!moved && Math.abs(dx) < 4) return
      if (!moved) { moved = true; el.classList.add('kd-dragging') }
      e.preventDefault()
      el.scrollLeft = startScroll - dx
    }
    const stop = () => {
      down = false
      if (moved) { el.classList.remove('kd-dragging'); setTimeout(() => { moved = false }, 0) }
    }
    const onClick = (e: MouseEvent) => { if (moved) { e.preventDefault(); e.stopPropagation() } }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove, { passive: false })
    window.addEventListener('pointerup', stop)
    el.addEventListener('click', onClick, true)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', stop)
      el.removeEventListener('click', onClick, true)
    }
  }, [])
  return ref
}

function CardShelf({ items, loading, accent, showPrice, emptyLabel, emptyHref }: {
  items: PortfolioCard[]; loading: boolean; accent: string; showPrice: boolean; emptyLabel?: string; emptyHref?: string;
}) {
  const dragRef = useDragScroll()
  if (!loading && items.length === 0) {
    if (!emptyLabel) return null
    return (
      <Link href={emptyHref || '/cartes'} className="kd-rubrique" style={{ ...glassCard, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px', gap: 14 }}>
        <span style={{ fontFamily: DISPLAY, fontSize: 14, color: MUTED }}>{emptyLabel}</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 13.5, color: accent, whiteSpace: 'nowrap' }}>Ajouter →</span>
      </Link>
    )
  }
  return (
    <div style={{ ...glassCard, padding: '14px 4px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 14px 8px' }}>
        <Link href="/portfolio" style={{ fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 600, color: accent, textDecoration: 'none' }}>Voir tout →</Link>
      </div>
      <div className="kd-shelfwrap">
      <div ref={dragRef} className="kd-shelf" onScroll={(e) => {
        const el = e.currentTarget
        const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8
        el.parentElement?.classList.toggle('at-end', end)
      }} style={{ display: 'flex', gap: 14, padding: '12px 14px 14px' }}>
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ width: 120, flex: '0 0 120px' }}><div style={{ width: '100%', aspectRatio: '5 / 7', borderRadius: 10, background: '#EFEFF2' }} /></div>
            ))
          : items.map((c, i) => <TiltTile key={c?.id || i} c={c} index={i} accent={accent} showPrice={showPrice} />)}
      </div>
      </div>
    </div>
  )
}

/* ── PrideStats (collectionneur — fierté SANS prix, animée) ─────── */
function PrideStats({ cards }: { cards: PortfolioCard[] }) {
  const cells = [
    { v: cards.length, l: 'cartes' },
    { v: new Set(cards.map(c => c?.set_name).filter(Boolean)).size, l: 'séries entamées' },
    { v: cards.filter(c => c?.graded).length, l: 'gradées' },
    { v: new Set(cards.map(c => c?.rarity).filter(Boolean)).size, l: 'raretés' },
  ]
  return (
    <div style={{ ...glassCard, padding: '4px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
      {cells.map((c, i) => (
        <div key={i} style={{ padding: '18px 20px', borderLeft: i === 0 ? 'none' : `1px solid ${LINE}` }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 30, letterSpacing: '-0.03em', color: INK, lineHeight: 1 }}><CountUp value={c.v} /></div>
          <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: MUTED }}>{c.l}</div>
        </div>
      ))}
    </div>
  )
}

/* ── TierTag (pastille PRO / PREMIUM, affichée si non éligible) ──── */
function TierTag({ tier, accent }: { tier: Tier; accent: string }) {
  return (
    <span style={{
      fontFamily: MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.06em',
      color: accent, background: `${accent}14`, padding: '2px 6px', borderRadius: 5,
      whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {tier === 'premium' ? 'PREMIUM' : 'PRO'}
    </span>
  )
}

/* ── BriefCard (investisseur — lignes actionnables sur ta data) ──── */
const GRADED_LOCK: LockInfo = {
  title: 'Faut-il grader tes cartes ?',
  sub: 'L\u2019EV nette réelle, carte par carte, frais inclus — pour ne grader que ce qui rapporte.',
}

function BriefCard({ cards, accent, isPro, isPremium, onLock }: { cards: PortfolioCard[]; accent: string; isPro: boolean; isPremium: boolean; onLock: OnLock }) {
  const nCards = cards.length
  const nNoBuy = cards.filter(c => !c?.buy_price).length
  const sum = cards.reduce((a, c) => a + (Number(c?.current_price) || 0), 0)
  const top = cards.reduce((m, c) => (Number(c?.current_price) || 0) > (Number(m?.current_price) || 0) ? c : m, cards[0])
  const conc = sum > 0 ? Math.round(((Number(top?.current_price) || 0) / sum) * 100) : 0
  const nGraded = cards.filter(c => c?.graded).length

  // Allocation = Free (pas de tier) · Graded.ev = Premium · prix d'achat = saisie perso (free)
  const lines: { text: string; cta: string; href: string; tier?: Tier; lock?: LockInfo }[] = []
  if (nNoBuy > 0) lines.push({ text: nNoBuy === nCards ? 'Aucun prix d\u2019achat renseigné — ton ROI n\u2019est pas encore calculé.' : `${nNoBuy} cartes sans prix d\u2019achat — ton ROI est partiel.`, cta: 'Renseigner', href: '/portfolio' })
  if (top && conc > 0) lines.push({ text: `Ta plus grosse position pèse ${conc} % du portefeuille — ${top.name}.`, cta: 'Voir l\u2019allocation', href: '/portfolio/allocation' })
  lines.push(nGraded > 0
    ? { text: `${nGraded} ${nGraded > 1 ? 'cartes gradées' : 'carte gradée'} — vaut-il le coup de grader le reste ?`, cta: 'Faut-il grader ?', href: '/portfolio/graded-ev', tier: 'premium', lock: GRADED_LOCK }
    : { text: 'Aucune carte gradée — repère celles qui valent le coup.', cta: 'Faut-il grader ?', href: '/portfolio/graded-ev', tier: 'premium', lock: GRADED_LOCK })

  const rowBase: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 12px', borderRadius: 10 }

  return (
    <div style={{ ...glassCard, padding: '6px 8px' }}>
      {lines.slice(0, 3).map((l, i) => {
        const locked = !!l.tier && (l.tier === 'premium' ? !isPremium : !isPro)
        const inner = (
          <>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontFamily: DISPLAY, fontSize: 14, color: INK, lineHeight: 1.4 }}>{l.text}</span>
            {locked && <TierTag tier={l.tier as Tier} accent={accent} />}
            <span className="kd-arrow" style={{ fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 700, color: accent, whiteSpace: 'nowrap', flexShrink: 0 }}>{l.cta} →</span>
          </>
        )
        if (locked) {
          return (
            <button key={i} type="button" onClick={() => onLock(l.tier as Tier, l.href, l.lock)} className="kd-brief"
              style={{ ...rowBase, width: '100%', background: 'transparent', border: 'none', borderTop: i === 0 ? 'none' : `1px solid ${LINE}`, cursor: 'pointer', textAlign: 'left' }}>
              {inner}
            </button>
          )
        }
        return (
          <Link key={i} href={l.href} className="kd-brief" style={{ ...rowBase, textDecoration: 'none', borderTop: i === 0 ? 'none' : `1px solid ${LINE}` }}>
            {inner}
          </Link>
        )
      })}
    </div>
  )
}


/* ── Grille de rubriques (investisseur — data + gating) ─────────── */
type Rub = { kicker: string; title: string; desc: string; href: string; tier?: Tier; lock?: LockInfo }
const INVESTOR_RUBRIQUES: Rub[] = [
  { kicker: 'Performance', title: 'Courbe & ROI', desc: 'La valeur de tes actifs dans le temps.', href: '/portfolio/performance', tier: 'pro', lock: { title: 'Suis l\u2019évolution de ta valeur', sub: 'La courbe complète de ton portefeuille et ton ROI réel, mois après mois.' } },
  { kicker: 'Allocation', title: 'Répartition', desc: 'Où est concentré ton capital.', href: '/portfolio/allocation' },
  { kicker: 'Gradation', title: 'Faut-il grader ?', desc: 'L\u2019EV nette réelle, carte par carte.', href: '/portfolio/graded-ev', tier: 'premium', lock: GRADED_LOCK },
]

function RubriqueGrid({ accent, isPro, isPremium, onLock }: { accent: string; isPro: boolean; isPremium: boolean; onLock: OnLock }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
      {INVESTOR_RUBRIQUES.map(it => {
        const locked = it.tier === 'premium' ? !isPremium : it.tier === 'pro' ? !isPro : false
        const badge = locked && it.tier ? (
          <span style={{ position: 'absolute', top: 14, right: 14, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: accent, background: `${accent}14`, padding: '3px 7px', borderRadius: 6 }}>{it.tier === 'premium' ? 'PREMIUM' : 'PRO'}</span>
        ) : null
        const inner = (
          <>
            {badge}
            <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>{it.kicker}</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16.5, color: INK, letterSpacing: '-0.02em' }}>{it.title}</span>
            <span style={{ fontFamily: DISPLAY, fontSize: 13, color: MUTED, lineHeight: 1.45 }}>{it.desc}</span>
            <span style={{ marginTop: 4, fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 600, color: INK, display: 'inline-flex', alignItems: 'center', gap: 5 }}>{locked && it.tier ? 'Découvrir' : 'Ouvrir'} <span style={{ color: accent }}>→</span></span>
          </>
        )
        const boxBase: React.CSSProperties = { ...glassCard, position: 'relative', display: 'flex', flexDirection: 'column', gap: 7, padding: '18px 18px 16px' }

        if (locked && it.tier) {
          return (
            <button key={it.href} type="button" onClick={() => onLock(it.tier as Tier, it.href, it.lock)} className="kd-rubrique"
              style={{ ...boxBase, width: '100%', textAlign: 'left', cursor: 'pointer', appearance: 'none' }}>
              {inner}
            </button>
          )
        }
        return (
          <Link key={it.href} href={it.href} className="kd-rubrique" style={{ ...boxBase, textDecoration: 'none' }}>
            {inner}
          </Link>
        )
      })}
    </div>
  )
}

/* ── Conversion (casual, tonalite par persona) ──────────────────── */
function Conversion({ isCollector, accent }: { isCollector: boolean; accent: string }) {
  const lead = isCollector ? 'Le meilleur endroit pour ranger, montrer et compléter ta collec.' : 'Tout ce qu\u2019il te faut pour piloter tes cartes comme tes actifs.'
  const points = isCollector
    ? ['Tes classeurs et ta collec en illimité', 'Toutes tes cartes réunies au même endroit', 'Suis l\u2019avancement de chaque set', 'Une alerte dès qu\u2019une carte qui te manque sort']
    : ['Faut-il grader ? — l\u2019EV nette réelle, carte par carte', 'Ta perf et ton allocation en détail', 'Les cotes US / EU / JP au même endroit', 'Les signaux marché (bientôt)']
  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '26px', background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)', backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)', border: '0.5px solid rgba(255,255,255,0.7)', boxShadow: '0 10px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
      <div aria-hidden style={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, ${accent}24 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>Premium</span>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(20px, 3vw, 26px)', letterSpacing: '-0.03em', color: INK, margin: '8px 0' }}>Passe en Premium</h3>
          <p style={{ fontFamily: DISPLAY, fontSize: 14, color: MUTED, lineHeight: 1.5, margin: 0, maxWidth: '46ch' }}>{lead}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 9 }}>
            {points.map((p, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontFamily: DISPLAY, fontSize: 13.5, color: INK }}>
                <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />{p}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
          <Link href="/abonnement" className="kd-cta" style={{ textDecoration: 'none', textAlign: 'center', padding: '13px 22px', borderRadius: 999, background: INK, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em', boxShadow: '0 6px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16)' }}>Voir Premium →</Link>
          <Link href="/abonnement" style={{ textDecoration: 'none', textAlign: 'center', fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 600, color: accent }}>Early Supporter · −40 % à vie</Link>
        </div>
      </div>
    </div>
  )
}
