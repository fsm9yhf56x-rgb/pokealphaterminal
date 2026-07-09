'use client'

/**
 * Kodo Cards — Landing Page (glass v7)
 * ────────────────────────────────────────────────────────────────────────────
 * Composant autonome (aucune dépendance externe, hors React).
 * Design system Snow+ v7 inliné pour compiler tel quel dans n'importe quelle route.
 * Tunnel : Hero → Ticker → Stats → Problème/Solution → Features → Personas
 *          → Pricing → Waitlist (accès anticipé) → FAQ → Footer
 *
 * Wiring (au choix, ne clobbe rien) :
 *   // src/app/(landing)/page.tsx
 *   import LandingPage from '@/components/landing/LandingPage'
 *   export default function Page() { return <LandingPage /> }
 *
 * Polices attendues (déjà dans globals via next/font) :
 *   --font-display (Sora) · --font-sans (DM Sans) · --font-mono (Space Mono)
 *   Fallbacks intégrés si absentes.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { Footer } from '@/components/layout/Footer'

// ─── Tokens Snow+ v7 ──────────────────────────────────────────────────────────

const SNOW = {
  bg: '#FFFFFF',
  surface: '#F5F5F7',
  border: '#E5E5EA',
  borderStrong: '#C7C7CC',
  ink: '#1D1D1F',
  muted: '#6E6E73',
  faint: '#86868B',
  accent: '#E03020',
  accent2: '#FF4433',
  green: '#2E9E6A',
} as const

// Glass v7 — rgba .62 + blur 24, double inset (refraction haut / glow bas)
const GLASS: CSSProperties = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  border: 'none',
  boxShadow: [
    '0 4px 24px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.03)',
    'inset 0 1px 0 rgba(255,255,255,0.95)',
    'inset 0 -1px 0 rgba(255,255,255,0.4)',
  ].join(', '),
}

// ─── Hooks utilitaires ──────────────────────────────────────────────────────────

/** Détecte l'entrée dans le viewport (une seule fois). */
function useInView<T extends HTMLElement>(rootMargin = '-12% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { rootMargin, threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootMargin])
  return { ref, inView }
}

/** Nav qui se givre au scroll. */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

// ─── Composants primitifs ───────────────────────────────────────────────────────

