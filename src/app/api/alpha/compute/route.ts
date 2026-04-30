import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'
import { startSyncLog, finishSyncLog } from '@/lib/sync-logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const supabase = getAdminClient()

// ─── Types ──────────────────────────────────────────────────────────

interface PriceSnapshot {
  card_ref: string
  price_avg: number | null
  price_low: number | null
  price_median: number | null
  currency: string | null
  fetched_at: string
  source: string
  variant: string
  source_meta: Record<string, any> | null
}

interface CardStats {
  card_ref: string
  current: number
  prev_7d: number | null
  avg_30d: number | null
  min_30d: number | null
  max_30d: number | null
  snapshots_count: number
  latest_meta: Record<string, any> | null
  source: string
  variant: string
  sparkline: number[]
}

interface AlphaSignal {
  card_ref: string
  tier: 'S' | 'A' | 'B'
  rule: 'brutal_discount' | 'undervalued_30d' | 'momentum_7d'
  current_price: number
  reference_price: number
  variation_pct: number
  market_target: number
  confidence_pct: number
  upside_pct: number
  momentum_score: number
  card_name?: string
  set_name?: string
  set_id?: string
  local_id?: string
  lang?: string
  source?: string
  variant?: string
  rarity?: string
  sparkline: number[]
  ai_reason: string
  tags: string[]
}

// ─── Auth ───────────────────────────────────────────────────────────

async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// ─── Aggregation des stats par carte ────────────────────────────────

async function fetchCardStats(): Promise<CardStats[]> {
  // On lit tous les snapshots des 30 derniers jours, source='cardmarket' (la plus dense)
  // Si tu veux inclure poketrace plus tard, remplace par .in('source', ['cardmarket', 'poketrace'])
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Pagination par chunks de 1000 (Supabase limite max range)
  const all: PriceSnapshot[] = []
  let from = 0
  const SIZE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('prices_snapshots')
      .select('card_ref, price_avg, price_low, price_median, currency, fetched_at, source, variant, source_meta')
      .eq('source', 'cardmarket')
      .eq('variant', 'raw')
      .gte('fetched_at', cutoff30d)
      .not('price_avg', 'is', null)
      .order('card_ref', { ascending: true })
      .order('fetched_at', { ascending: false })
      .range(from, from + SIZE - 1)
    if (error) throw new Error(`fetchCardStats: ${error.message}`)
    if (!data || data.length === 0) break
    all.push(...(data as PriceSnapshot[]))
    if (data.length < SIZE) break
    from += SIZE
  }

  // Group by card_ref
  const grouped: Record<string, PriceSnapshot[]> = {}
  for (const row of all) {
    if (!grouped[row.card_ref]) grouped[row.card_ref] = []
    grouped[row.card_ref].push(row)
  }

  // Compute stats per card
  const stats: CardStats[] = []
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000

  for (const [card_ref, snaps] of Object.entries(grouped)) {
    if (snaps.length < 3) continue // need at least 3 datapoints

    const sorted = snaps.sort((a, b) => new Date(b.fetched_at).getTime() - new Date(a.fetched_at).getTime())
    const latest = sorted[0]
    const current = latest.price_avg
    if (current == null) continue

    // prev_7d : snapshot le plus proche de J-7
    const prev7 = sorted.find((s) => new Date(s.fetched_at).getTime() <= sevenDaysAgo)
    const prev_7d = prev7?.price_avg ?? null

    // avg/min/max sur 30j
    const prices = sorted.map((s) => s.price_avg).filter((v): v is number => v != null)
    const avg_30d = prices.reduce((a, b) => a + b, 0) / prices.length
    const min_30d = Math.min(...prices)
    const max_30d = Math.max(...prices)

    // Sparkline : 10 points équirépartis sur les 30j (du plus ancien au plus récent)
    const sparkline = buildSparkline(sorted)

    stats.push({
      card_ref,
      current,
      prev_7d,
      avg_30d,
      min_30d,
      max_30d,
      snapshots_count: snaps.length,
      latest_meta: latest.source_meta ?? null,
      source: latest.source,
      variant: latest.variant,
      sparkline,
    })
  }

  return stats
}

function buildSparkline(sortedDesc: PriceSnapshot[]): number[] {
  // Inverse pour avoir chronologique ascendant
  const asc = [...sortedDesc].reverse()
  const target = 10
  if (asc.length <= target) return asc.map((s) => s.price_avg ?? 0)
  // Sample equispaced
  const step = (asc.length - 1) / (target - 1)
  const out: number[] = []
  for (let i = 0; i < target; i++) {
    const idx = Math.round(i * step)
    out.push(asc[idx].price_avg ?? 0)
  }
  return out
}

// ─── Règles d'alpha ─────────────────────────────────────────────────

