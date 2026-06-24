'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePortfolio } from '@/lib/usePortfolio'
import { useMarketData } from '@/lib/useMarketData'
import { useSpreads } from '@/lib/useSpreads'
import { usePlan } from '@/lib/usePlan'
import { usePersona } from '@/lib/usePersona'
import { HubHeader } from './HubHeader'
import { HubInsight } from './HubInsight'
import { HubPortfolioHero } from './HubPortfolioHero'
import { HubCardOfDay } from './HubCardOfDay'
import { HubKpis } from './HubKpis'
import { HubCultureDaily } from './HubCultureDaily'
import { HubCompletion } from './HubCompletion'
import { HubReleases } from './HubReleases'
import { HubMovers } from './HubMovers'
import { HubSpreadsTeaser } from './HubSpreadsTeaser'
import { HubMarketMovers } from './HubMarketMovers'
import { HubMarketPulse } from './HubMarketPulse'
import { HubFooterQuote } from './HubFooterQuote'
import { HubQuickActions } from './HubQuickActions'

/* ── Palette locale (Snow+) ─────────────────────────────────────── */
const ACCENT = { collector: '#E03020', investor: '#185FA5' } as const
const INK = '#1D1D1F', MUTED = '#6E6E73', MUTED2 = '#86868B', LINE = '#E5E5EA'
const MONO = "var(--font-mono, 'Space Mono', monospace)"
const DISPLAY = "var(--font-sora, 'Sora', sans-serif)"
const SHONEN = "var(--font-shonen, 'Sora', sans-serif)"

/**
 * Daily Hub v2 — "KODO DAILY".
 * Une de journal bicephale : meme squelette, deux editions divergentes selon
 * la psychologie du persona (Collectionneur / Investisseur). Tunnel haut->bas :
 * masthead (marque) -> une (hook) -> rubriques (distribue vers le site) ->
 * articles (engagement) -> conversion (fin de tunnel). DA glass conservee.
 */