/** Reveal au scroll (fade + translate). */
function Reveal({
  children,
  delay = 0,
  as: Tag = 'div',
  className,
  style,
}: {
  children: ReactNode
  delay?: number
  as?: 'div' | 'section' | 'li'
  className?: string
  style?: CSSProperties
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <Tag
      ref={ref as never}
      className={`kc-reveal${inView ? ' kc-in' : ''}${className ? ' ' + className : ''}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </Tag>
  )
}

/** Compteur animé déclenché à l'apparition. */
function CountUp({
  to,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1400,
}: {
  to: number
  decimals?: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const { ref, inView } = useInView<HTMLSpanElement>('-5% 0px')
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(to * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, to, duration])
  const display = val.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return (
    <span ref={ref}>
      {prefix}
      {display}
      {suffix}
    </span>
  )
}

// ─── Icônes (SVG inline, stroke courant) ────────────────────────────────────────

const Icon = {
  book: (
    <path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2zM17 3h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6" />
  ),
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  bolt: <path d="M13 2 4 14h6l-1 8 9-12h-6z" />,
  spark: (
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  ),
  whale: (
    <path d="M3 13c0 4 3 6 7 6 5 0 8-4 11-4M3 13c0-3 2-6 6-6 3 0 5 2 5 5M17 8c1.5 0 3 1 3 3" />
  ),
  target: <path d="M12 2v3M12 19v3M2 12h3M19 12h3M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  shield: <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />,
} as const

function Glyph({ d, size = 22 }: { d: keyof typeof Icon; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {Icon[d]}
    </svg>
  )
}

// ─── Données de contenu ──────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: 'book' as const,
    title: 'Encyclopédie',
    desc: 'Retrouvez les cartes Pokémon, leurs séries, leurs versions et les informations essentielles pour mieux suivre votre collection.',
    badge: 'Disponible',
    live: true,
  },
  {
    icon: 'chart' as const,
    title: 'Portfolio',
    desc: 'Ajoutez vos cartes en quelques clics, suivez votre collection et créez vos classeurs personnalisés.',
    badge: 'Disponible',
    live: true,
  },
  {
    icon: 'target' as const,
    title: 'Séries et progression',
    desc: 'Complétez vos séries plus facilement, suivez votre progression et identifiez les cartes qu’il vous manque pour avancer vers vos master sets.',
    badge: 'Disponible',
    live: true,
  },
  {
    icon: 'shield' as const,
    title: 'Valeur globale',
    desc: 'Suivez sérieusement l’évolution du prix de votre collection avec notre index maison, regroupant les principales sources du marché.',
    badge: 'Disponible',
    live: true,
  },
]

// Fonctionnalités à venir (section « La suite ») — clairement étiquetées, jamais présentées comme actives ailleurs.
const SOON = [
  { icon: 'bolt' as const, title: 'Alertes en temps réel', desc: 'Recevez des notifications sur les cartes et séries que vous souhaitez suivre.' },
  { icon: 'whale' as const, title: 'Marché & tendances', desc: 'Suivez les tendances, les historiques de prix et les mouvements importants du marché.' },
  { icon: 'spark' as const, title: 'Nori, votre assistant', desc: 'L’assistant pensé pour vous aider à analyser une carte, une série et bien plus encore.' },
]

// Tuiles du visuel « master set » du hero : vraies cartes du Set de Base FR
// (tcgdex, ordre du set #1→#18). 'state' raconte l'avancement d'un master set en
// cours : possédée / chase (Dracaufeu #4, liseré or) / manquante (emplacement vide).
const MASTERSET_CARDS = [
  { n: 'Alakazam',   img: 'https://assets.tcgdex.net/fr/base/base1/1/low.webp',  state: 'own' as const },
  { n: 'Tortank',    img: 'https://assets.tcgdex.net/fr/base/base1/2/low.webp',  state: 'own' as const },
  { n: 'Leveinard',  img: 'https://assets.tcgdex.net/fr/base/base1/3/low.webp',  state: 'own' as const },
  { n: 'Dracaufeu',  img: 'https://assets.tcgdex.net/fr/base/base1/4/low.webp',  state: 'chase' as const },
  { n: 'Mélofée',    img: 'https://assets.tcgdex.net/fr/base/base1/5/low.webp',  state: 'own' as const },
  { n: 'Léviator',   img: 'https://assets.tcgdex.net/fr/base/base1/6/low.webp',  state: 'own' as const },
  { n: 'Tygnon',     img: 'https://assets.tcgdex.net/fr/base/base1/7/low.webp',  state: 'own' as const },
  { n: 'Mackogneur', img: 'https://assets.tcgdex.net/fr/base/base1/8/low.webp',  state: 'own' as const },
  { n: 'Magneton',   img: 'https://assets.tcgdex.net/fr/base/base1/9/low.webp',  state: 'miss' as const },
  { n: 'Mewtwo',     img: 'https://assets.tcgdex.net/fr/base/base1/10/low.webp', state: 'own' as const },
  { n: 'Nidoking',   img: 'https://assets.tcgdex.net/fr/base/base1/11/low.webp', state: 'own' as const },
  { n: 'Feunard',    img: 'https://assets.tcgdex.net/fr/base/base1/12/low.webp', state: 'own' as const },
  { n: 'Tartard',    img: 'https://assets.tcgdex.net/fr/base/base1/13/low.webp', state: 'own' as const },
  { n: 'Raichu',     img: 'https://assets.tcgdex.net/fr/base/base1/14/low.webp', state: 'own' as const },
  { n: 'Florizarre', img: 'https://assets.tcgdex.net/fr/base/base1/15/low.webp', state: 'own' as const },
  { n: 'Électhor',   img: 'https://assets.tcgdex.net/fr/base/base1/16/low.webp', state: 'miss' as const },
  { n: 'Dardargnan', img: 'https://assets.tcgdex.net/fr/base/base1/17/low.webp', state: 'own' as const },
  { n: 'Draco',      img: 'https://assets.tcgdex.net/fr/base/base1/18/low.webp', state: 'own' as const },
]

const PERSONAS = [
  { tag: 'Vous complétez des séries ?', icon: 'book' as const, line: 'Suivez votre progression et repérez les cartes manquantes pour avancer plus facilement.' },
  { tag: 'Vous gardez sur le long terme ?', icon: 'shield' as const, line: 'Centralisez votre collection et gardez une vue globale sur son évolution.' },
  { tag: 'Vous achetez et revendez ?', icon: 'chart' as const, line: 'Comparez les prix du marché avant d’acheter, vendre ou garder une carte.' },
  { tag: 'Vous pensez à faire grader ?', icon: 'target' as const, line: 'Consultez les données utiles pour comprendre l’écart entre une carte raw et une carte gradée.' },
]

const COLLECTION_PREVIEW = [
  { n: 'Dracaufeu', s: 'Set de Base · FR', p: '3 381 €' },
  { n: 'Tortank',   s: 'Set de Base · FR', p: '540 €'   },
  { n: 'Mewtwo',    s: 'Set de Base · holo', p: '188 €' },
  { n: 'Léviator',  s: 'Néo · 1re éd.', p: '412 €'      },
] as const

const TICKER = [
  { n: 'Dracaufeu', s: 'Base FR · PSA 9', p: '3 381 €', up: true, d: '+4,2 %' },
  { n: 'Pikachu Illustrator', s: 'Promo · raw', p: '—', up: true, d: '+1,1 %' },
  { n: 'Léviator', s: 'Néo · 1st Ed', p: '412 €', up: false, d: '−2,3 %' },
  { n: 'Mewtwo', s: 'Base · holo', p: '188 €', up: true, d: '+6,8 %' },
  { n: 'Ronflex', s: 'Jungle FR', p: '74 €', up: false, d: '−0,9 %' },
  { n: ' Go Vault', s: 'Scellé EN', p: '128 €', up: true, d: '+3,4 %' },
  { n: 'Évoli', s: 'SV · alt art', p: '96 €', up: true, d: '+2,0 %' },
  { n: 'Tortank', s: 'Base FR · PSA 8', p: '540 €', up: false, d: '−1,5 %' },
]

const FAQ = [
  {
    q: 'Est-ce vraiment gratuit ?',
    a: 'Oui. Vous pouvez commencer gratuitement, sans carte bancaire, et découvrir les fonctionnalités essentielles. Les offres payantes débloquent des fonctions avancées qui améliorent l’expérience de collection.',
  },
  {
    q: 'Comment suivre la valeur de ma collection Pokémon ?',
    a: 'Ajoutez vos cartes à un portfolio et suivez leur valeur estimée dans le temps. L’objectif n’est pas de donner un prix magique, mais de vous offrir un repère clair sur l’évolution de votre collection, set par set.',
  },
  {
    q: 'Comment connaître le prix d’une carte française ?',
    a: 'Le prix d’une carte française peut différer de celui d’une carte anglaise ou japonaise. Kodo Cards distingue les langues pour éviter les estimations approximatives et vous aider à comprendre la valeur réelle selon la version, l’état et le marché.',
  },
  {
    q: 'Pourquoi utiliser un portfolio pour ses cartes ?',
    a: 'Un portfolio vous permet de savoir exactement quelles cartes vous possédez, dans quelles séries, et comment votre collection évolue. C’est bien plus clair qu’un tableur ou des captures d’écran dispersées.',
  },
  {
    q: 'Peut-on suivre ses sets et master sets ?',
    a: 'Oui, Kodo Cards est pensé pour suivre votre progression set par set. Vous voyez les cartes déjà ajoutées et repérez celles qu’il vous manque — utile pour compléter un master set ou organiser vos priorités.',
  },
  {
    q: 'Est-ce que Kodo Cards remplace Cardmarket ou eBay ?',
    a: 'Non. Kodo Cards ne remplace pas les plateformes d’achat et de vente. L’app vous aide à centraliser votre collection, suivre vos cartes et consulter des repères de marché, avant d’acheter, vendre ou comparer.',
  },
  {
    q: 'Les estimations de prix sont-elles garanties ?',
    a: 'Non, une estimation reste un repère, pas une garantie de vente. Le prix réel dépend de la langue, de l’état, de l’édition, de la demande et du moment. Kodo Cards vous aide à prendre du recul ; la décision finale vous appartient.',
  },
  {
    q: 'Peut-on suivre des cartes gradées ?',
    a: 'Oui. La valeur d’une carte peut fortement changer selon sa note, son état et l’organisme de gradation. L’objectif est de vous aider à mieux comprendre l’écart entre une carte raw et une carte gradée.',
  },
  {
    q: 'Quels jeux et quelles langues seront disponibles ?',
    a: 'Pokémon d’abord, en français, anglais et japonais, pour proposer une expérience fiable et complète. L’ambition est ensuite d’étendre à d’autres TCG comme One Piece ou Lorcana — la qualité des données et l’expérience avant tout.',
  },
]

// ─── Sous-composants de section ───────────────────────────────────────────────

function BokehBackground() {
  // 5 nappes Spotlight — radial-gradients translatés (cheap, pas de backdrop-filter)
  return (
    <div className="kc-bokeh" aria-hidden>
      <span className="kc-nappe kc-n1" />
      <span className="kc-nappe kc-n2" />
      <span className="kc-nappe kc-n3" />
      <span className="kc-nappe kc-n4" />
      <span className="kc-nappe kc-n5" />
      <span className="kc-grain" />
    </div>
  )
}

function Nav() {
  const scrolled = useScrolled()
  const [open, setOpen] = useState(false)
  return (
    <header className={`kc-nav${scrolled ? ' kc-nav-frost' : ''}`}>
      <div className="kc-nav-inner">
        <a href="#top" className="kc-logo" aria-label="Kodo Cards">
          <span>Kodo</span>
          <span style={{ color: SNOW.accent }}>&nbsp;Cards</span>
        </a>

        <nav className="kc-nav-links">
          <a href="#product">Produit</a>
          <a href="#features">Fonctionnalités</a>
          <a href="#pricing">Tarifs</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="kc-nav-cta">
          <a href="/login" className="kc-link-ghost">
            Se connecter
          </a>
          <a href="/signup" className="kc-btn kc-btn-primary kc-btn-sm">
            Créer mon compte
          </a>
        </div>

        <button
          className="kc-burger"
          aria-label="Menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span className={open ? 'kc-burger-x' : ''} />
        </button>
      </div>

      {open && (
        <div className="kc-mobile-menu" style={GLASS}>
          <a href="#product" onClick={() => setOpen(false)}>Produit</a>
          <a href="#features" onClick={() => setOpen(false)}>Fonctionnalités</a>
          <a href="#pricing" onClick={() => setOpen(false)}>Tarifs</a>
          <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          <a href="/login" onClick={() => setOpen(false)}>Se connecter</a>
          <a
            href="/signup"
            className="kc-btn kc-btn-primary"
            onClick={() => setOpen(false)}
          >
            Créer mon compte gratuit
          </a>
        </div>
      )}
    </header>
  )
}

function MasterSetPreview() {
  return (
    <div className="kc-ms" style={GLASS}>
      <div className="kc-ms-head">
        <span className="kc-dot" />
        <span className="kc-dot" />
        <span className="kc-dot" />
        <div className="kc-ms-title">
          <span className="kc-ms-name">Set de Base</span>
          <span className="kc-ms-lang">FR</span>
        </div>
        <span className="kc-live"><i /> À JOUR</span>
      </div>

      <div className="kc-ms-grid">
        {MASTERSET_CARDS.map((c, i) => (
          <span
            key={i}
            className={`kc-ms-tile kc-ms-${c.state}`}
            style={{ animationDelay: `${i * 55}ms` }}
            title={c.state === 'miss' ? 'Manquante' : c.n}
          >
            {c.state === 'miss'
              ? <em>+</em>
              : <img src={c.img} alt={c.n} loading="lazy" draggable={false} onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0' }} />}
          </span>
        ))}
      </div>

      <div className="kc-ms-foot">
        <div className="kc-ms-foot-head">
          <span className="kc-ms-foot-label">Progression du master set</span>
          <span className="kc-ms-count">93 / 102</span>
        </div>
        <div className="kc-prog"><div className="kc-prog-bar" style={{ width: '91%' }} /></div>
        <span className="kc-ms-left">Plus que <strong>9 cartes</strong> pour compléter</span>
      </div>

      <div className="kc-ms-star">
        <span className="kc-ms-star-dot" />
        <span className="kc-ms-star-name">Dracaufeu · Set de Base FR</span>
        <span className="kc-ms-star-price">3 381 €</span>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // — Tarifs : Pro aligné Pokéitem (hors offre à vie) · Premium = le total
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')

  // — Offre Early Supporter (-40% a vie Premium, places limitees)
  const [early, setEarly] = useState<{ seatsLeft: number; seatsTotal: number; isOpen: boolean } | null>(null)
  useEffect(() => {
    fetch('/api/early-spots').then(r => r.json()).then(setEarly).catch(() => setEarly(null))
  }, [])
  const EARLY_PRICES = { monthly: '5,99 €', yearly: '52,79 €' } as const
  const EARLY_PERMONTH = '4,40 €/mois'
  const earlyOn = !!early?.isOpen
  const PRICES = {
    pro: { monthly: '3,99 €', yearly: '34,99 €' },
    premium: { monthly: '9,99 €', yearly: '87,99 €' },
  } as const
  const SUFFIX = { monthly: '/mois', yearly: '/an' } as const
  const PERMONTH = { pro: '2,92 €/mois', premium: '7,33 €/mois' } as const
  const TRIAL = { monthly: '3 jours offerts', yearly: '7 jours offerts' } as const

  return (
    <div className="kc-landing" id="top">
      <style>{CSS}</style>
      <BokehBackground />
      <Nav />

      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="kc-hero">
        <div className="kc-hero-grid">
          <div className="kc-hero-copy">
            <Reveal>
              <span className="kc-eyebrow">L’app des collectionneurs Pokémon</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="kc-h1">
                Collectionner des cartes Pokémon{' '}
                <span className="kc-grad">n’a jamais été aussi simple.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="kc-sub">
                Ajoutez vos cartes, suivez vos séries et gardez un œil sur leur
                valeur au fil du temps. Kodo Cards vous aide à mieux organiser
                votre collection.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="kc-hero-cta">
                <a href="/signup" className="kc-btn kc-btn-primary kc-cta-shimmer">
                  Créer mon compte gratuitement
                  <Glyph d="arrow" size={18} />
                </a>
                <a href="#product" className="kc-btn kc-btn-ghost">
                  Voir comment ça marche
                </a>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="kc-trust">
                <Glyph d="shield" size={15} />
                Commencez gratuitement, sans carte bancaire.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="kc-hero-visual">
            <div className="kc-float">
              <MasterSetPreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="kc-stats">
        <Reveal className="kc-stats-grid">
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={3} />
            </div>
            <div className="kc-stat-label">Langues suivies · FR / EN / JP</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={70} suffix=" k+" />
            </div>
            <div className="kc-stat-label">Cartes au catalogue</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={100} suffix=" %" />
            </div>
            <div className="kc-stat-label">De tes sets, suivis carte par carte</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              24<span style={{ fontSize: '0.5em', fontWeight: 500 }}>/</span>7
            </div>
            <div className="kc-stat-label">Cotes mises à jour chaque jour</div>
          </div>
        </Reveal>
      </section>

      {/* ── SUIVRE, SANS COMPLICATION (2 colonnes) ──────────────── */}
      <section className="kc-ps">
        <Reveal>
          <span className="kc-section-tag">Le constat</span>
          <h2 className="kc-h2">
            Suivre sa collection ne devrait pas être aussi compliqué.
          </h2>
        </Reveal>
        <div className="kc-ps-grid">
          <Reveal className="kc-ps-col kc-ps-problem" style={GLASS} delay={60}>
            <h3>Aujourd’hui</h3>
            <ul>
              <li>Vos cartes sont réparties entre classeurs, ETB, boîtes, notes ou fichiers Excel.</li>
              <li>Les prix varient selon les plateformes : eBay, Cardmarket, Vinted ou ventes privées.</li>
              <li>Les cartes gradées, les langues et les produits scellés rendent le suivi encore plus complexe.</li>
              <li>Difficile de savoir ce que vous possédez vraiment, ce qu’il vous manque, et ce que vaut votre collection.</li>
            </ul>
          </Reveal>
          <Reveal className="kc-ps-col kc-ps-solution" style={GLASS} delay={140}>
            <h3>Avec Kodo Cards</h3>
            <ul>
              <li>Votre collection est centralisée au même endroit.</li>
              <li>Vos cartes, séries et classeurs sont organisés clairement.</li>
              <li>Les langues, les versions et les états sont mieux distingués.</li>
              <li>Vous suivez l’évolution de votre collection avec des repères de marché plus lisibles.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── REMETTEZ DE L'ORDRE (3 blocs) ──────────────────────── */}
      <section className="kc-section" id="product">
        <Reveal>
          <span className="kc-section-tag">Organiser</span>
          <h2 className="kc-h2">Remettez de l’ordre dans votre collection.</h2>
        </Reveal>
        <div className="kc-grid-3">
          <Reveal className="kc-feature" style={GLASS}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="chart" /></div>
            <div className="kc-feature-head"><h3>Ajoutez vos cartes</h3></div>
            <p>Retrouvez vos cartes Pokémon et ajoutez-les à votre collection en quelques clics.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={80}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="target" /></div>
            <div className="kc-feature-head"><h3>Suivez vos séries préférées</h3></div>
            <p>Voyez où vous en êtes pour chaque série et repérez les cartes qu’il vous manque.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={160}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="shield" /></div>
            <div className="kc-feature-head"><h3>Gardez un œil sur la valeur</h3></div>
            <p>Une mise à jour quotidienne de vos cartes pour ne rien louper de leur évolution.</p>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES (section 5) ───────────────────────────────── */}
      <section className="kc-section" id="features">
        <Reveal>
          <span className="kc-section-tag">Fonctionnalités</span>
          <h2 className="kc-h2">Tout ce qu’il faut pour suivre sa collection Pokémon.</h2>
        </Reveal>
        <div className="kc-grid-4">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 60} className="kc-feature" style={GLASS}>
              <div className="kc-feature-icon" data-live={f.live}>
                <Glyph d={f.icon} />
              </div>
              <div className="kc-feature-head">
                <h3>{f.title}</h3>
                <span className={`kc-badge${f.live ? ' kc-badge-live' : ''}`}>
                  {f.badge}
                </span>
              </div>
              <p>{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PERSONAS ───────────────────────────────────────────── */}
      {/* ── SPÉCIAL MARCHÉ FRANÇAIS ───────────────────────────── */}
      <section className="kc-section" id="france">
        <Reveal>
          <span className="kc-section-tag">Toutes les langues</span>
          <h2 className="kc-h2">Ne vous arrêtez pas aux cartes françaises.</h2>
          <p className="kc-lead">Kodo Cards distingue les cartes françaises, anglaises et japonaises pour une raison simple : tout le monde ne collectionne pas les cartes françaises. Suivez les cartes dans la langue de votre choix et comprenez mieux les différences de prix.</p>
        </Reveal>
        <div className="kc-grid-3">
          <Reveal className="kc-feature" style={GLASS}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="book" /></div>
            <div className="kc-feature-head"><h3>La cote FR, pour de vrai</h3></div>
            <p>Le prix d’une carte française n’est pas une conversion du prix US : on le suit pour lui-même. Un Dracaufeu Set de Base FR, c’est sa propre cote — pas une estimation.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={80}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="shield" /></div>
            <div className="kc-feature-head"><h3>Toutes les sociétés de gradation</h3></div>
            <p>PSA, PCA, CCC, CGC, BGS, SGC : voyez la valeur d’une carte selon chaque certificateur, et lequel a le plus de demande. De quoi choisir en connaissance de cause.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={160}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="chart" /></div>
            <div className="kc-feature-head"><h3>EN, JP, et bientôt plus</h3></div>
            <p>L’anglais et le japonais suivis comme le français, chacun à sa juste cote. Et d’autres jeux que Pokémon arrivent.</p>
          </Reveal>
        </div>

        <Reveal className="kc-langcompare" style={GLASS} delay={120}>
          <div className="kc-lc-header">
            <h3 className="kc-lc-headline">Même carte, trois marchés.</h3>
            <span className="kc-lc-caption">Alakazam · Set de Base</span>
          </div>
          <div className="kc-lc-row">
            <div className="kc-lc-card" style={{ animationDelay: '0ms' }}>
              <div className="kc-lc-img"><img src="https://assets.tcgdex.net/fr/base/base1/1/high.webp" alt="Alakazam — carte française" loading="lazy" draggable={false} /></div>
              <span className="kc-lc-chip"><span className="kc-lc-flag">🇫🇷</span>Français</span>
            </div>
            <span className="kc-lc-sep" aria-hidden="true">=</span>
            <div className="kc-lc-card" style={{ animationDelay: '130ms' }}>
              <div className="kc-lc-img"><img src="https://assets.tcgdex.net/en/base/base1/1/high.webp" alt="Alakazam — carte anglaise" loading="lazy" draggable={false} /></div>
              <span className="kc-lc-chip"><span className="kc-lc-flag">🇺🇸</span>Anglais</span>
            </div>
            <span className="kc-lc-sep" aria-hidden="true">=</span>
            <div className="kc-lc-card" style={{ animationDelay: '260ms' }}>
              <div className="kc-lc-img"><img src="https://pub-1aade8805ea544358d85a303c1feef41.r2.dev/jp/expansion-pack/575601.jpg" alt="Alakazam — carte japonaise" loading="lazy" draggable={false} /></div>
              <span className="kc-lc-chip"><span className="kc-lc-flag">🇯🇵</span>Japonais</span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── VALEUR (section 7) ─────────────────────────────────── */}
      <section className="kc-section" id="value">
        <Reveal>
          <span className="kc-section-tag">La valeur, en douceur</span>
          <h2 className="kc-h2">Comprendre la valeur, sans perdre le plaisir de la collection.</h2>
          <p className="kc-lead">Certaines cartes comptent pour l’histoire qu’elles racontent. D’autres par leur rareté, leur état ou leur demande sur le marché. Kodo Cards vous aide à suivre les deux : la collection que vous construisez, et la valeur qu’elle peut prendre avec le temps.</p>
        </Reveal>
        <div className="kc-grid-3">
          <Reveal className="kc-feature" style={GLASS}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="shield" /></div>
            <div className="kc-feature-head"><h3>Valeur globale</h3></div>
            <p>Une vision claire de ce que représente votre collection, à jour chaque jour.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={80}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="chart" /></div>
            <div className="kc-feature-head"><h3>Évolution</h3></div>
            <p>Suivez les évolutions importantes de vos cartes et de vos séries au fil du temps.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={160}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="target" /></div>
            <div className="kc-feature-head"><h3>Cartes à surveiller</h3></div>
            <p>Repérez les cartes qui méritent votre attention dans votre collection.</p>
          </Reveal>
        </div>
      </section>

      {/* ── PROFILS (section 8) ─────────────────────────────────── */}
      <section className="kc-section" id="personas">
        <Reveal>
          <span className="kc-section-tag">Pour qui</span>
          <h2 className="kc-h2">Un outil pensé pour chaque façon de collectionner.</h2>
        </Reveal>
        <div className="kc-grid-3 kc-personas">
          {PERSONAS.map((p, i) => (
            <Reveal key={p.tag} delay={i * 50} className="kc-persona" style={GLASS}>
              <div className="kc-persona-icon"><Glyph d={p.icon} /></div>
              <div className="kc-persona-body">
                <div className="kc-persona-tag">{p.tag}</div>
                <p>{p.line}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── LA SUITE (section 9) ───────────────────────────────── */}
      <section className="kc-section" id="soon">
        <Reveal>
          <span className="kc-section-tag">La suite</span>
          <h2 className="kc-h2">Ce que Kodo Cards vous prépare.</h2>
          <p className="kc-lead">Nous voulons d’abord proposer un suivi de collection fiable, clair et agréable. Ensuite, Kodo Cards ajoutera progressivement des outils plus avancés pour mieux comprendre le marché et prendre de meilleures décisions.</p>
        </Reveal>
        <div className="kc-grid-3">
          {SOON.map((f, i) => (
            <Reveal key={f.title} delay={i * 60} className="kc-feature kc-feature-soon" style={GLASS}>
              <div className="kc-feature-icon"><Glyph d={f.icon} /></div>
              <div className="kc-feature-head">
                <h3>{f.title}</h3>
                <span className="kc-badge">Bientôt</span>
              </div>
              <p>{f.desc}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <section className="kc-section" id="pricing">
        <Reveal>
          <span className="kc-section-tag">Tarifs</span>
          <h2 className="kc-h2">Commencez gratuitement. Passez à la vitesse supérieure quand vous en avez besoin.</h2>
        </Reveal>
        <Reveal className="kc-billing-wrap">
          <div className="kc-billing" role="tablist">
            <button className={billing === 'monthly' ? 'kc-bill-on' : ''} onClick={() => setBilling('monthly')}>Mensuel</button>
            <button className={billing === 'yearly' ? 'kc-bill-on' : ''} onClick={() => setBilling('yearly')}>
              Annuel <span className="kc-bill-save">−27 %</span>
            </button>
          </div>
        </Reveal>

        <div className="kc-pricing3">
          {/* GRATUIT */}
          <Reveal className="kc-plan" style={GLASS}>
            <div className="kc-plan-head">
              <h3>Gratuit</h3>
            </div>
            <div className="kc-price">0 €<span>toujours</span></div>
            <ul className="kc-plan-list">
              <li><Glyph d="check" size={16} /> Portefeuille + prix — jusqu’à 800 cartes</li>
              <li><Glyph d="check" size={16} /> Prix consolidés eBay · Cardmarket</li>
              <li><Glyph d="check" size={16} /> Cote FR native · EN · JP</li>
              <li><Glyph d="check" size={16} /> Encyclopédie & recherche</li>
              <li><Glyph d="check" size={16} /> Valeur totale de la collection</li>
              <li><Glyph d="check" size={16} /> Wishlist & alertes (3 max)</li>
            </ul>
            <a href="/signup" className="kc-btn kc-btn-ghost kc-btn-block">Commencer gratuitement</a>
          </Reveal>

          {/* PRO */}
          <Reveal className="kc-plan" style={GLASS} delay={80}>
            <div className="kc-plan-head">
              <h3>Pro</h3>
              <span className="kc-trial">{TRIAL[billing]}</span>
            </div>
            <div className="kc-price">{PRICES.pro[billing]}<span>{SUFFIX[billing]}</span></div>
            {billing === 'yearly' && <div className="kc-permonth">soit {PERMONTH.pro}</div>}
            <ul className="kc-plan-list">
              <li><Glyph d="check" size={16} /> Tout le plan Gratuit</li>
              <li><Glyph d="check" size={16} /> Cartes <strong>illimitées</strong></li>
              <li><Glyph d="check" size={16} /> Cartes gradées valorisées dans ton portefeuille</li>
              <li><Glyph d="check" size={16} /> Prix par état — Near Mint à Damaged</li>
              <li><Glyph d="check" size={16} /> Aperçu « Faut-il la grader ? » (note maximale)</li>
              <li><Glyph d="check" size={16} /> Pop reports — PSA, PCA, CCC, CGC, BGS</li>
              <li><Glyph d="check" size={16} /> Graphique d’évolution du portefeuille</li>
              <li><Glyph d="check" size={16} /> Statistiques avancées & P&amp;L</li>
              <li><Glyph d="check" size={16} /> Export du portefeuille</li>
              <li><Glyph d="check" size={16} /> Alertes illimitées</li>
            </ul>
            <a href="/signup" className="kc-btn kc-btn-ghost kc-btn-block">Essayer Pro</a>
          </Reveal>

          {/* PREMIUM */}
          <Reveal className="kc-plan kc-plan-pro" style={GLASS} delay={160}>
            <span className="kc-plan-pop" style={earlyOn ? { background:'#1D1D1F', boxShadow:'0 4px 12px rgba(0,0,0,0.3)' } : undefined}>{earlyOn ? '★ Early Supporter −40 %' : 'Recommandé'}</span>
            <div className="kc-plan-head">
              <h3>Premium</h3>
              <span className="kc-trial">{TRIAL[billing]}</span>
            </div>
            {earlyOn ? (
              <>
                <div className="kc-price">
                  <span style={{ textDecoration:'line-through', opacity:.38, fontSize:'0.55em', fontWeight:600, marginRight:'8px' }}>{PRICES.premium[billing]}</span>
                  {EARLY_PRICES[billing as 'monthly' | 'yearly']}<span>{SUFFIX[billing]}</span>
                </div>
                {billing === 'yearly' && <div className="kc-permonth">soit {EARLY_PERMONTH} · tarif garanti à vie</div>}
                {billing === 'monthly' && <div className="kc-permonth">tarif garanti à vie</div>}
                {typeof early?.seatsLeft === 'number' && (
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#E03020', marginTop:'4px', fontFamily:'var(--font-display)' }}>
                    {early.seatsLeft} place{early.seatsLeft > 1 ? 's' : ''} restante{early.seatsLeft > 1 ? 's' : ''} sur {early.seatsTotal}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="kc-price">{PRICES.premium[billing]}<span>{SUFFIX[billing]}</span></div>
                {billing === 'yearly' && <div className="kc-permonth">soit {PERMONTH.premium}</div>}
              </>
            )}
            <div className="kc-plan-sublabel">Disponible maintenant</div>
            <ul className="kc-plan-list">
              <li><Glyph d="check" size={16} /> Tout le plan Pro</li>
              <li><Glyph d="check" size={16} /> Prix gradés détaillés — toutes notes, toutes sociétés (PSA, PCA, CCC, CGC, BGS)</li>
              <li><Glyph d="check" size={16} /> Faut-il la grader ? — le calcul complet (note probable, gain net)</li>
            </ul>
            <div className="kc-plan-sublabel">Inclus à leur sortie — sans surcoût</div>
            <ul className="kc-plan-list kc-plan-list-soon">
              <li><span className="kc-soon-dot">◌</span> Bonnes affaires — eBay &amp; Cardmarket</li>
              <li><span className="kc-soon-dot">◌</span> Le marché en direct &amp; tendances</li>
              <li><span className="kc-soon-dot">◌</span> Nori, ton experte cartes — en illimité + support prioritaire</li>
            </ul>
            <a href="/signup" className="kc-btn kc-btn-primary kc-btn-block">Passer Premium</a>
            <p className="kc-plan-note">Plusieurs outils arrivent — inclus sans surcoût quand ils sortent.</p>
          </Reveal>
        </div>
      </section>

      {/* ── CTA FINAL (action unique) ──────────────────────────── */}
      <section className="kc-cta-band">
        <Reveal className="kc-cta-card" style={GLASS}>
          <span className="kc-section-tag">Prêt à commencer ?</span>
          <h2 className="kc-h2 kc-h2-center">
            Votre collection, enfin réunie au même endroit.
          </h2>
          <p className="kc-cta-sub">
            Créez votre compte gratuitement et commencez à suivre vos cartes dès maintenant — sans carte bancaire.
          </p>
          <div className="kc-cta-actions">
            <a href="/signup" className="kc-btn kc-btn-primary kc-cta-shimmer">
              Créer mon compte gratuitement
              <Glyph d="arrow" size={18} />
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────── */}
      <section className="kc-section kc-faq" id="faq">
        <Reveal>
          <span className="kc-section-tag">Questions</span>
          <h2 className="kc-h2">Ce qu’on nous demande le plus.</h2>
        </Reveal>
        <div className="kc-faq-list">
          {FAQ.map((item, i) => (
            <Reveal key={i} delay={i * 50}>
              <FaqItem q={item.q} a={item.a} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────── */}
      <Footer />
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="kc-faq-item" style={GLASS}>
      <button className="kc-faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className={`kc-faq-chev${open ? ' kc-open' : ''}`}>+</span>
      </button>
      <div className="kc-faq-a" style={{ maxHeight: open ? 360 : 0 }}>
        <p>{a}</p>
      </div>
    </div>
  )
}

// ─── CSS (scopé sous .kc-landing) ───────────────────────────────────────────────

const CSS = `
.kc-landing{
  --ink:${SNOW.ink}; --muted:${SNOW.muted}; --faint:${SNOW.faint};
  --border:${SNOW.border}; --accent:${SNOW.accent}; --accent2:${SNOW.accent2};
  --green:${SNOW.green}; --surface:${SNOW.surface};
  --display:var(--font-display,'Sora',system-ui,sans-serif);
  --body:var(--font-sans,'DM Sans',system-ui,sans-serif);
  --mono:var(--font-mono,'Space Mono',ui-monospace,monospace);
  --ease:cubic-bezier(.16,1,.3,1);
  position:relative; min-height:100vh; background:#fff; color:var(--ink);
  font-family:var(--body); -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.kc-landing *{box-sizing:border-box;}
.kc-landing a{color:inherit;text-decoration:none;}
.kc-landing h1,.kc-landing h2,.kc-landing h3,.kc-landing h4{font-family:var(--display);margin:0;letter-spacing:-.02em;}

/* Reveal */
.kc-reveal{opacity:0;transform:translateY(26px);transition:opacity .8s var(--ease),transform .8s var(--ease);}
.kc-reveal.kc-in{opacity:1;transform:none;}
.kc-landing section[id]{scroll-margin-top:80px;}

/* Bokeh */
.kc-bokeh{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.kc-nappe{position:absolute;border-radius:50%;filter:blur(60px);opacity:.5;will-change:transform;}
.kc-n1{width:46vw;height:46vw;top:-10vw;left:-8vw;background:radial-gradient(circle,rgba(255,138,90,.55),transparent 70%);animation:bk1 26s var(--ease) infinite alternate;}
.kc-n2{width:42vw;height:42vw;top:5vw;right:-12vw;background:radial-gradient(circle,rgba(90,150,255,.5),transparent 70%);animation:bk2 30s var(--ease) infinite alternate;}
.kc-n3{width:38vw;height:38vw;bottom:-6vw;left:8vw;background:radial-gradient(circle,rgba(170,120,255,.45),transparent 70%);animation:bk3 34s var(--ease) infinite alternate;}
.kc-n4{width:34vw;height:34vw;top:34vw;left:30vw;background:radial-gradient(circle,rgba(90,210,150,.4),transparent 70%);animation:bk4 28s var(--ease) infinite alternate;}
.kc-n5{width:40vw;height:40vw;bottom:-10vw;right:-6vw;background:radial-gradient(circle,rgba(255,120,170,.45),transparent 70%);animation:bk5 32s var(--ease) infinite alternate;}
@keyframes bk1{to{transform:translate(8vw,6vw) scale(1.15);}}
@keyframes bk2{to{transform:translate(-6vw,9vw) scale(1.1);}}
@keyframes bk3{to{transform:translate(7vw,-5vw) scale(1.18);}}
@keyframes bk4{to{transform:translate(-9vw,-7vw) scale(1.12);}}
@keyframes bk5{to{transform:translate(-7vw,-8vw) scale(1.16);}}
.kc-grain{position:absolute;inset:0;opacity:.035;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");}

/* layout container */
.kc-hero,.kc-stats,.kc-ps,.kc-section,.kc-cta-band{position:relative;z-index:1;max-width:1160px;margin:0 auto;padding:0 24px;}

/* NAV */
.kc-nav{position:fixed;top:0;left:0;right:0;z-index:50;transition:background .3s,box-shadow .3s,backdrop-filter .3s;}
.kc-nav-frost{background:rgba(255,255,255,.7);backdrop-filter:blur(20px) saturate(180%);-webkit-backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 rgba(0,0,0,.05);}
.kc-nav-inner{max-width:1160px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;gap:24px;}
.kc-logo{font-family:var(--display);font-weight:700;font-size:19px;display:flex;align-items:center;letter-spacing:-.02em;}
.kc-nav-links{display:flex;gap:26px;margin-left:auto;font-size:14px;color:var(--muted);font-weight:500;}
.kc-nav-links a{transition:color .15s;}
.kc-nav-links a:hover{color:var(--ink);}
.kc-nav-cta{display:flex;align-items:center;gap:14px;}
.kc-link-ghost{font-size:14px;font-weight:600;color:var(--ink);}
.kc-burger{display:none;margin-left:auto;width:40px;height:40px;border:none;background:transparent;cursor:pointer;position:relative;}
.kc-burger span,.kc-burger span::before,.kc-burger span::after{content:'';position:absolute;left:9px;width:22px;height:2px;background:var(--ink);border-radius:2px;transition:transform .25s,opacity .2s;}
.kc-burger span{top:19px;}
.kc-burger span::before{top:-7px;}
.kc-burger span::after{top:7px;}
.kc-burger-x{background:transparent!important;}
.kc-burger-x::before{transform:translateY(7px) rotate(45deg);}
.kc-burger-x::after{transform:translateY(-7px) rotate(-45deg);}
.kc-mobile-menu{position:absolute;top:64px;left:12px;right:12px;border-radius:18px;padding:14px;display:flex;flex-direction:column;gap:4px;}
.kc-mobile-menu a{padding:12px 14px;border-radius:12px;font-weight:600;font-size:15px;}
.kc-mobile-menu a:hover{background:rgba(0,0,0,.04);}

/* Buttons */
.kc-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font-family:var(--display);font-weight:600;font-size:15px;border-radius:13px;padding:13px 22px;cursor:pointer;border:none;transition:transform .15s var(--ease),box-shadow .25s,background .2s,color .2s;white-space:nowrap;}
.kc-btn:active{transform:scale(.97);}
.kc-btn-sm{padding:9px 16px;font-size:14px;border-radius:11px;}
.kc-btn-block{width:100%;}
.kc-btn-primary{background:linear-gradient(135deg,${SNOW.accent},${SNOW.accent2});color:#fff;box-shadow:0 6px 20px rgba(224,48,32,.28);}
.kc-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(224,48,32,.34);}
.kc-btn-ghost{background:rgba(255,255,255,.7);color:var(--ink);box-shadow:inset 0 0 0 1px var(--border);backdrop-filter:blur(8px);}
.kc-btn-ghost:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 1px ${SNOW.borderStrong};}
.kc-cta-shimmer{position:relative;overflow:hidden;}
.kc-cta-shimmer::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,rgba(255,255,255,.45) 50%,transparent 70%);transform:translateX(-120%);animation:shine 4.5s ease-in-out infinite;}
@keyframes shine{0%,55%{transform:translateX(-120%);}80%,100%{transform:translateX(120%);}}

/* HERO */
.kc-hero{padding-top:148px;padding-bottom:60px;}
.kc-hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;}
.kc-eyebrow{display:inline-block;font-family:var(--mono);font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);background:rgba(224,48,32,.08);padding:7px 13px;border-radius:999px;margin-bottom:22px;}
.kc-h1{font-size:clamp(36px,4.4vw,54px);font-weight:700;line-height:1.07;text-wrap:balance;}
.kc-grad{background:linear-gradient(120deg,${SNOW.accent},${SNOW.accent2});-webkit-background-clip:text;background-clip:text;color:transparent;}
.kc-sub{font-size:clamp(16px,1.6vw,19px);line-height:1.6;color:var(--muted);margin:24px 0 0;max-width:34ch;}
.kc-hero-cta{display:flex;gap:14px;margin-top:34px;flex-wrap:wrap;}
.kc-trust{display:flex;align-items:center;gap:8px;margin-top:22px;font-size:13.5px;color:var(--faint);}
.kc-trust svg{color:var(--green);}
.kc-hero-visual{display:flex;justify-content:center;}
.kc-float{animation:float 7s ease-in-out infinite;will-change:transform;width:100%;max-width:380px;}
@keyframes float{0%,100%{transform:translateY(0) rotate(-.4deg);}50%{transform:translateY(-14px) rotate(.4deg);}}

