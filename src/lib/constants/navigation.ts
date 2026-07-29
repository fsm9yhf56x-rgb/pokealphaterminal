export type SoonInfo = {
  feature: string
  version: 'v2.0' | 'v3.0' | 'v4.0'
  description: string
  bullets?: string[]
}

export type NavItem = {
  label:    string
  href:     string
  tier?:    'pro' | 'premium'
  soon?:    SoonInfo
  collectorHide?: boolean
  collectorOnly?: boolean
  children?: { label: string; href: string; tier?: 'pro' | 'premium'; soon?: SoonInfo; collectorHide?: boolean }[]
}

export const NAV: NavItem[] = [
  {
    label: 'Home',
    href:  '/home',
    children: [
      { label:'Daily Hub',      href:'/home'           },
      { label:'Missions', href:'/home/missions', soon: {
        feature: 'Missions',
        version: 'v2.0',
        description: "Transforme ta collection en jeu : gagne de l'XP, enchaîne les séries, débloque des badges et complète des quêtes quotidiennes pour decrocher des recompenses.",
        bullets: [
          'Niveaux et XP de collectionneur',
          'Badges a debloquer',
          'Quetes du jour',
          'Récompenses à la clé',
        ],
      } },
      { label:'Prochaines Séries', href:'/releases'       },
    ],
  },
  {
    label: 'Portfolio',
    href:  '/portfolio',
    children: [
      { label:'Ma collection', href:'/portfolio'            },
      { label:'Performance',  href:'/portfolio/performance', collectorHide: true },
      { label:'Allocations',  href:'/portfolio/allocation', collectorHide: true },
      { label:'Objectifs',    href:'/portfolio/objectifs'   },
      { label:'Faut-il grader ?', href:'/portfolio/graded-ev', tier:'premium' },
    ],
  },
  {
    label: 'Pokédesk',
    href:  '/cartes',
    children: [
      { label:'Cartes',     href:'/cartes'        },
      { label:'Scellés',    href:'/cartes/scelles'},
      { label:'Jeux vidéo', href:'/cartes/jeux'   },
    ],
  },
  {
    // MARKET = une seule destination. Alpha a ete dissous ici (couche "Signaux").
    // Tendances + Movers = descriptif (tous plans). Signaux = premium (preview SOON).
    // MARKET top-level = SOON v2.0 (Explorer supprime, plus de page Market vivante).
    // Le clic ouvre le SoonModal (gere par TopNav/MobileNav). Les children restent
    // pour memoire mais ne sont pas atteignables tant que le parent est SOON.
    label: 'Market',
    href:  '/market',
    collectorHide: true,
    soon: {
      feature: 'Market',
      version: 'v2.0',
      description: 'Le terminal de marche Kodo arrive: indices en temps reel, mouvements du jour et signaux pour reperer les opportunites avant tout le monde.',
      bullets: [
        'Indices Vintage / Modern / Japan en direct',
        'Cartes sous-evaluees detectees automatiquement',
        'Flux des transactions et plus gros mouvements',
        'Suivi des plus gros acheteurs du marche',
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
      // ── Couche SIGNAUX (ex-Alpha) — premium, toutes SOON v2.0 ──
      // PASSE 2: marquer ce groupe tier:'premium'.
      {
        label: 'Sous-evalues',
        href:  '/market/sous-evalues',
        tier:  'premium',
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
        tier:  'premium',
        soon: {
          feature: 'Deal Hunter',
          version: 'v2.0',
          description: 'Scanne automatiquement eBay et Cardmarket pour faire remonter les cartes sous-cotees.',
          bullets: [
            'Mise a jour toutes les 5 minutes',
            'Filtres par état / langue / source',
            'Sauvegarde des deals favoris',
            'Click direct vers le vendeur',
          ],
        },
      },
      {
        label: 'Spreads',
        href:  '/market/spreads',
        tier:  'premium',
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
        tier:  'premium',
        soon: {
          feature: 'Whale Tracker',
          version: 'v2.0',
          description: 'Suis ce que les plus gros collectionneurs achetent en temps reel.',
          bullets: [
            '4 profils whales LEGEND-tier suivis',
            'Notifications quand un whale move',
            'Nori genere un signal sur chaque move',
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
      { label:'Mes époques', href:'/culture/ma-collection' },
      { label:'Artistes',    href:'/culture/artistes'   },
      { label:'Lore',        href:'/culture/lore'       },
      { label:'Ères',        href:'/culture/eres'       },
      { label:'Curiosités',  href:'/culture/curiosites' },
    ],
  },
]

// NORI (ex-Dexy/Kodo AI) : retire de la NAV (etait en doublon: top-level + sous-item Alpha). Composant flottant DexyFloat conserve.
// Devient un bouton flottant transversal (present sur toutes les pages).
// PASSE 2: quota par plan (free 1-3 req/j, pro X/j, premium illimite).
// Le composant flottant pointera vers /alpha/dexy (route inchangee pour l'instant).