export function DailyHub() {
  const portfolio = usePortfolio()
  const { isCollector, persona } = usePersona()
  const market = useMarketData(!isCollector)
  const spreads = useSpreads(!isCollector)
  const { isPremium } = usePlan()
  const accent = ACCENT[persona] ?? ACCENT.collector

  const [dateStr, setDateStr] = useState('')
  useEffect(() => {
    const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    setDateStr(d.charAt(0).toUpperCase() + d.slice(1))
  }, [])

  const edition = isCollector ? 'Édition Collectionneur' : 'Édition Investisseur'

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`
        @keyframes kd-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .kd-mast { animation: kd-in .6s cubic-bezier(.32,.72,0,1) both; }
        .kd-stagger > * { opacity: 0; animation: kd-in .55s cubic-bezier(.32,.72,0,1) forwards; }
        .kd-stagger > *:nth-child(1){animation-delay:40ms}
        .kd-stagger > *:nth-child(2){animation-delay:95ms}
        .kd-stagger > *:nth-child(3){animation-delay:150ms}
        .kd-stagger > *:nth-child(4){animation-delay:205ms}
        .kd-stagger > *:nth-child(5){animation-delay:260ms}
        .kd-stagger > *:nth-child(6){animation-delay:315ms}
        .kd-stagger > *:nth-child(7){animation-delay:370ms}
        .kd-stagger > *:nth-child(8){animation-delay:425ms}
        .kd-stagger > *:nth-child(9){animation-delay:480ms}
        .kd-stagger > *:nth-child(10){animation-delay:535ms}
        .kd-stagger > *:nth-child(11){animation-delay:590ms}
        .kd-stagger > *:nth-child(12){animation-delay:645ms}
        .kd-stagger > *:nth-child(13){animation-delay:700ms}
        .kd-stagger > *:nth-child(14){animation-delay:755ms}
        .kd-stagger > *:nth-child(n+15){animation-delay:810ms}
        .kd-rubrique { transition: transform .2s cubic-bezier(.2,.85,.3,1), box-shadow .2s, border-color .2s; }
        .kd-rubrique:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(0,0,0,0.09), inset 0 1px 0 rgba(255,255,255,0.92); border-color: rgba(255,255,255,0.85); }
        .kd-cta { transition: transform .18s cubic-bezier(.2,.85,.3,1); }
        .kd-cta:hover { transform: translateY(-1px); }
        @media (prefers-reduced-motion: reduce) {
          .kd-mast, .kd-stagger > * { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>

      {/* ── MASTHEAD ─────────────────────────────────────────────── */}
      <div className="kd-mast" style={{ marginBottom: 2 }}>
        <div style={{ height: 3, background: INK, borderRadius: 2 }} />
        <div style={{ textAlign: 'center', padding: '16px 0 12px' }}>
          <div style={{
            fontFamily: SHONEN, fontWeight: 700, fontSize: 'clamp(30px, 5vw, 48px)',
            letterSpacing: '0.04em', color: INK, lineHeight: 1, textTransform: 'uppercase',
          }}>
            Kodo <span style={{ color: accent }}>Daily</span>
          </div>
        </div>
        <div style={{ height: 1, background: LINE }} />
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap',
          gap: 8, padding: '9px 2px', fontFamily: MONO, fontSize: 11, color: MUTED,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          <span>{dateStr || '\u00A0'}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}88` }} />
            <span style={{ color: accent, fontWeight: 700 }}>{edition}</span>
          </span>
        </div>
        <div style={{ height: 1, background: LINE }} />
      </div>

      {/* ── CORPS (cascade) ──────────────────────────────────────── */}
      <div className="kd-stagger" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <HubHeader />
        <HubQuickActions />

        {/* Une */}
        <Rubrique label="À la une" accent={accent} />
        {isCollector ? (
          <HubCardOfDay />
        ) : (
          <HubPortfolioHero
            cards={portfolio.cards || []}
            indices={market.indices}
            loading={portfolio.loading || market.loading}
          />
        )}

        <HubInsight
          cards={portfolio.cards || []}
          spreads={spreads.allSignals}
          indices={market.indices}
          loading={portfolio.loading || spreads.loading || market.loading}
        />

        <HubKpis
          topSpread={spreads.allSignals[0] || null}
          topIndex={market.indices[0] || null}
          cardsCount={portfolio.cards?.length || 0}
          loading={market.loading || spreads.loading || portfolio.loading}
        />

        {isCollector && <HubCompletion />}

        {/* Rubriques — le hub distribue vers tout le site */}
        <Rubrique label="Les rubriques" accent={accent} />
        <RubriqueGrid isCollector={isCollector} accent={accent} />

        {/* Pieces / Top valeur */}
        <Rubrique label={isCollector ? 'Tes pièces' : 'Top valeur'} accent={accent} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
          <HubMovers cards={portfolio.cards || []} loading={portfolio.loading} />
        </div>

        {isCollector && <HubCultureDaily />}
        {isCollector && <HubReleases />}

        {/* Vitrine marche — investisseur */}
        {!isCollector && <>
          <Rubrique label="Marché" accent={accent} soon />
          <HubMarketPulse indices={market.indices} loading={market.loading} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
            <HubSpreadsTeaser signals={spreads.allSignals} loading={spreads.loading} />
            <HubMarketMovers />
          </div>
        </>}

        {/* Conversion — fin de tunnel (masque si deja Premium) */}
        {!isPremium && <Conversion isCollector={isCollector} accent={accent} />}

        <HubFooterQuote />
      </div>
    </div>
  )
}

/* ── Rubrique (en-tete de section, façon journal) ───────────────── */
function Rubrique({ label, accent, soon }: { label: string; accent: string; soon?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <span style={{ width: 18, height: 3, background: accent, borderRadius: 2, flexShrink: 0 }} />
      <span style={{
        fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: INK, whiteSpace: 'nowrap',
      }}>{label}</span>
      {soon && (
        <span style={{
          fontFamily: MONO, fontSize: 9.5, fontWeight: 700, color: MUTED2,
          border: `1px solid ${LINE}`, borderRadius: 5, padding: '2px 6px', letterSpacing: '0.08em',
        }}>BIENTÔT</span>
      )}
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  )
}

