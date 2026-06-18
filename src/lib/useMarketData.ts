'use client'

import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export interface TickerItem {
  card_ref: string
  card_name: string
  set_slug: string
  current_price: number
  change_pct: number
}

export interface MarketIndex {
  id: 'vintage_us' | 'modern_fr' | 'modern_en' | 'japan'
  label: string
  ticker: string
  current: number
  change_24h_pct: number
  sparkline: number[]
  description: string
}

export interface HeatmapNode {
  set_slug: string
  set_name: string
  volume: number
  variation_24h: number
  cards_count: number
}

export interface MoverCard {
  card_ref: string
  card_name: string
  set_slug: string
  set_name: string | null
  lang: string
  rarity: string | null
  current_price: number
  change_pct: number
  source: string
}

export interface HotCard extends MoverCard {
  volume_24h: number
}

export interface TradeEvent {
  id: string
  card_name: string
  set_slug: string
  source: 'ebay' | 'cardmarket' | 'tcgplayer' | 'poketrace'
  price: number
  fetched_at: string
  variant?: string | null
  lang?: string | null
}

export interface AlphaSignalPreview {
  id: string
  tier: 'S' | 'A' | 'B'
  card_name: string
  set_name: string
  current_price: number
  target_price: number
  confidence: number
  reason: string
}

export interface MarketDataState {
  ticker: TickerItem[]
  indices: MarketIndex[]
  heatmap: HeatmapNode[]
  topGainers: MoverCard[]
  topLosers: MoverCard[]
  hotCards: HotCard[]
  activityFeed: TradeEvent[]
  alphaPreview: AlphaSignalPreview[]
  marketStatus: 'open' | 'closed'
  lastUpdate: Date | null
  loading: boolean
  error: string | null
}

const EMPTY: MarketDataState = {
  ticker: [], indices: [], heatmap: [],
  topGainers: [], topLosers: [], hotCards: [],
  activityFeed: [], alphaPreview: [],
  marketStatus: 'open', lastUpdate: null,
  loading: true, error: null,
}

/**
 * Hook centralisé pour la page MarketTerminal.
 * Lance toutes les queries en parallèle et expose le résultat agrégé.
 *
 * Stratégie : queries optimisées (vues prices_v2, prices_snapshots avec indexes lang+rarity).
 * Fallback gracieux si Supabase indisponible.
 */
export function useMarketData(enabled = true) {
  const [state, setState] = useState<MarketDataState>(EMPTY)

  useEffect(() => {
    if (!enabled) { setState(s => ({ ...s, loading: false })); return }
    let cancelled = false
    loadAll()

    async function loadAll() {
      setState(s => ({ ...s, loading: true, error: null }))

      try {
        // Lancer toutes les queries en parallèle
        const [
          tickerRes, indicesRes, heatmapRes,
          gainersRes, losersRes, hotRes,
          activityRes, alphaRes,
        ] = await Promise.all([
          fetchTicker(),
          fetchIndices(),
          fetchHeatmap(),
          fetchTopMovers('asc'),
          fetchTopMovers('desc'),
          fetchHotCards(),
          fetchActivityFeed(),
          fetchAlphaPreview(),
        ])

        if (cancelled) return

        setState({
          ticker: tickerRes,
          indices: indicesRes,
          heatmap: heatmapRes,
          topGainers: gainersRes,
          topLosers: losersRes,
          hotCards: hotRes,
          activityFeed: activityRes,
          alphaPreview: alphaRes,
          marketStatus: getMarketStatus(),
          lastUpdate: new Date(),
          loading: false,
          error: null,
        })
      } catch (err: any) {
        if (cancelled) return
        console.warn('[useMarketData]', err)
        setState({
          ...EMPTY,
          loading: false,
          error: err.message || 'Failed to load market data',
        })
      }
    }

    return () => { cancelled = true }
  }, [enabled])

  return state
}

/* ── Queries ─────────────────────────────────── */

async function fetchTicker(): Promise<TickerItem[]> {
  // TODO Kodo v2.0: rebrancher sur price_signals/price_matrix lors du dev Market Terminal.
  // Debranche de prices_v2/market_indices_v1 (legacy, en cours de suppression). Composants gerent l etat vide (preview SOON).
  return []
}
async function fetchIndices(): Promise<MarketIndex[]> {
  // TODO Kodo v2.0: rebrancher sur price_signals/price_matrix lors du dev Market Terminal.
  // Debranche de prices_v2/market_indices_v1 (legacy, en cours de suppression). Composants gerent l etat vide (preview SOON).
  return []
}
async function fetchHeatmap(): Promise<HeatmapNode[]> {
  // TODO Kodo v2.0: rebrancher sur price_signals/price_matrix lors du dev Market Terminal.
  // Debranche de prices_v2/market_indices_v1 (legacy, en cours de suppression). Composants gerent l etat vide (preview SOON).
  return []
}
async function fetchTopMovers(direction: 'asc' | 'desc'): Promise<MoverCard[]> {
  // TODO Kodo v2.0: rebrancher sur price_signals/price_matrix lors du dev Market Terminal.
  // Debranche de prices_v2/market_indices_v1 (legacy, en cours de suppression). Composants gerent l etat vide (preview SOON).
  return []
}
async function fetchHotCards(): Promise<HotCard[]> {
  // TODO Kodo v2.0: rebrancher sur price_signals/price_matrix lors du dev Market Terminal.
  // Debranche de prices_v2/market_indices_v1 (legacy, en cours de suppression). Composants gerent l etat vide (preview SOON).
  return []
}
async function fetchActivityFeed(): Promise<TradeEvent[]> {
  // TODO Kodo v2.0: rebrancher le feed d'activite du Market Terminal sur price_history (Kodo).
  // Debranche de prices_snapshots (legacy, en cours de suppression). Le terminal gere l'etat vide.
  return []
}

async function fetchAlphaPreview(): Promise<AlphaSignalPreview[]> {
  // V1 : table alpha_signals existe-t-elle ?
  const { data, error } = await (supabase as any)
    .from('alpha_signals')
    .select('*')
    .order('computed_at', { ascending: false })
    .limit(3)

  if (error || !data) return []
  return data.map((r: any) => ({
    id: r.id,
    tier: r.tier || 'B',
    card_name: r.card_name || 'Unknown',
    set_name: r.set_name || '',
    current_price: Number(r.current_price) || 0,
    target_price: Number(r.market_target) || 0,
    confidence: Number(r.confidence_pct) || 0,
    reason: r.ai_reason || '',
  }))
}

/* ── Helpers ─────────────────────────────────── */

const INDEX_META: Record<string, { label: string; ticker: string; description: string }> = {
  vintage_us: { label: 'PKA Vintage US',  ticker: 'VNTG', description: 'Top 100 cartes WOTC anglaises' },
  modern_fr:  { label: 'PKA Modern FR',   ticker: 'MODFR', description: 'Top 100 cartes modernes françaises' },
  modern_en:  { label: 'PKA Modern EN',   ticker: 'MODEN', description: 'Top 100 cartes modernes anglaises' },
  japan:      { label: 'PKA Japan',        ticker: 'JPMK',  description: 'Top 50 cartes marché japonais' },
}

function getMarketStatus(): 'open' | 'closed' {
  // Bourse FR : ouverture 9h-17h30 jours ouvrés (simplification)
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()  // 0 = dim, 6 = sam
  if (day === 0 || day === 6) return 'closed'
  if (hour < 9 || hour >= 18) return 'closed'
  return 'open'
}
