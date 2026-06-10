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
    title: 'Encyclopédie & Prix',
    desc: 'Chaque carte, FR comme EN, avec sa vraie cote. Historique, états, prix gradés PSA — réunis au même endroit.',
    badge: 'Disponible',
    live: true,
  },
  {
    icon: 'chart' as const,
    title: 'Suivi de portefeuille',
    desc: 'Vos holdings, votre ROI réel, votre valeur nette. Votre collection devient un actif que vous pilotez.',
    badge: 'Disponible',
    live: true,
  },
  {
    icon: 'bolt' as const,
    title: 'Alpha Signals',
    desc: 'L’IA repère les cartes sous-évaluées avant le marché. Score S/A/B, raison claire, objectif de prix chiffré.',
    badge: 'Bientôt · v2.0',
    live: false,
  },
  {
    icon: 'spark' as const,
    title: 'Kodo AI',
    desc: 'Un analyste TCG 24/7. Gradation, timing, thèse d’achat — des réponses, pas des graphiques à déchiffrer.',
    badge: 'Bientôt · v2.0',
    live: false,
  },
  {
    icon: 'whale' as const,
    title: 'Whale Tracker',
    desc: 'Ce que les plus gros collectionneurs accumulent, en direct. Lisez le marché par ceux qui le font bouger.',
    badge: 'Bientôt · v3.0',
    live: false,
  },
  {
    icon: 'target' as const,
    title: 'Deal Hunter',
    desc: 'Scan permanent eBay & Cardmarket. Les bonnes affaires arrivent à vous, déjà triées et filtrées.',
    badge: 'Bientôt · v2.0',
    live: false,
  },
]