/* ── Grille de rubriques (cartes de navigation glass) ───────────── */
type Rub = { kicker: string; title: string; desc: string; href: string }
const RUBRIQUES: Record<'collector' | 'investor', Rub[]> = {
  collector: [
    { kicker: 'Catalogue', title: 'Le Pokédesk', desc: 'Explore toutes les cartes, scellés et jeux.', href: '/cartes' },
    { kicker: 'Complétion', title: 'Mes mastersets', desc: 'Suis tes sets et vise le 100 %.', href: '/portfolio/objectifs' },
    { kicker: 'Culture', title: 'Lore & artistes', desc: "L'histoire derrière tes cartes.", href: '/culture' },
    { kicker: 'À venir', title: 'Prochains sets', desc: 'Les sorties à ne pas manquer.', href: '/releases' },
  ],
  investor: [
    { kicker: 'Performance', title: 'Courbe & ROI', desc: 'La valeur de tes actifs dans le temps.', href: '/portfolio/performance' },
    { kicker: 'Allocation', title: 'Répartition', desc: 'Où est concentré ton capital.', href: '/portfolio/allocation' },
    { kicker: 'Gradation', title: 'Faut-il grader ?', desc: 'EV nette réelle, carte par carte.', href: '/portfolio/graded-ev' },
    { kicker: 'Catalogue', title: 'Le Pokédesk', desc: 'Toutes les cartes et leurs cotes.', href: '/cartes' },
  ],
}

function RubriqueGrid({ isCollector, accent }: { isCollector: boolean; accent: string }) {
  const items = isCollector ? RUBRIQUES.collector : RUBRIQUES.investor
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 14 }}>
      {items.map(it => (
        <Link key={it.href} href={it.href} className="kd-rubrique" style={{
          textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 7,
          padding: '18px 18px 16px', borderRadius: 16,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.42) 100%)',
          backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '0.5px solid rgba(255,255,255,0.6)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.85)',
        }}>
          <span style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: accent }}>{it.kicker}</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16.5, color: INK, letterSpacing: '-0.02em' }}>{it.title}</span>
          <span style={{ fontFamily: DISPLAY, fontSize: 13, color: MUTED, lineHeight: 1.45 }}>{it.desc}</span>
          <span style={{ marginTop: 4, fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 600, color: INK, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            Ouvrir <span style={{ color: accent }}>→</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ── Conversion (bout de tunnel, tonalite par persona) ──────────── */
function Conversion({ isCollector, accent }: { isCollector: boolean; accent: string }) {
  const title = isCollector ? 'Passe au Cabinet Premium' : 'Passe au Terminal Premium'
  const lead = isCollector
    ? 'Le meilleur endroit pour héberger, valoriser et compléter ta collection.'
    : 'La couche de décision pour piloter tes actifs avec de la vraie donnée.'
  const points = isCollector
    ? ['Classeurs et collection illimités', 'Valorisation patrimoine — cote FR / EN / JP', 'Historique de valeur complet', 'Alertes sur tes cartes manquantes']
    : ['Faut-il grader ? — EV nette réelle par carte', 'Performance et allocation détaillées', 'Cote multi-marché US / EU / JP', 'Signaux marché (à venir)']

  return (
    <div style={{
      position: 'relative', overflow: 'hidden', borderRadius: 18, padding: '26px 26px',
      background: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.5) 100%)',
      backdropFilter: 'blur(28px) saturate(180%)', WebkitBackdropFilter: 'blur(28px) saturate(180%)',
      border: '0.5px solid rgba(255,255,255,0.7)',
      boxShadow: '0 10px 30px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: -50, right: -50, width: 220, height: 220, borderRadius: '50%',
        background: `radial-gradient(circle, ${accent}24 0%, transparent 70%)`, pointerEvents: 'none',
      }} />
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ flex: '1 1 320px', minWidth: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: accent }}>Abonnement</span>
          <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 'clamp(20px, 3vw, 26px)', letterSpacing: '-0.03em', color: INK, margin: '8px 0 8px' }}>{title}</h3>
          <p style={{ fontFamily: DISPLAY, fontSize: 14, color: MUTED, lineHeight: 1.5, margin: 0, maxWidth: '46ch' }}>{lead}</p>
          <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 9 }}>
            {points.map((p, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontFamily: DISPLAY, fontSize: 13.5, color: INK }}>
                <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10, minWidth: 200 }}>
          <Link href="/abonnement" className="kd-cta" style={{
            textDecoration: 'none', textAlign: 'center', padding: '13px 22px', borderRadius: 999,
            background: INK, color: '#fff', fontFamily: DISPLAY, fontWeight: 700, fontSize: 14, letterSpacing: '-0.01em',
            boxShadow: '0 6px 18px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.16)',
          }}>Voir Premium →</Link>
          <Link href="/abonnement" style={{ textDecoration: 'none', textAlign: 'center', fontFamily: DISPLAY, fontSize: 12.5, fontWeight: 600, color: accent }}>
            Early Supporter · −40 % à vie
          </Link>
        </div>
      </div>
    </div>
  )
}
