export type NavItem = {
  label:    string
  href:     string
  pro?:     boolean
  children?: { label: string; href: string; pro?: boolean }[]
}

export const NAV: NavItem[] = [
  {
    label: 'Home',
    href:  '/home',
    children: [
      { label:'Daily Hub',      href:'/home'           },
      { label:'Dexy Insights',  href:'/home/insights'  },
      { label:'Missions',       href:'/home/missions'  },
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
    label: 'Pokédesk',
    href:  '/cartes',
    children: [
      { label:'Cartes', href:'/cartes'        },
      { label:'Scellés',      href:'/cartes/scelles'},
    ],
  },
  {
    label: 'Market',
    href:  '/market',
    children: [
      { label:'Terminal',       href:'/market'              },
      { label:'Tendances',      href:'/market/tendances'    },
      { label:'Movers',         href:'/market/movers'       },
      { label:'Sous-évalués',   href:'/market/sous-evalues', pro: true },
    ],
  },
  {
    label: 'Alpha',
    href:  '/alpha',
    pro:   true,
    children: [
      { label:'Signals',    href:'/alpha'           },
      { label:'Deal Hunter',href:'/alpha/deals'     },
      { label:'Whale Tracker',href:'/alpha/whales'  },
      { label:'Dexy AI',    href:'/alpha/dexy', pro: true },
    ],
  },
]
