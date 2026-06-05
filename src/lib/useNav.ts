'use client'

import { useMemo } from 'react'
import { NAV, type NavItem } from '@/lib/constants/navigation'
import { usePersona } from '@/lib/usePersona'

/**
 * Source de vérité de la navigation, filtrée selon le mode persona.
 * - collector : on retire tout ce qui est marqué collectorHide
 *   (Market, Alpha, onglet Performance) — univers spéculatif.
 * - investor  : NAV complet.
 * Les 3 consommateurs (TopNav, SubMenu, MobileNav) utilisent ce hook
 * au lieu d'importer NAV directement.
 */
export function useNav(): NavItem[] {
  const { isCollector } = usePersona()

  return useMemo(() => {
    if (!isCollector) {
      // investor : on masque ce qui est réservé collector (Culture)
      return NAV.filter((item) => !item.collectorOnly)
    }
    // collector : on masque le spéculatif (collectorHide), on garde le reste + Culture
    return NAV
      .filter((item) => !item.collectorHide)
      .map((item) =>
        item.children
          ? { ...item, children: item.children.filter((c) => !c.collectorHide) }
          : item,
      )
  }, [isCollector])
}
