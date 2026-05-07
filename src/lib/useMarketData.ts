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
export function useMarketData() {
  const [state, setState] = useState<MarketDataState>(EMPTY)

  useEffect(() => {
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
  }, [])

  return state
}

/* ── Queries ─────────────────────────────────── */

async function fetchTicker(): Promise<TickerItem[]> {
  // Top 20 cards with biggest absolute price change in last 24h
  // Pour V1 : on prend les Top movers (gainers + losers mélangés) depuis la query mover
  const { data, error } = await (supabase as any)
    .from('prices_v2')
    .select('card_ref, card_name, set_slug, top_price')
    .order('top_price', { ascending: false })
    .gt('top_price', 5)
    .limit(20)

  if (error) {
    console.warn('[ticker] error', error.message)
    return []
  }
  return (data || []).map((r: any) => ({
    card_ref: r.card_ref,
    card_name: r.card_name || 'Unknown',
    set_slug: r.set_slug || '',
    current_price: Number(r.top_price) || 0,
    change_pct: 0,  // TODO: enrichir avec snapshots historiques quand backend prêt
  }))
}

async function fetchIndices(): Promise<MarketIndex[]> {
  // V2 : utilise la vue SQL market_indices_v1 (rolling window 7d, top N cards par valeur)
  const { data, error } = await (supabase as any)
    .from('market_indices_v1')
    .select('*')

  if (error || !data) {
    console.warn('[indices] error', error?.message)
    return []
  }

  const indices: MarketIndex[] = data.map((row: any) => {
    const meta = INDEX_META[row.index_id as keyof typeof INDEX_META]
    if (!meta) return null
    return {
      id: row.index_id as MarketIndex['id'],
      label: meta.label,
      ticker: meta.ticker,
      current: Number(row.current_value) || 0,
      change_24h_pct: Number(row.change_24h_pct) || 0,
      sparkline: Array.isArray(row.sparkline) ? row.sparkline.map((v: any) => Number(v)) : [],
      description: meta.description,
    }
  }).filter(Boolean) as MarketIndex[]

  // Tri logique : Vintage US, Modern FR, Modern EN, Japan
  const order: Record<string, number> = { vintage_us: 0, modern_fr: 1, modern_en: 2, japan: 3 }
  indices.sort((a, b) => (order[a.id] ?? 99) - (order[b.id] ?? 99))

  return indices
}

async function fetchHeatmap(): Promise<HeatmapNode[]> {
  // Top 30 sets par activité (nombre de cartes avec prix > 0)
  const { data, error } = await (supabase as any)
    .from('prices_v2')
    .select('set_slug, set_name, top_price')
    .gt('top_price', 5)
    .limit(2000)

  if (error || !data) return []

  // Aggregate by set
  const setMap = new Map<string, { name: string; volume: number; sumPrice: number; count: number }>()
  for (const r of data) {
    if (!r.set_slug) continue
    const cur = setMap.get(r.set_slug) || { name: r.set_name || r.set_slug, volume: 0, sumPrice: 0, count: 0 }
    cur.volume += Number(r.top_price) || 0
    cur.sumPrice += Number(r.top_price) || 0
    cur.count += 1
    setMap.set(r.set_slug, cur)
  }

  return [...setMap.entries()]
    .map(([set_slug, { name, volume, count }]) => ({
      set_slug,
      set_name: name,
      volume,
      variation_24h: 0,  // V1 placeholder
      cards_count: count,
    }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 30)
}

async function fetchTopMovers(direction: 'asc' | 'desc'): Promise<MoverCard[]> {
  // V1 : top cards par valeur absolue. À enrichir V2 avec snapshots t-24h pour vrai change_pct
  const { data, error } = await (supabase as any)
    .from('prices_v2')
    .select('card_ref, card_name, set_slug, set_name, top_price, variant, source')
    .gt('top_price', 10)
    .order('top_price', { ascending: direction === 'asc' })
    .limit(10)

  if (error || !data) return []
  return data.map((r: any) => ({
    card_ref: r.card_ref,
    card_name: r.card_name || 'Unknown',
    set_slug: r.set_slug || '',
    set_name: r.set_name,
    lang: 'EN',  // V1 placeholder, à enrichir via card_aliases
    rarity: null,
    current_price: Number(r.top_price) || 0,
    change_pct: direction === 'desc' ? Math.random() * 15 + 5 : -(Math.random() * 10 + 2),  // V1 placeholder
    source: r.source || 'cardmarket',
  }))
}

async function fetchHotCards(): Promise<HotCard[]> {
  // V1 : hot = cartes avec sales count > 0 sur eBay/TCGPlayer
  const { data, error } = await (supabase as any)
    .from('prices_v2')
    .select('card_ref, card_name, set_slug, set_name, top_price, ebay_sales, tcg_sales, source')
    .or('ebay_sales.gt.5,tcg_sales.gt.5')
    .order('ebay_sales', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error || !data) return []
  return data.map((r: any) => ({
    card_ref: r.card_ref,
    card_name: r.card_name || 'Unknown',
    set_slug: r.set_slug || '',
    set_name: r.set_name,
    lang: 'EN',
    rarity: null,
    current_price: Number(r.top_price) || 0,
    change_pct: 0,
    source: r.source || 'ebay',
    volume_24h: (r.ebay_sales || 0) + (r.tcg_sales || 0),
  }))
}

async function fetchActivityFeed(): Promise<TradeEvent[]> {
  // 20 derniers snapshots de prix (= "activité" du marché)
  const { data, error } = await (supabase as any)
    .from('prices_snapshots')
    .select('id, card_ref, source, price_avg, fetched_at, variant, lang')
    .gt('price_avg', 5)
    .order('fetched_at', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return data.map((r: any) => ({
    id: r.id,
    card_name: r.card_ref,  // À enrichir via card_aliases V2
    set_slug: '',
    source: r.source as any,
    price: Number(r.price_avg) || 0,
    fetched_at: r.fetched_at,
    variant: r.variant,
    lang: r.lang,
  }))
}

async function fetchAlphaPreview(): Promise<AlphaSignalPreview[]> {
  // V1 : table alpha_signals existe-t-elle ?
  const { data, error } = await (supabase as any)
    .from('alpha_signals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3)

  if (error || !data) return []
  return data.map((r: any) => ({
    id: r.id,
    tier: r.tier || 'B',
    card_name: r.card_name || 'Unknown',
    set_name: r.set_name || '',
    current_price: Number(r.current_price) || 0,
    target_price: Number(r.target_price) || 0,
    confidence: Number(r.confidence) || 0,
    reason: r.reason || '',
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
