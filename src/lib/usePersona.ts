'use client'

import { useMemo } from 'react'
import { useAuth } from './useAuth'

export type Persona = 'collector' | 'investor'

// Libellés : même feature, vocabulaire adapté au mode.
// Le collector ne voit JAMAIS le lexique finance (trade / ROI / alpha).
export interface PersonaLabels {
  portfolio: string
  portfolioValue: string
  portfolioSub: string
  dealHunter: string
  dexy: string
  priceHistory: string
  addCard: string
  goals: string
}

// Visibilité : features strictement ON/OFF selon le mode.
// (L'enrichissement collector — illustrateur, lore — est agnostique,
//  donc toujours visible : pas de flag ici, juste mis en avant côté UI.)
export interface PersonaVisibility {
  pnl: boolean
  ticker: boolean
  tradeFeed: boolean
  alphaSignals: boolean
  whaleTracker: boolean
  marketIndices: boolean
  arbitrageDeals: boolean
}

const LABELS: Record<Persona, PersonaLabels> = {
  collector: {
    portfolio: 'Ma Collection',
    portfolioValue: 'Valeur de ma collection',
    portfolioSub: 'La valeur de ton musée personnel',
    dealHunter: 'Cartes manquantes',
    dexy: 'Assistant collection',
    priceHistory: 'Évolution de ta collection',
    addCard: 'Ajouter à ma collection',
    goals: 'Mes mastersets',
  },
  investor: {
    portfolio: 'Portfolio',
    portfolioValue: 'Valeur du portfolio',
    portfolioSub: 'Performance et allocation de tes actifs',
    dealHunter: 'Deal Hunter',
    dexy: 'Analyste marché',
    priceHistory: 'Historique de prix',
    addCard: 'Ajouter une position',
    goals: 'Objectifs',
  },
}

/**
 * Source de vérité côté client pour le MODE de l'utilisateur.
 *   - collector : Le Gardien — collection enrichie, zéro lexique finance.
 *   - investor  : Le Terminal complet — PnL, signaux, arbitrage.
 * Défaut large et non clivant : collector.
 */
export function usePersona() {
  const auth = useAuth() as {
    profile?: { persona?: string; persona_onboarded?: boolean } | null
    loading: boolean
  }

  const persona: Persona =
    auth.profile?.persona === 'investor' ? 'investor' : 'collector'

  const isCollector = persona === 'collector'
  const isInvestor = persona === 'investor'
  const onboarded = auth.profile?.persona_onboarded === true

  const labels = useMemo(() => LABELS[persona], [persona])

  const show = useMemo<PersonaVisibility>(
    () => ({
      pnl: isInvestor,
      ticker: isInvestor,
      tradeFeed: isInvestor,
      alphaSignals: isInvestor,
      whaleTracker: isInvestor,
      marketIndices: isInvestor,
      arbitrageDeals: isInvestor,
    }),
    [isInvestor],
  )

  return {
    persona,
    isCollector,
    isInvestor,
    onboarded,
    // Tant que c'est true, persona vaut 'collector' par DEFAUT et non par choix :
    // un composant qui fige un etat initial sur isInvestor doit attendre, sinon
    // il reste en mode collectionneur pour toute la session.
    loading: auth.loading,
    labels,
    show,
  }
}