/* Terminal preview */
.kc-terminal{border-radius:22px;padding:18px;width:100%;}
.kc-terminal-bar{display:flex;align-items:center;gap:7px;padding:2px 4px 14px;}
.kc-dot{width:9px;height:9px;border-radius:50%;background:${SNOW.borderStrong};}
.kc-dot:first-child{background:${SNOW.accent};}
.kc-terminal-title{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--faint);margin-left:6px;}
.kc-live{margin-left:auto;display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--green);letter-spacing:.08em;}
.kc-live i{width:6px;height:6px;border-radius:50%;background:var(--green);box-shadow:0 0 0 0 rgba(46,158,106,.5);animation:pulse 2s infinite;}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(46,158,106,.5);}70%{box-shadow:0 0 0 7px rgba(46,158,106,0);}100%{box-shadow:0 0 0 0 rgba(46,158,106,0);}}
.kc-terminal-rows{display:flex;flex-direction:column;gap:2px;}
.kc-trow{display:flex;align-items:center;justify-content:space-between;padding:11px 10px;border-radius:12px;transition:background .15s;}
.kc-trow:hover{background:rgba(255,255,255,.5);}
.kc-trow-name{font-weight:600;font-size:14px;}
.kc-trow-set{font-size:11px;color:var(--faint);margin-top:1px;}
.kc-trow-r{text-align:right;}
.kc-trow-price{font-family:var(--mono);font-weight:700;font-size:14px;}
.kc-trow-delta{font-family:var(--mono);font-size:11px;margin-top:1px;}
.kc-alpha{margin-top:12px;border-radius:14px;padding:13px 14px;background:linear-gradient(135deg,rgba(224,48,32,.07),rgba(255,68,51,.04));box-shadow:inset 0 0 0 1px rgba(224,48,32,.12);}
.kc-alpha-head{display:flex;align-items:center;gap:9px;}
.kc-tier{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,${SNOW.accent},${SNOW.accent2});color:#fff;font-family:var(--display);font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:center;}
.kc-alpha-title{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--accent);}
.kc-alpha-conf{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--faint);}
.kc-alpha-body{font-size:13px;color:var(--ink);margin-top:8px;line-height:1.4;}

