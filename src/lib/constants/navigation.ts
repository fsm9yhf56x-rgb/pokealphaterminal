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
  // PASSE 2 (axe plan): remplacer `pro?: boolean` par `tier?: 'pro' | 'premium'`
  // sur cet item ET sur les enfants, puis adapter useNav + TopNav/SubMenu/MobileNav.
  soon?:    SoonInfo
  collectorHide?: boolean
  collectorOnly?: boolean
  children?: { label: string; href: string; pro?: boolean; soon?: SoonInfo; collectorHide?: boolean }[]
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
      { label:'Performance',  href:'/portfolio/performance', collectorHide: true },
      { label:'Allocations',  href:'/portfolio/allocation'  },
      { label:'Objectifs',    href:'/portfolio/objectifs'   },
      // PASSE 2: ajouter "Graded.ev" ici. Teaser (tier:'pro') -> moteur complet (tier:'premium').
      // C'est le 2e trigger de conversion Pro->Premium (le plus tangible).
    ],
  },
  {
    label: 'Pokedesk',
    href:  '/cartes',
    children: [
      { label:'Cartes',     href:'/cartes'        },
      { label:'Scelles',    href:'/cartes/scelles'},
      { label:'Jeux Video', href:'/cartes/jeux'   },
    ],
  },
  {
    // MARKET = une seule destination. Alpha a ete dissous ici (couche "Signaux").
    // Tendances + Movers = descriptif (tous plans). Signaux = premium (preview SOON).
    // PASSE 2: la page /market affichera Tendances/Movers en clair + Signaux floutes
    // avec preview => 1er point de contact du trigger Pro->Premium cote Market.
    label: 'Market',
    href:  '/market',
    collectorHide: true,
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
      },
      // ── Couche SIGNAUX (ex-Alpha) — premium, toutes SOON v2.0 ──
      // PASSE 2: marquer ce groupe tier:'premium'.
      {
        label: 'Sous-evalues',
        href:  '/market/sous-evalues',
        pro:   true,
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
        href:  '/market/deals',
        pro:   true,
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
      {
        label: 'Whale Tracker',
        href:  '/market/whales',
        pro:   true,
        soon: {
          feature: 'Whale Tracker',
          version: 'v2.0',
          description: 'Suis ce que les plus gros collectionneurs achetent en temps reel.',
          bullets: [
            '4 profils whales LEGEND-tier suivis',
            'Notifications quand un whale move',
            'Kodo AI genere un signal sur chaque move',
            'Historique des transactions sur 90j',
          ],
        },
      },
    ],
  },
  {
    label: 'Culture',
    href:  '/culture',
    collectorOnly: true,
    children: [
      { label:'Ma collection', href:'/culture/ma-collection' },
      { label:'Artistes',    href:'/culture/artistes'   },
      { label:'Lore',        href:'/culture/lore'       },
      { label:'Ères',        href:'/culture/eres'       },
      { label:'Curiosités',  href:'/culture/curiosites' },
    ],
  },
]

// DEXY / KODO AI : retire de la NAV (etait en doublon: top-level + sous-item Alpha).
// Devient un bouton flottant transversal (present sur toutes les pages).
// PASSE 2: quota par plan (free 1-3 req/j, pro X/j, premium illimite).
// Le composant flottant pointera vers /alpha/dexy (route inchangee pour l'instant).
