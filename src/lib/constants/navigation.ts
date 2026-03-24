export type SubItem = {
  href:     string
  label:    string
  premium?: boolean
}

export type NavItem = {
  href:     string
  label:    string
  icon:     string
  sub:      SubItem[]
  premium?: boolean
}

export const NAV: NavItem[] = [
  {
    href:  '/home',
    label: 'Home',
    icon:  '⌂',
    sub: [
      { href: '/home',          label: 'Daily Hub'     },
      { href: '/home/dexy',     label: 'Dexy Insights' },
      { href: '/home/alpha',    label: 'Daily Alpha'   },
      { href: '/home/missions', label: 'Missions'      },
    ],
  },
  {
    href:  '/portfolio',
    label: 'Portfolio',
    icon:  '◈',
    sub: [
      { href: '/portfolio',             label: 'Holdings'    },
      { href: '/portfolio/objectifs',   label: 'Objectifs'   },
      { href: '/portfolio/allocation',  label: 'Allocations' },
      { href: '/portfolio/performance', label: 'Performance' },
    ],
  },
  {
    href:  '/cartes',
    label: 'Cartes',
    icon:  '◆',
    sub: [
      { href: '/cartes',         label: 'Cartes'  },
      { href: '/cartes/scelles', label: 'Scellés' },
    ],
  },
  {
    href:  '/market',
    label: 'Market',
    icon:  '◉',
    sub: [
      { href: '/market',              label: 'Tendances'    },
      { href: '/market/movers',       label: 'Movers'       },
      { href: '/market/sous-evalues', label: 'Sous-évalués', premium: true },
    ],
  },
  {
    href:  '/alpha',
    label: 'Alpha',
    icon:  '✦',
    premium: true,
    sub: [
      { href: '/alpha',        label: 'Signals' },
      { href: '/alpha/deals',  label: 'Deals'   },
      { href: '/alpha/whales', label: 'Whales'  },
      { href: '/alpha/dexy',   label: 'Dexy AI' },
    ],
  },
]
