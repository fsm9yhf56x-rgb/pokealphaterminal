export type SoonInfo = {
  feature: string
  version: 'v2.0' | 'v3.0' | 'v4.0'
  description: string
  bullets?: string[]
}

export type NavItem = {
  label:    string
  href:     string
  pro?:     boolean
  soon?:    SoonInfo
  children?: { label: string; href: string; pro?: boolean; soon?: SoonInfo }[]
}

export const NAV: NavItem[] = [
  {
    label: 'Home',
    href:  '/home',
    children: [
      { label:'Daily Hub',      href:'/home'           },
      { label:'Missions',       href:'/home/missions'  },
      { label:'Prochains Sets', href:'/releases'       },
    ],
  },
  {
    label: 'Portfolio',
    href:  '/portfolio',
    children: [
      { label:'Holdings',     href:'/portfolio'             },
      { label:'Performance',  href:'/portfolio/performance' },
      { label:'Allocations',  href:'/portfolio/allocation'  },
      { label:'Objectifs',    href:'/portfolio/objectifs'   },
    ],
  },
  {
    label: 'Pokedesk',
    href:  '/cartes',
    children: [
      { label:'Cartes', href:'/cartes'        },
      { label:'Scelles',      href:'/cartes/scelles'},
      { label:'Jeux Video',    href:'/cartes/jeux'},
    ],
  },
  {
    label: 'Market',
    href:  '/market',
    soon: {
      feature: 'Market Terminal',
      version: 'v2.0',
      description: 'Bloomberg du TCG. Indices marche temps reel, explorer multi-criteres, spreads inter-marketplaces detectes automatiquement.',
      bullets: [
        'Indices Vintage US, Modern FR, Modern EN, Japan',
        'Explorer 50k+ cartes filtre par prix/condition/langue',
        'Spreads CM EU vs eBay US (gaps > 15%)',
        'Ticker live des plus gros mouvements',
      ],
    },
    children: [
      {
        label: 'Terminal',
        href:  '/market',
        soon: {
          feature: 'Market Terminal',
          version: 'v2.0',
          description: 'Bloomberg du TCG: indices marche temps reel + flux des transactions live.',
          bullets: [
            'Indices Vintage / Modern / Japan',
            'Flux trades en direct',
            'Tendances et movers du jour',
          ],
        },
      },
      {
        label: 'Explorer',
        href:  '/market/explorer',
        soon: {
          feature: 'Market Explorer',
          version: 'v2.0',
          description: 'Cherche dans 50k+ cartes avec filtres avances multi-criteres.',
          bullets: [
            'Filtres prix / condition / langue / rarete',
            'Tri par variation / volume / liquidite',
            'Sauvegarde de recherches',
            'Export CSV pour analyse externe',
          ],
        },
      },
      {
        label: 'Spreads',
        href:  '/market/spreads',
        pro:   true,
        soon: {
          feature: 'Spreads Cross-Marketplace',
          version: 'v2.0',
          description: 'Detection automatique des ecarts de prix entre Cardmarket EU et eBay US pour arbitrage.',
          bullets: [
            'Gaps > 15% capturees automatiquement',
            'Score de confiance S / A / B',
            'Calcul ROI net apres frais',
            'Alertes push sur opportunites premium',
          ],
        },
      },
    ],
  },
  {
    label: 'Alpha',
    href:  '/alpha',
    pro:   true,
    soon: {
      feature: 'Alpha Signals',
      version: 'v2.0',
      description: 'Detection IA des opportunites avant le marche. 4 modules: Signals, Deal Hunter, Whale Tracker, Dexy AI.',
      bullets: [
        'Signals: cartes sous-evaluees detectees par IA (S/A/B tier)',
        'Deal Hunter: scan eBay/Cardmarket automatique',
        'Whale Tracker: mouvements des gros collectionneurs',
        'Dexy AI: analyste TCG 24/7 (Claude API)',
      ],
    },
    children: [
      {
        label: 'Signals',
        href:  '/alpha',
        soon: {
          feature: 'Alpha Signals',
          version: 'v2.0',
          description: 'Cartes sous-evaluees detectees par IA, classees S / A / B avec score de confiance.',
          bullets: [
            'Tier S: opportunites premium (gap > 25%, confidence > 80)',
            'Tier A: opportunites moyennes solides',
            'Tier B: opportunites a surveiller',
            'Notifications push instantanees',
          ],
        },
      },
      {
        label: 'Deal Hunter',
        href:  '/alpha/deals',
        soon: {
          feature: 'Deal Hunter',
          version: 'v2.0',
          description: 'Scanne automatiquement eBay et Cardmarket pour faire remonter les cartes sous-cotees.',
          bullets: [
            'Mise a jour toutes les 5 minutes',
            'Filtres par etat / langue / source',
            'Sauvegarde des deals favoris',
            'Click direct vers le vendeur',
          ],
        },
      },
      {
        label: 'Whale Tracker',
        href:  '/alpha/whales',
        soon: {
          feature: 'Whale Tracker',
          version: 'v2.0',
          description: 'Suis ce que les plus gros collectionneurs achetent en temps reel.',
          bullets: [
            '4 profils whales LEGEND-tier suivis',
            'Notifications quand un whale move',
            'Dexy genere un signal sur chaque move',
            'Historique des transactions sur 90j',
          ],
        },
      },
      {
        label: 'Dexy AI',
        href:  '/alpha/dexy',
        pro:   true,
        soon: {
          feature: 'Dexy AI',
          version: 'v2.0',
          description: 'Ton analyste TCG personnel propulse par Claude. Insights quotidiens proactifs + chat illimite sur n\'importe quelle question marche.',
          bullets: [
            'Resume marche personnalise chaque matin (proactif)',
            'Detection automatique des mouvements anormaux',
            'Chat 24/7 avec expert TCG (Claude API)',
            'Conseils grading, investissement, timing',
            'Memoire conversation contextuelle + alertes ciblees',
          ],
        },
      },
    ],
  },
]