function evaluateRules(stats: CardStats): AlphaSignal[] {
  const signals: AlphaSignal[] = []
  const meta = stats.latest_meta || {}

  // Floor : on ignore les cartes < 1€ (bruit, faible utilité signal)
  if (stats.current < 1) return signals

  // ── R1 : Brutal discount ──
  // Carte qui a chuté brutalement vs J-7. Souvent overcorrection = opportunité.
  if (stats.prev_7d != null && stats.prev_7d > 0) {
    const drop = (stats.current - stats.prev_7d) / stats.prev_7d
    if (drop <= -0.20) {
      const tier: 'S' | 'A' | 'B' = drop <= -0.35 ? 'S' : drop <= -0.25 ? 'A' : 'B'
      const target = Math.max(stats.avg_30d ?? stats.current, stats.prev_7d * 0.9)
      const upside = ((target - stats.current) / stats.current) * 100
      signals.push(buildSignal({
        stats, meta, rule: 'brutal_discount', tier,
        reference_price: stats.prev_7d,
        variation_pct: drop * 100,
        market_target: target,
        confidence_pct: tier === 'S' ? 70 : tier === 'A' ? 60 : 50,
        upside_pct: upside,
        momentum_score: drop * 100,
        ai_reason: `Chute de ${Math.abs(Math.round(drop * 100))}% en 7 jours sur Cardmarket. ${tier === 'S' ? 'Décote violente — souvent une overcorrection technique.' : 'Décote significative.'} Prix cible ramené à la moyenne 30j de ${target.toFixed(0)}€.`,
        tags: [
          `Chute ${Math.abs(Math.round(drop * 100))}%`,
          'Overcorrection',
          stats.snapshots_count > 15 ? 'Liquidité forte' : 'Liquidité modérée',
        ],
      }))
    }
  }

  // ── R2 : Undervalued vs 30d avg ──
  // Carte stable mais en dessous de sa moyenne mensuelle = entrée propre.
  if (stats.avg_30d != null && stats.avg_30d > 0) {
    const discount = (stats.current - stats.avg_30d) / stats.avg_30d
    if (discount <= -0.15 && stats.snapshots_count >= 5) {
      // Évite double-signaler avec R1 : skip si une chute brutale 7j déjà là
      const alreadyBrutal = signals.some((s) => s.rule === 'brutal_discount')
      if (!alreadyBrutal) {
        const tier: 'S' | 'A' | 'B' = discount <= -0.30 ? 'S' : discount <= -0.20 ? 'A' : 'B'
        const target = stats.avg_30d
        const upside = ((target - stats.current) / stats.current) * 100
        signals.push(buildSignal({
          stats, meta, rule: 'undervalued_30d', tier,
          reference_price: stats.avg_30d,
          variation_pct: discount * 100,
          market_target: target,
          confidence_pct: tier === 'S' ? 75 : tier === 'A' ? 65 : 55,
          upside_pct: upside,
          momentum_score: -discount * 50,
          ai_reason: `Carte tradée à ${Math.abs(Math.round(discount * 100))}% en dessous de sa moyenne 30 jours. Point d'entrée ${tier === 'S' ? 'attractif' : 'correct'} si l'historique reste cohérent. Cible : retour à ${target.toFixed(0)}€.`,
          tags: [
            `Décote ${Math.abs(Math.round(discount * 100))}%`,
            "Point d'entrée",
            `${stats.snapshots_count} snapshots`,
          ],
        }))
      }
    }
  }

  // ── R3 : Momentum 7d (hausse) ──
  // Hausse significative récente = la hype démarre.
  if (stats.prev_7d != null && stats.prev_7d > 0) {
    const change = (stats.current - stats.prev_7d) / stats.prev_7d
    if (change >= 0.15) {
      const tier: 'S' | 'A' | 'B' = change >= 0.30 ? 'S' : change >= 0.20 ? 'A' : 'B'
      const target = stats.current * (1 + change * 0.5) // momentum continue à mi-régime
      const upside = ((target - stats.current) / stats.current) * 100
      signals.push(buildSignal({
        stats, meta, rule: 'momentum_7d', tier,
        reference_price: stats.prev_7d,
        variation_pct: change * 100,
        market_target: target,
        confidence_pct: tier === 'S' ? 65 : tier === 'A' ? 55 : 45,
        upside_pct: upside,
        momentum_score: change * 100,
        ai_reason: `Hausse de ${Math.round(change * 100)}% en 7 jours. ${tier === 'S' ? 'Momentum fort — la hype semble démarrer.' : 'Momentum haussier émergent.'} Continuation possible vers ${target.toFixed(0)}€ si la dynamique persiste.`,
        tags: [
          `+${Math.round(change * 100)}% en 7j`,
          'Momentum haussier',
          tier === 'S' ? 'Hype émergente' : 'Tendance positive',
        ],
      }))
    }
  }

  return signals
}

