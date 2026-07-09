// Tour guidé de Nori — déterministe, zéro IA pour l'instant.
// Elle NAVIGUE vers la page concernée et s'adapte au persona (Collectionneur / Investisseur).
// Plus tard : mode texte libre branché sur /api/assistant ; le tour reste via le bouton flottant.

export type NoriStep = {
  id: string
  title: string
  lines: string[]
  tag?: 'pro' | 'premium'              // badge tier
  cta?: 'pro' | 'premium' | 'accent'   // couleur du bouton route
  page?: string                        // page sur laquelle Nori se rend
  route?: string                       // bouton "Montre-moi" (navigue au clic)
  showLabel?: string
  only?: 'investor' | 'collector'      // étape réservée à un persona (sinon : les deux)
}

// ⚠️ Routes réelles. Pokedesk = /cartes ; home = /home ; Culture = /culture (à vérifier).
const P = {
  home: '/home',
  portfolio: '/portfolio',
  performance: '/portfolio/performance',
  allocation: '/portfolio/allocation',
  graded: '/portfolio/graded-ev',
  pokedesk: '/cartes',
  market: '/market',
  culture: '/culture',
  abonnement: '/abonnement',
}

export const NORI_TOUR: NoriStep[] = [
  {
    id: 'intro',
    title: "Salut, c'est Nori",
    lines: [
      'Ton experte cartes — je connais ce terminal par cœur.',
      "Je te fais le tour ? Promis, c'est rapide.",
    ],
    page: P.home,
  },
  {
    id: 'dailyhub',
    title: 'Ton Daily Hub',
    lines: [
      "Ta page d'accueil : les actus, ta collec en un coup d'œil, l'essentiel du jour.",
      "Bref, le genre d'endroit où tu vas vite traîner.",
    ],
    page: P.home,
  },
  {
    id: 'pokedesk',
    title: 'Le Pokedesk',
    lines: [
      'Le catalogue complet : toutes les séries, en FR, EN et JP.',
      'Idéal pour traquer la carte qui te résiste depuis… un certain temps.',
    ],
    page: P.pokedesk,
  },
  {
    id: 'add',
    title: 'On ajoute des cartes',
    lines: [
      "C'est ici que ta collection prend vie. Un nom, un set, et c'est ajouté.",
      "Le prix arrive tout seul — je t'avais dit que c'était facile.",
    ],
    page: P.portfolio,
  },
  {
    id: 'portfolio',
    title: 'Ton portfolio',
    lines: [
      'Toute ta collec : valeur, évolution, répartition.',
      'Trois onglets et tu sais tout. Reste avec moi, je guide.',
    ],
    page: P.portfolio,
  },
  {
    id: 'performance',
    title: 'Performance',
    lines: [
      "L'évolution de ta collec dans le temps, en un graphe.",
      "Sept jours offerts ; l'historique complet, c'est en Pro — il fallait bien.",
    ],
    tag: 'pro',
    page: P.performance,
    only: 'investor',
  },
  {
    id: 'allocation',
    title: 'Allocation',
    lines: [
      'La répartition de ta collec : langue, ère, rareté.',
      'En accès libre. Le détail complet passe en Pro.',
    ],
    page: P.allocation,
  },
  {
    id: 'graded',
    title: 'Faut-il la grader ?',
    lines: [
      'La vraie question. Graded.ev calcule le gain net, frais inclus.',
      "Fini de tenter au hasard et de croiser les doigts. (C'est du Premium.)",
    ],
    tag: 'premium',
    page: P.graded,
  },
  {
    id: 'market',
    title: 'Le Market',
    lines: [
      'Signaux, deals, spreads… le terminal arrive bientôt.',
      "Je te préviens dès que c'est prêt, promis juré.",
    ],
    page: P.market,
    only: 'investor',
  },
  {
    id: 'culture',
    title: 'La Culture',
    lines: [
      "L'histoire des cartes, les époques, les petites légendes du TCG.",
      'De quoi cultiver ta passion — et briller en soirée.',
    ],
    page: P.culture,
    only: 'collector',
  },
  {
    id: 'plans',
    title: 'Free, Pro, Premium',
    lines: [
      "Free t'emmène déjà loin. Pro débloque ta collection, et Premium pousse tout plus loin : gradation, marché gradé et signaux à venir.",
      "Et l'Early à -40 % à vie, tant qu'il reste des places. Je dis ça…",
    ],
    cta: 'premium',
    route: P.abonnement,
    showLabel: "Voir l'offre Early →",
  },
  {
    id: 'outro',
    title: 'Et voilà',
    lines: [
      "Tu sais l'essentiel, le reste viendra en explorant.",
      'Je reste dans le coin — fais-moi signe si tu te perds.',
    ],
    page: P.home,
  },
]

// Liens rapides quand on rouvre Nori après le tour (mode "hub")
export const NORI_LINKS: { label: string; href: string }[] = [
  { label: 'Portfolio', href: P.portfolio },
  { label: 'Pokedesk', href: P.pokedesk },
  { label: 'Offres', href: P.abonnement },
]
