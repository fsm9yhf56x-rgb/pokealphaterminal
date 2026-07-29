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
    //
    // "Portfolio" est le mot que le collectionneur voit sur CHAQUE ecran : il
    // trahit a lui seul un outil d investisseur. On le renomme ici plutot que
    // de dupliquer un libelle dans la config — le lexique vit dans usePersona.
    // "Collection" (et pas "Ma Collection") pour eviter "Ma Collection > Ma collection".
    const RELABEL: Record<string, string> = { Portfolio: 'Collection' }
    return NAV
      .filter((item) => !item.collectorHide)
      .map((item) => ({
        ...item,
        label: RELABEL[item.label] ?? item.label,
        ...(item.children
          ? { children: item.children.filter((c) => !c.collectorHide) }
          : {}),
      }))
  }, [isCollector])
}