interface BuildSignalArgs {
  stats: CardStats
  meta: Record<string, any>
  rule: AlphaSignal['rule']
  tier: AlphaSignal['tier']
  reference_price: number
  variation_pct: number
  market_target: number
  confidence_pct: number
  upside_pct: number
  momentum_score: number
  ai_reason: string
  tags: string[]
}

function buildSignal(a: BuildSignalArgs): AlphaSignal {
  const meta = a.meta || {}
  return {
    card_ref: a.stats.card_ref,
    tier: a.tier,
    rule: a.rule,
    current_price: round2(a.stats.current),
    reference_price: round2(a.reference_price),
    variation_pct: round2(a.variation_pct),
    market_target: round2(a.market_target),
    confidence_pct: Math.round(a.confidence_pct),
    upside_pct: round2(a.upside_pct),
    momentum_score: round2(a.momentum_score),
    card_name: meta.card_name ?? null,
    set_name: meta.set_name ?? null,
    set_id: meta.tcgdex_set_id ?? meta.set_id ?? null,
    local_id: meta.local_id ?? extractLocalId(a.stats.card_ref),
    lang: meta.lang ?? null,
    source: a.stats.source,
    variant: a.stats.variant,
    rarity: meta.rarity ?? null,
    sparkline: a.stats.sparkline,
    ai_reason: a.ai_reason,
    tags: a.tags,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function extractLocalId(cardRef: string): string | null {
  // tcgdex-base-set-4 → "4"
  const parts = cardRef.split('-')
  return parts.length ? parts[parts.length - 1] : null
}

// ─── Tier balancing ────────────────────────────────────────────────

function balanceTiers(signals: AlphaSignal[], targetTotal = 60): AlphaSignal[] {
  // Sort par tier puis par |variation_pct| desc
  const order = { S: 0, A: 1, B: 2 }
  const sorted = signals.sort((x, y) => {
    if (order[x.tier] !== order[y.tier]) return order[x.tier] - order[y.tier]
    return Math.abs(y.variation_pct) - Math.abs(x.variation_pct)
  })
  // On garde les meilleurs jusqu'à targetTotal
  return sorted.slice(0, targetTotal)
}

// ─── Persistence ────────────────────────────────────────────────────

async function persistSignals(signals: AlphaSignal[]): Promise<number> {
  if (!signals.length) return 0
  // Upsert sur (card_ref, rule, computed_date)
  const today = new Date().toISOString().slice(0, 10)
  const rows = signals.map((s) => ({
    ...s,
    computed_date: today,
    computed_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }))

  // Insert par batch de 200
  let written = 0
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH)
    const { error } = await (supabase as any)
      .from('alpha_signals')
      .upsert(slice, { onConflict: 'card_ref,rule,computed_date' })
    if (error) {
      console.error(`[alpha/compute] insert batch ${i} failed: ${error.message}`)
      continue
    }
    written += slice.length
  }
  return written
}

// ─── Handlers ───────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runCompute('cron')
}

export async function POST(request: Request) {
  // Pas d'auth pour POST manuel local — utilise un Bearer si tu veux
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runCompute('manual')
}

async function runCompute(triggeredBy: 'cron' | 'manual') {
  const log = await startSyncLog('alpha_signals_compute', triggeredBy)
  try {
    console.log('[alpha/compute] fetching card stats...')
    const stats = await fetchCardStats()
    console.log(`[alpha/compute] ${stats.length} cards with sufficient data`)

    const allSignals: AlphaSignal[] = []
    for (const s of stats) {
      const sigs = evaluateRules(s)
      allSignals.push(...sigs)
    }
    console.log(`[alpha/compute] ${allSignals.length} raw signals detected`)

    const balanced = balanceTiers(allSignals, 60)
    console.log(`[alpha/compute] keeping top ${balanced.length} balanced signals`)

    const written = await persistSignals(balanced)
    console.log(`[alpha/compute] persisted ${written} signals`)

    const stats_ = {
      cards_analyzed: stats.length,
      raw_signals: allSignals.length,
      kept_signals: balanced.length,
      persisted: written,
      by_tier: {
        S: balanced.filter((s) => s.tier === 'S').length,
        A: balanced.filter((s) => s.tier === 'A').length,
        B: balanced.filter((s) => s.tier === 'B').length,
      },
      by_rule: {
        brutal_discount: balanced.filter((s) => s.rule === 'brutal_discount').length,
        undervalued_30d: balanced.filter((s) => s.rule === 'undervalued_30d').length,
        momentum_7d: balanced.filter((s) => s.rule === 'momentum_7d').length,
      },
    }

    await finishSyncLog((log as any)?.id, 'success', stats_)
    return NextResponse.json({ ok: true, ...stats_ })
  } catch (e: any) {
    console.error('[alpha/compute] FAILED:', e)
    await finishSyncLog((log as any)?.id, 'error', { error: e.message })
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