/* TICKER */
.kc-ticker{position:relative;z-index:1;margin:24px 0 8px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:rgba(255,255,255,.5);backdrop-filter:blur(10px);overflow:hidden;}
.kc-ticker-track{display:flex;gap:38px;padding:13px 0;width:max-content;animation:marquee 38s linear infinite;}
.kc-tick{display:inline-flex;align-items:center;gap:10px;font-size:13px;color:var(--muted);white-space:nowrap;}
.kc-tick b{color:var(--ink);font-weight:600;}
.kc-tick span{font-family:var(--mono);}
.kc-tick em{font-family:var(--mono);font-style:normal;font-size:12px;}
@keyframes marquee{to{transform:translateX(-50%);}}

/* STATS */
.kc-stats{padding:64px 24px;}
.kc-stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:center;}
.kc-stat-num{font-family:var(--display);font-weight:700;font-size:clamp(30px,3.6vw,44px);letter-spacing:-.03em;background:linear-gradient(120deg,${SNOW.ink},#444);-webkit-background-clip:text;background-clip:text;color:transparent;}
.kc-stat-label{font-size:13.5px;color:var(--muted);margin-top:6px;}

/* SECTION generic */
.kc-section{padding:72px 24px;}
.kc-section-tag{display:inline-block;font-family:var(--mono);font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
.kc-h2{font-size:clamp(28px,3.6vw,42px);font-weight:700;line-height:1.1;max-width:none;}
.kc-h2-center{margin:0 auto;text-align:center;max-width:22ch;}

/* PROBLÈME/SOLUTION */
.kc-ps{padding:40px 24px 8px;}
.kc-ps-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:32px;}
.kc-ps-col{border-radius:22px;padding:30px 28px;}
.kc-ps-col h3{font-size:18px;margin-bottom:18px;}
.kc-ps-col ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:13px;}
.kc-ps-col li{font-size:15px;line-height:1.5;padding-left:24px;position:relative;color:var(--muted);}
.kc-ps-problem li::before{content:'×';position:absolute;left:0;top:-1px;color:var(--accent);font-weight:700;}
.kc-ps-solution li::before{content:'✓';position:absolute;left:0;top:0;color:var(--green);font-weight:700;}
.kc-ps-solution{box-shadow:inset 0 0 0 1.5px rgba(46,158,106,.18),0 4px 24px rgba(0,0,0,.05);}

/* FEATURES */
.kc-grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:36px;}
.kc-personas{grid-template-columns:repeat(2,1fr);}
.kc-feature{border-radius:20px;padding:26px 24px;}
.kc-feature-icon{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--muted);margin-bottom:18px;}
.kc-feature-icon[data-live="true"]{background:linear-gradient(135deg,rgba(224,48,32,.1),rgba(255,68,51,.06));color:var(--accent);}
.kc-feature-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.kc-feature-head h3{font-size:18px;}
.kc-feature p{font-size:14.5px;line-height:1.55;color:var(--muted);margin:0;}
.kc-badge{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);background:var(--surface);padding:4px 9px;border-radius:999px;}
.kc-badge-live{color:var(--green);background:rgba(46,158,106,.1);}