const PERSONAS = [
  { tag: 'Le Gardien', sub: 'Collectionneur', line: 'Finir le master set, valoriser son musée.' },
  { tag: 'Le Chasseur', sub: 'Trader', line: 'Arbitrer, sniper, encaisser vite.' },
  { tag: 'La Baleine', sub: 'Investisseur', line: 'Piloter un patrimoine, sécuriser le capital.' },
  { tag: 'Grading Hunter', sub: 'Gradation', line: 'Acheter raw, sortir en 10, maximiser le yield.' },
  { tag: 'Le Seller', sub: 'Revendeur', line: 'Une source de vérité pour fixer ses prix.' },
  { tag: 'Trend Follower', sub: 'Hype', line: 'Entrer avant la masse, sortir avant le top.' },
]

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
    q: 'C’est vraiment gratuit ?',
    a: 'Oui. L’encyclopédie, les prix et le suivi de portefeuille sont gratuits, sans carte bancaire. Le plan Pro débloque les outils avancés à venir.',
  },
  {
    q: 'D’où viennent les prix ?',
    a: 'Agrégation des sources de référence du marché — eBay, Cardmarket, PSA et PokeTrace — consolidées et mises à jour chaque jour.',
  },
  {
    q: 'Les cartes françaises sont-elles couvertes ?',
    a: 'Oui, avec une cote FR native. Pas une simple conversion du prix US : la spécificité du marché français est traitée pour elle-même.',
  },
  {
    q: 'Quand arrivent le Terminal et les signaux IA ?',
    a: 'En cours de déploiement (v2.0 et v3.0). Rejoignez l’accès anticipé pour être prévenu en premier et tester avant tout le monde.',
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
          <a href="#features">Produit</a>
          <a href="#pricing">Tarifs</a>
          <a href="/blog">Blog</a>
          <a href="/a-propos">À propos</a>
          <a href="/telecharger">Télécharger</a>
          <a href="#faq">FAQ</a>
        </nav>

        <div className="kc-nav-cta">
          <a href="/login" className="kc-link-ghost">
            Se connecter
          </a>
          <a href="/signup" className="kc-btn kc-btn-primary kc-btn-sm">
            Commencer
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
          <a href="#features" onClick={() => setOpen(false)}>Produit</a>
          <a href="#pricing" onClick={() => setOpen(false)}>Tarifs</a>
          <a href="#personas" onClick={() => setOpen(false)}>Pour qui</a>
          <a href="#faq" onClick={() => setOpen(false)}>FAQ</a>
          <a href="/blog" onClick={() => setOpen(false)}>Blog</a>
          <a href="/a-propos" onClick={() => setOpen(false)}>À propos</a>
          <a href="/telecharger" onClick={() => setOpen(false)}>Télécharger</a>
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

function TerminalPreview() {
  return (
    <div className="kc-terminal" style={GLASS}>
      <div className="kc-terminal-bar">
        <span className="kc-dot" />
        <span className="kc-dot" />
        <span className="kc-dot" />
        <span className="kc-terminal-title">MARKET TERMINAL</span>
        <span className="kc-live">
          <i /> LIVE
        </span>
      </div>

      <div className="kc-terminal-rows">
        {TICKER.slice(0, 4).map((r) => (
          <div key={r.n} className="kc-trow">
            <div className="kc-trow-l">
              <div className="kc-trow-name">{r.n}</div>
              <div className="kc-trow-set">{r.s}</div>
            </div>
            <div className="kc-trow-r">
              <div className="kc-trow-price">{r.p}</div>
              <div
                className="kc-trow-delta"
                style={{ color: r.up ? SNOW.green : SNOW.accent }}
              >
                {r.d}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="kc-alpha">
        <div className="kc-alpha-head">
          <span className="kc-tier">S</span>
          <span className="kc-alpha-title">ALPHA SIGNAL</span>
          <span className="kc-alpha-conf">conf. 92 %</span>
        </div>
        <div className="kc-alpha-body">
          Sous-évaluée de <strong style={{ color: SNOW.green }}>+34 %</strong> vs cote — objectif 250 €
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  // — Funnel : capture email → /api/waitlist (Brevo)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')

  // — Tarifs : Pro aligné Pokéitem (hors offre à vie) · Premium = le total
  const [billing, setBilling] = useState<'weekly' | 'monthly' | 'yearly'>('yearly')

  // — Offre Early Supporter (-40% a vie Premium, places limitees)
  const [early, setEarly] = useState<{ seatsLeft: number; seatsTotal: number; isOpen: boolean } | null>(null)
  useEffect(() => {
    fetch('/api/early-spots').then(r => r.json()).then(setEarly).catch(() => setEarly(null))
  }, [])
  const EARLY_PRICES = { monthly: '5,99 €', yearly: '52,79 €' } as const
  const EARLY_PERMONTH = '4,40 €/mois'
  const earlyOn = !!early?.isOpen && billing !== 'weekly'
  const PRICES = {
    pro: { weekly: '1,99 €', monthly: '3,99 €', yearly: '34,99 €' },
    premium: { weekly: '4,99 €', monthly: '9,99 €', yearly: '87,99 €' },
  } as const
  const SUFFIX = { weekly: '/semaine', monthly: '/mois', yearly: '/an' } as const
  const PERMONTH = { pro: '2,92 €/mois', premium: '7,33 €/mois' } as const
  const TRIAL = { weekly: '3 jours offerts', monthly: '3 jours offerts', yearly: '7 jours offerts' } as const

  async function submitWaitlist(source: string) {
    if (status === 'loading') return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setStatus('err')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source }),
      })
      setStatus(res.ok ? 'ok' : 'err')
    } catch {
      setStatus('err')
    }
  }

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
              <span className="kc-eyebrow">Intelligence de marché Pokémon TCG</span>
            </Reveal>
            <Reveal delay={80}>
              <h1 className="kc-h1">
                Vos cartes ont une vraie valeur.{' '}
                <span className="kc-grad">Prouvez-la.</span>
              </h1>
            </Reveal>
            <Reveal delay={160}>
              <p className="kc-sub">
                Cote FR native, prix consolidés eBay · Cardmarket · PSA et suivi de
                portefeuille en temps réel. L’intelligence de marché que 95 % des
                collectionneurs n’ont pas encore.
              </p>
            </Reveal>
            <Reveal delay={240}>
              <div className="kc-hero-cta">
                <a href="/signup" className="kc-btn kc-btn-primary kc-cta-shimmer">
                  Créer mon compte gratuit
                  <Glyph d="arrow" size={18} />
                </a>
                <a href="#features" className="kc-btn kc-btn-ghost">
                  Voir le produit
                </a>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <p className="kc-trust">
                <Glyph d="shield" size={15} />
                Gratuit jusqu’à 500 cartes · sans carte bancaire · mis à jour chaque jour.
              </p>
            </Reveal>
          </div>

          <Reveal delay={200} className="kc-hero-visual">
            <div className="kc-float">
              <TerminalPreview />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── TICKER ─────────────────────────────────────────────── */}
      <div className="kc-ticker" aria-hidden>
        <div className="kc-ticker-track">
          {[...TICKER, ...TICKER].map((r, i) => (
            <span key={i} className="kc-tick">
              <b>{r.n}</b>
              <span>{r.p}</span>
              <em style={{ color: r.up ? SNOW.green : SNOW.accent }}>{r.d}</em>
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ──────────────────────────────────────────────── */}
      <section className="kc-stats">
        <Reveal className="kc-stats-grid">
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={8.8} decimals={1} suffix=" Md€" />
            </div>
            <div className="kc-stat-label">Le marché mondial du TCG en 2025</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={34} suffix=" M+" />
            </div>
            <div className="kc-stat-label">Collectionneurs dans le monde</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={1.4} decimals={1} suffix=" Md" />
            </div>
            <div className="kc-stat-label">Cartes vendues chaque année</div>
          </div>
          <div className="kc-stat">
            <div className="kc-stat-num">
              <CountUp to={340} prefix="+" suffix=" %" />
            </div>
            <div className="kc-stat-label">De croissance depuis 2020</div>
          </div>
        </Reveal>
      </section>

      {/* ── PROBLÈME → SOLUTION ────────────────────────────────── */}
      <section className="kc-ps">
        <Reveal>
          <span className="kc-section-tag">Le constat</span>
          <h2 className="kc-h2">
            Aujourd’hui, on collectionne à l’aveugle.
          </h2>
        </Reveal>
        <div className="kc-ps-grid">
          <Reveal className="kc-ps-col kc-ps-problem" style={GLASS} delay={60}>
            <h3>Le problème</h3>
            <ul>
              <li>Prix éparpillés sur eBay, Cardmarket, TCGPlayer — aucune source de vérité.</li>
              <li>Décisions à l’intuition, au feeling, parfois à la chance.</li>
              <li>Impossible de repérer une carte sous-évaluée systématiquement.</li>
              <li>Les mouvements des gros acteurs restent invisibles.</li>
            </ul>
          </Reveal>
          <Reveal className="kc-ps-col kc-ps-solution" style={GLASS} delay={140}>
            <h3>Avec Kodo Cards</h3>
            <ul>
              <li>Un terminal unifié : prix consolidés, historique, conditions, gradés PSA.</li>
              <li>Des signaux IA qui détectent l’opportunité avant qu’elle ne soit publique.</li>
              <li>Un portefeuille qui calcule votre ROI réel et votre valeur nette.</li>
              <li>Une lecture du marché, pas une suite de captures d’écran.</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────── */}
      <section className="kc-section" id="features">
        <Reveal>
          <span className="kc-section-tag">Le produit</span>
          <h2 className="kc-h2">Tout le marché, dans une seule fenêtre.</h2>
        </Reveal>
        <div className="kc-grid-3">
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
          <span className="kc-section-tag">Spécial marché français</span>
          <h2 className="kc-h2">La cote FR, traitée pour ce qu’elle est.</h2>
        </Reveal>
        <div className="kc-grid-3">
          <Reveal className="kc-feature" style={GLASS}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="book" /></div>
            <div className="kc-feature-head"><h3>Souveraineté de la langue</h3></div>
            <p>Le prix d’une carte FR n’est pas une conversion du prix US — on le suit pour lui-même. Ex. : un Dracaufeu Set de Base FR PSA 9, suivi à 3 381 €. La donnée, pas l’estimation.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={80}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="shield" /></div>
            <div className="kc-feature-head"><h3>Arbitre neutre des certificateurs</h3></div>
            <p>PSA, PCA, CCC — on vous dit lequel offre la meilleure liquidité, carte par carte. Vous gradez chez le bon, pas par habitude.</p>
          </Reveal>
          <Reveal className="kc-feature" style={GLASS} delay={160}>
            <div className="kc-feature-icon" data-live={true}><Glyph d="chart" /></div>
            <div className="kc-feature-head"><h3>Tout le marché continental</h3></div>
            <p>eBay et Cardmarket, les deux leaders européens, consolidés en une seule cote lisible. Fini de jongler entre dix onglets.</p>
          </Reveal>
        </div>
      </section>

      <section className="kc-section" id="personas">
        <Reveal>
          <span className="kc-section-tag">Pour qui</span>
          <h2 className="kc-h2">Pensé pour chaque profil du marché.</h2>
        </Reveal>
        <div className="kc-grid-3 kc-personas">
          {PERSONAS.map((p, i) => (
            <Reveal key={p.tag} delay={i * 50} className="kc-persona" style={GLASS}>
              <div className="kc-persona-tag">{p.tag}</div>
              <div className="kc-persona-sub">{p.sub}</div>
              <p>{p.line}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────── */}
      <section className="kc-section" id="pricing">
        <Reveal>
          <span className="kc-section-tag">Tarifs</span>
          <h2 className="kc-h2">Trois formules, une seule source de vérité.</h2>
        </Reveal>
        <Reveal className="kc-billing-wrap">
          <div className="kc-billing" role="tablist">
            <button className={billing === 'weekly' ? 'kc-bill-on' : ''} onClick={() => setBilling('weekly')}>Hebdo</button>
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
              <li><Glyph d="check" size={16} /> Prix consolidés eBay · Cardmarket · PSA</li>
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
              <li><Glyph d="check" size={16} /> PSA Pop Reports</li>
              <li><Glyph d="check" size={16} /> Prix gradés détaillés — toutes cartes, toutes notes</li>
            </ul>
            <div className="kc-plan-sublabel">Inclus à leur sortie — sans surcoût</div>
            <ul className="kc-plan-list kc-plan-list-soon">
              <li><span className="kc-soon-dot">◌</span> Market Terminal & indices</li>
              <li><span className="kc-soon-dot">◌</span> Alpha Signals (S / A / B)</li>
              <li><span className="kc-soon-dot">◌</span> Deal Hunter — eBay & Cardmarket</li>
              <li><span className="kc-soon-dot">◌</span> Kodo AI illimité + support prioritaire</li>
              <li><span className="kc-soon-dot">◌</span> Whale Tracker</li>
            </ul>
            <a href="/signup" className="kc-btn kc-btn-primary kc-btn-block">Passer Premium</a>
            <p className="kc-plan-note">Market / Alpha / Whale en déploiement (v2.0 / v3.0).</p>
          </Reveal>
        </div>
      </section>

      {/* ── WAITLIST / FUNNEL ──────────────────────────────────── */}
      <section className="kc-cta-band">
        <Reveal className="kc-cta-card" style={GLASS}>
          <span className="kc-section-tag">Accès anticipé</span>
          <h2 className="kc-h2 kc-h2-center">
            Le Terminal arrive. Soyez dans la première vague.
          </h2>
          <p className="kc-cta-sub">
            Signaux Alpha, Whale Tracker, Kodo AI. Laissez votre email : accès prioritaire,
            sans engagement — on vous prévient le jour J.
          </p>

          {status === 'ok' ? (
            <div className="kc-form-ok">
              <Glyph d="check" size={18} /> C’est noté — on vous écrit très bientôt.
            </div>
          ) : (
            <div className="kc-form">
              <input
                type="email"
                inputMode="email"
                placeholder="vous@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === 'err') setStatus('idle')
                }}
                onKeyDown={(e) => e.key === 'Enter' && submitWaitlist('landing_waitlist')}
                aria-label="Adresse email"
              />
              <button
                className="kc-btn kc-btn-primary"
                onClick={() => submitWaitlist('landing_waitlist')}
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Envoi…' : 'Rejoindre l’accès anticipé'}
              </button>
            </div>
          )}
          {status === 'err' && (
            <p className="kc-form-err">Email invalide ou envoi impossible — réessayez.</p>
          )}
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
      <div className="kc-faq-a" style={{ maxHeight: open ? 200 : 0 }}>
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
.kc-h1{font-size:clamp(38px,5.2vw,64px);font-weight:700;line-height:1.04;}
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
.kc-h2{font-size:clamp(28px,3.6vw,42px);font-weight:700;line-height:1.1;max-width:18ch;}
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
.kc-feature{border-radius:20px;padding:26px 24px;}
.kc-feature-icon{width:46px;height:46px;border-radius:13px;display:flex;align-items:center;justify-content:center;background:var(--surface);color:var(--muted);margin-bottom:18px;}
.kc-feature-icon[data-live="true"]{background:linear-gradient(135deg,rgba(224,48,32,.1),rgba(255,68,51,.06));color:var(--accent);}
.kc-feature-head{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
.kc-feature-head h3{font-size:18px;}
.kc-feature p{font-size:14.5px;line-height:1.55;color:var(--muted);margin:0;}
.kc-badge{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--faint);background:var(--surface);padding:4px 9px;border-radius:999px;}
.kc-badge-live{color:var(--green);background:rgba(46,158,106,.1);}

/* PERSONAS */
.kc-persona{border-radius:18px;padding:22px 22px;}
.kc-persona-tag{font-family:var(--display);font-weight:700;font-size:18px;}
.kc-persona-sub{font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin:3px 0 12px;}
.kc-persona p{font-size:14px;color:var(--muted);margin:0;line-height:1.5;}

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
.kc-form{display:flex;gap:10px;max-width:440px;margin:0 auto;}
.kc-form input{flex:1;height:50px;padding:0 18px;border-radius:13px;border:none;box-shadow:inset 0 0 0 1px var(--border);background:rgba(255,255,255,.85);font-family:var(--body);font-size:15px;color:var(--ink);outline:none;transition:box-shadow .2s;}
.kc-form input:focus{box-shadow:inset 0 0 0 2px var(--accent);}
.kc-form .kc-btn{height:50px;}
.kc-form-ok{display:inline-flex;align-items:center;gap:10px;font-family:var(--display);font-weight:600;font-size:16px;color:var(--green);background:rgba(46,158,106,.1);padding:14px 24px;border-radius:14px;}
.kc-form-err{color:var(--accent);font-size:13px;margin-top:12px;}

/* FAQ */
.kc-faq{max-width:780px;}
.kc-faq-list{display:flex;flex-direction:column;gap:12px;margin-top:32px;}
.kc-faq-item{border-radius:16px;overflow:hidden;}
.kc-faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 24px;background:transparent;border:none;cursor:pointer;font-family:var(--display);font-weight:600;font-size:16px;color:var(--ink);text-align:left;}
.kc-faq-chev{font-size:22px;color:var(--accent);transition:transform .3s var(--ease);flex-shrink:0;line-height:1;}
.kc-faq-chev.kc-open{transform:rotate(45deg);}
.kc-faq-a{overflow:hidden;transition:max-height .35s var(--ease);}
.kc-faq-a p{padding:0 24px 22px;margin:0;font-size:14.5px;line-height:1.6;color:var(--muted);}

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
  .kc-form{flex-direction:column;}
  .kc-cta-card{padding:38px 24px;}
}
@media(prefers-reduced-motion:reduce){
  .kc-nappe,.kc-float,.kc-ticker-track,.kc-cta-shimmer::after,.kc-live i{animation:none!important;}
  .kc-reveal{transition:none;opacity:1;transform:none;}
}
`