/* PERSONAS */
.kc-persona{border-radius:20px;padding:26px 26px;display:flex;flex-direction:row;align-items:flex-start;gap:18px;}
.kc-persona-icon{flex:none;width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--accent);}
.kc-persona-body{flex:1;min-width:0;}
.kc-persona-tag{font-family:var(--display);font-weight:700;font-size:18px;margin-bottom:6px;}
.kc-persona p{font-size:14.5px;color:var(--muted);margin:0;line-height:1.5;}

/* PRICING */
.kc-billing-wrap{display:flex;justify-content:center;margin-top:30px;}
.kc-billing{display:inline-flex;gap:4px;padding:5px;border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--border);}
.kc-billing button{display:inline-flex;align-items:center;gap:7px;border:none;background:transparent;cursor:pointer;font-family:var(--display);font-weight:600;font-size:14px;color:var(--muted);padding:9px 18px;border-radius:10px;transition:color .2s,background .2s,box-shadow .2s;}
.kc-billing button:hover{color:var(--ink);}
.kc-billing .kc-bill-on{background:#fff;color:var(--ink);box-shadow:0 2px 8px rgba(0,0,0,.08);}
.kc-bill-save{font-family:var(--mono);font-size:10.5px;color:var(--green);background:rgba(46,158,106,.12);padding:2px 7px;border-radius:999px;}
.kc-pricing3{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:34px;align-items:stretch;}
.kc-plan{position:relative;border-radius:24px;padding:30px 26px;display:flex;flex-direction:column;}
.kc-plan-pro{box-shadow:inset 0 0 0 2px rgba(224,48,32,.35),0 16px 44px rgba(224,48,32,.14);}
.kc-plan-pop{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,${SNOW.accent},${SNOW.accent2});color:#fff;font-family:var(--display);font-weight:600;font-size:12px;padding:5px 14px;border-radius:999px;white-space:nowrap;box-shadow:0 4px 14px rgba(224,48,32,.3);}
.kc-plan-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:30px;}
.kc-plan-head h3{font-size:20px;}
.kc-trial{font-family:var(--mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--green);background:rgba(46,158,106,.1);padding:4px 9px;border-radius:999px;white-space:nowrap;}
.kc-price{font-family:var(--display);font-weight:700;font-size:38px;letter-spacing:-.03em;margin:14px 0 0;line-height:1;}
.kc-price span{font-size:15px;font-weight:500;color:var(--faint);margin-left:5px;}
.kc-permonth{font-size:12.5px;color:var(--faint);margin-top:8px;}
.kc-plan-sublabel { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #86868B; margin: 14px 0 8px; font-family: var(--font-display); }
        .kc-plan-list-soon li { color: #86868B; }
        .kc-soon-dot { font-weight: 700; margin-right: 2px; }
        .kc-plan-list{list-style:none;padding:0;margin:22px 0 24px;display:flex;flex-direction:column;gap:12px;flex:1;}
.kc-plan-list li{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:var(--ink);line-height:1.4;}
.kc-plan-list svg{color:var(--green);flex-shrink:0;margin-top:2px;}
.kc-plan-note{font-size:11.5px;color:var(--faint);margin:13px 0 0;line-height:1.4;text-align:center;}
@media(max-width:920px){.kc-pricing3{grid-template-columns:1fr;max-width:440px;margin-left:auto;margin-right:auto;}}

/* CTA BAND */
.kc-cta-band{padding:48px 24px 24px;}
.kc-cta-card{max-width:680px;margin:0 auto;border-radius:28px;padding:48px 40px;text-align:center;}
.kc-cta-sub{font-size:16px;color:var(--muted);margin:16px auto 28px;max-width:46ch;line-height:1.55;}
.kc-cta-actions{display:flex;justify-content:center;}

/* FAQ */
.kc-faq{max-width:780px;}
.kc-faq-list{display:flex;flex-direction:column;gap:12px;margin-top:32px;}
.kc-faq-item{border-radius:16px;overflow:hidden;}
.kc-faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;background:transparent;border:none;cursor:pointer;font-family:var(--display);font-weight:600;font-size:16px;color:var(--ink);text-align:left;}
.kc-faq-chev{font-size:22px;color:var(--accent);transition:transform .3s var(--ease);flex-shrink:0;line-height:1;}
.kc-faq-chev.kc-open{transform:rotate(45deg);}
.kc-faq-a{overflow:hidden;transition:max-height .35s var(--ease);}
.kc-faq-a p{padding:0 24px 22px;margin:0;font-size:14.5px;line-height:1.6;color:var(--muted);}

/* LEAD (accroche sous les titres de section) */
.kc-lead{font-size:16px;line-height:1.6;color:var(--muted);margin:16px 0 0;max-width:58ch;}

/* GRID 4 (features & la suite) */
.kc-grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:36px;}
@media(max-width:920px){.kc-grid-4{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.kc-grid-4{grid-template-columns:1fr;}}
.kc-feature-soon .kc-feature-icon{background:var(--surface);color:var(--faint);}
.kc-feature-soon h3{color:var(--muted);}

/* MASTER SET preview (hero) */
.kc-ms{border-radius:22px;padding:18px;width:100%;}
.kc-ms-head{display:flex;align-items:center;gap:7px;padding:2px 4px 14px;}
.kc-ms-title{display:flex;align-items:center;gap:8px;margin-left:6px;}
.kc-ms-name{font-family:var(--display);font-weight:700;font-size:15px;}
.kc-ms-lang{font-family:var(--mono);font-size:10px;letter-spacing:.06em;color:var(--faint);background:var(--surface);padding:3px 7px;border-radius:6px;}
.kc-ms-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:7px;}
.kc-ms-tile{aspect-ratio:.72;border-radius:7px;position:relative;overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.05),0 1px 2px rgba(0,0,0,.05);opacity:0;transform:translateY(6px);animation:msIn .5s var(--ease) forwards;}
@keyframes msIn{to{opacity:1;transform:none;}}
.kc-ms-tile img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s var(--ease);}
.kc-ms-tile:hover img{transform:scale(1.08);}
.kc-ms-own{background:#eef0f3;}
.kc-ms-chase{background:#f3ead0;box-shadow:inset 0 0 0 1.5px rgba(212,175,55,.85),0 3px 14px rgba(212,175,55,.5);z-index:1;}
.kc-ms-own::after,.kc-ms-chase::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(150deg,transparent 44%,rgba(255,255,255,.4) 50%,transparent 56%);}
.kc-ms-chase::after{background:linear-gradient(150deg,transparent 35%,rgba(255,240,190,.55) 50%,transparent 65%);background-size:250% 250%;animation:msHolo 4.5s ease-in-out infinite;}
@keyframes msHolo{0%,100%{background-position:0% 50%;}50%{background-position:100% 50%;}}
.kc-ms-miss{background:repeating-linear-gradient(45deg,#f6f6f8,#f6f6f8 6px,#f1f1f4 6px,#f1f1f4 12px);box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);display:flex;align-items:center;justify-content:center;}
.kc-ms-miss em{font-style:normal;font-family:var(--display);font-weight:700;font-size:16px;color:#c7c7cc;}
.kc-ms-foot{margin-top:15px;display:flex;flex-direction:column;gap:7px;}
.kc-ms-foot-head{display:flex;align-items:center;gap:10px;}
.kc-ms-foot-label{font-family:var(--mono);font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint);}
.kc-ms-count{margin-left:auto;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--accent);}
.kc-prog{height:7px;border-radius:999px;background:var(--surface);overflow:hidden;box-shadow:inset 0 0 0 1px rgba(0,0,0,.04);}
.kc-prog-bar{height:100%;border-radius:999px;background:linear-gradient(90deg,${SNOW.accent},${SNOW.accent2});}
.kc-ms-left{font-size:13px;color:var(--muted);}
.kc-ms-left strong{color:var(--accent);}
.kc-ms-star{margin-top:12px;display:flex;align-items:center;gap:9px;padding:11px 13px;border-radius:13px;background:linear-gradient(135deg,rgba(212,175,55,.1),rgba(212,175,55,.03));box-shadow:inset 0 0 0 1px rgba(212,175,55,.2);}
.kc-ms-star-dot{width:8px;height:8px;border-radius:50%;background:linear-gradient(135deg,#f5d76e,#c9a227);flex:none;box-shadow:0 0 8px rgba(212,175,55,.6);}
.kc-ms-star-name{font-size:13px;font-weight:600;color:var(--ink);}
.kc-ms-star-price{margin-left:auto;font-family:var(--mono);font-weight:700;font-size:13.5px;}
@media(prefers-reduced-motion:reduce){.kc-ms-tile{animation:none!important;opacity:1;transform:none;}}

/* ─── HOOKS VISUELS : hover · mouvement · glow (aucun wording touché) ── */
/* Cartes : lift + ombre au survol */
.kc-feature,.kc-persona,.kc-plan,.kc-faq-item,.kc-stat{transition:transform .35s var(--ease),box-shadow .35s var(--ease);will-change:transform;}
.kc-feature:hover,.kc-persona:hover{transform:translateY(-6px);box-shadow:0 18px 40px rgba(0,0,0,.09),0 6px 14px rgba(0,0,0,.05);}
.kc-plan:hover{transform:translateY(-6px);}
.kc-stat:hover{transform:translateY(-4px);}
/* Icônes : micro-animation quand la carte est survolée */
.kc-feature-icon,.kc-persona-icon{transition:transform .35s var(--ease),background .3s,color .3s,box-shadow .3s;}
.kc-feature:hover .kc-feature-icon,.kc-persona:hover .kc-persona-icon{transform:scale(1.09) rotate(-4deg);}
.kc-feature:hover .kc-feature-icon[data-live="true"]{box-shadow:0 8px 20px rgba(224,48,32,.24);}
/* Titre hero : dégradé animé */
.kc-grad{background-size:220% auto;animation:gradShift 6s ease-in-out infinite;}
@keyframes gradShift{0%,100%{background-position:0% center;}50%{background-position:100% center;}}
/* Barre de progression : remplissage à l'apparition */
.kc-prog-bar{animation:progFill 1.5s var(--ease) .35s both;}
@keyframes progFill{from{width:0;}}
/* Puce accent pulsée devant chaque tag de section */
.kc-section-tag{position:relative;padding-left:16px;}
.kc-section-tag::before{content:'';position:absolute;left:0;top:50%;width:7px;height:7px;border-radius:50%;transform:translateY(-50%);background:linear-gradient(135deg,${SNOW.accent},${SNOW.accent2});animation:tagPulse 2.4s ease-in-out infinite;}
@keyframes tagPulse{0%{box-shadow:0 0 0 0 rgba(224,48,32,.45);}70%{box-shadow:0 0 0 6px rgba(224,48,32,0);}100%{box-shadow:0 0 0 0 rgba(224,48,32,0);}}
/* Badge Disponible : shimmer discret */
.kc-badge-live{position:relative;overflow:hidden;}
.kc-badge-live::after{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.65) 50%,transparent 65%);transform:translateX(-140%);animation:badgeShine 5s ease-in-out infinite;}
@keyframes badgeShine{0%,60%{transform:translateX(-140%);}85%,100%{transform:translateX(140%);}}
/* Premium : halo qui respire */
.kc-plan-pro{animation:planGlow 4.5s ease-in-out infinite;}
@keyframes planGlow{0%,100%{box-shadow:inset 0 0 0 2px rgba(224,48,32,.35),0 16px 44px rgba(224,48,32,.14);}50%{box-shadow:inset 0 0 0 2px rgba(224,48,32,.55),0 22px 54px rgba(224,48,32,.24);}}
/* Visuel hero : léger tilt au survol */
.kc-float{transition:transform .4s var(--ease);}
.kc-hero-visual:hover .kc-float{transform:translateY(-6px) scale(1.015);}
/* Liens nav : souligné animé */
.kc-nav-links a{position:relative;}
.kc-nav-links a::after{content:'';position:absolute;left:0;bottom:-4px;height:2px;width:0;border-radius:2px;background:linear-gradient(90deg,${SNOW.accent},${SNOW.accent2});transition:width .25s var(--ease);}
.kc-nav-links a:hover::after{width:100%;}
/* FAQ : accent latéral au survol */
.kc-faq-item:hover{transform:translateX(3px);box-shadow:inset 3px 0 0 ${SNOW.accent},0 6px 22px rgba(0,0,0,.05);}
/* CTA hero : glow pulsé pour attirer le clic */
.kc-cta-shimmer{animation:ctaGlow 3.2s ease-in-out infinite;}
@keyframes ctaGlow{0%,100%{box-shadow:0 6px 20px rgba(224,48,32,.28);}50%{box-shadow:0 10px 30px rgba(224,48,32,.45);}}
/* Reveal : ajoute un léger scale à l'apparition */
.kc-reveal{transform:translateY(26px) scale(.985);}
.kc-reveal.kc-in{transform:none;}
@media(prefers-reduced-motion:reduce){
  .kc-grad,.kc-prog-bar,.kc-section-tag::before,.kc-badge-live::after,.kc-plan-pro,.kc-cta-shimmer{animation:none!important;}
}

/* COMPARATIF 3 LANGUES (section langues) */
.kc-langcompare{margin-top:28px;border-radius:24px;padding:30px 30px 34px;text-align:center;position:relative;overflow:hidden;}
.kc-langcompare::before{content:'';position:absolute;left:50%;top:56%;transform:translate(-50%,-50%);width:80%;height:70%;background:radial-gradient(ellipse at center,rgba(224,48,32,.07),transparent 70%);pointer-events:none;}
.kc-lc-header{margin-bottom:26px;position:relative;}
.kc-lc-headline{font-family:var(--display);font-weight:600;font-size:clamp(15px,1.6vw,18px);letter-spacing:.01em;line-height:1.2;color:var(--muted);}
.kc-lc-caption{display:block;margin-top:6px;font-family:var(--mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);}
.kc-lc-row{display:flex;align-items:flex-start;justify-content:center;gap:26px;position:relative;}
.kc-lc-card{display:flex;flex-direction:column;align-items:center;gap:16px;width:250px;opacity:0;transform:translateY(18px) scale(.95);animation:lcIn .6s var(--ease) forwards;}
@keyframes lcIn{to{opacity:1;transform:none;}}
.kc-lc-img{width:100%;border-radius:15px;overflow:hidden;position:relative;box-shadow:0 20px 44px rgba(0,0,0,.2),0 6px 14px rgba(0,0,0,.1);transition:transform .45s var(--ease),box-shadow .45s var(--ease);}
.kc-lc-img::after{content:'';position:absolute;inset:0;pointer-events:none;background:linear-gradient(140deg,rgba(255,255,255,.32) 0%,transparent 30%,transparent 72%,rgba(0,0,0,.06) 100%);}
.kc-lc-img img{width:100%;display:block;aspect-ratio:.716;object-fit:cover;}
.kc-lc-card:hover .kc-lc-img{transform:translateY(-10px) scale(1.04) rotate(-.6deg);box-shadow:0 32px 60px rgba(0,0,0,.28),0 10px 20px rgba(0,0,0,.13);}
.kc-lc-chip{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:999px;background:transparent;box-shadow:none;font-family:var(--display);font-weight:500;font-size:12.5px;color:var(--faint);}
.kc-lc-flag{font-size:13px;line-height:1;opacity:.85;}
.kc-lc-sep{flex:none;align-self:flex-start;margin-top:160px;font-family:var(--display);font-weight:300;font-size:22px;color:var(--borderStrong,#C7C7CC);}
@media(max-width:920px){.kc-lc-card{width:210px;}.kc-lc-sep{margin-top:135px;}}
@media(max-width:560px){.kc-lc-row{flex-wrap:wrap;gap:16px;}.kc-lc-sep{display:none;}.kc-lc-card{width:44%;}}
@media(prefers-reduced-motion:reduce){.kc-lc-card{animation:none!important;opacity:1;transform:none;}}

/* RESPONSIVE */
@media(max-width:920px){
  .kc-hero-grid{grid-template-columns:1fr;gap:40px;}
  .kc-hero{padding-top:120px;text-align:center;}
  .kc-hero-copy{display:flex;flex-direction:column;align-items:center;}
  .kc-sub{max-width:46ch;}
  .kc-hero-cta,.kc-trust{justify-content:center;}
  .kc-h2{max-width:none;}
  .kc-stats-grid{grid-template-columns:repeat(2,1fr);gap:34px 18px;}
  .kc-ps-grid,.kc-grid-2{grid-template-columns:1fr;}
  .kc-grid-3{grid-template-columns:1fr 1fr;}
  .kc-footer-inner{grid-template-columns:1fr;}
}
@media(max-width:640px){
  .kc-nav-links,.kc-nav-cta{display:none;}
  .kc-burger{display:block;}
  .kc-grid-3{grid-template-columns:1fr;}
  .kc-float{max-width:330px;}
  .kc-cta-card{padding:38px 24px;}
}
@media(prefers-reduced-motion:reduce){
  .kc-nappe,.kc-float,.kc-ticker-track,.kc-cta-shimmer::after,.kc-live i{animation:none!important;}
  .kc-reveal{transition:none;opacity:1;transform:none;}
}
`
