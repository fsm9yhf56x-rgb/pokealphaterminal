import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'
import { writeSnapshots } from '@/lib/prices/writer'
import { startSyncLog, finishSyncLog } from '@/lib/sync-logger'
import type { PriceSnapshot } from '@/lib/prices/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabase = getAdminClient()

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Slug converter — TCGdex set ID to our PokeTrace-style slug
function tcgdexIdToSlug(id: string, name: string): string {
  // Known mappings first
  const known: Record<string, string> = {
    'base1': 'base-set', 'base2': 'jungle', 'base3': 'fossil',
    'base4': 'base-set-2', 'base5': 'team-rocket',
    'gym1': 'gym-heroes', 'gym2': 'gym-challenge',
    'neo1': 'neo-genesis', 'neo2': 'neo-discovery',
    'neo3': 'neo-revelation', 'neo4': 'neo-destiny',
    'base6': 'legendary-collection',
    'ecard1': 'expedition', 'ecard2': 'aquapolis', 'ecard3': 'skyridge',
  }
  if (known[id]) return known[id]
  // Default: slugify the name
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ── Auto-detect TCGdex set IDs from portfolio (when no explicit sets given) ──
async function getPortfolioTcgdexSets(): Promise<string[]> {
  const { data } = await supabase.from('portfolio_cards').select('set_id')
  const rawSets = [...new Set((data || []).map((c: any) => c.set_id).filter(Boolean))]
  // Strip our internal variant suffixes — TCGdex doesn't know about them
  const cleaned = rawSets.map((s: string) => s.replace(/-shadowless(-ns)?|-1st/g, ''))
  return [...new Set(cleaned)]
}

// ── Auto-detect TCGdex set IDs from tcg_sets (paginated cursor) ──
// Sources from tcg_sets (848 entries) and filters out:
//   - aopkm-* (Pokemon Card Asia, JP-only, not on TCGdex EN/FR)
//   - en-2XXX / fr-2XXX (McDonald's collections — fragile data)
//   - en-A*, en-B*, fr-A*, fr-B* (Pokemon TCG Pocket, different from physical TCG)
// Strips lang prefixes (en-, fr-) to get true TCGdex IDs.
// TODO: replace this with a proper canonical `sets` table (see backlog: SCHEMA OVERHAUL).
async function getNextSetsBatch(lang: string, batchSize: number = 30): Promise<{ sets: string[]; cursor: string | null; total: number }> {
  // 1. Get all set IDs from tcg_sets (the 848-entry registry)
  const { data: setsRaw } = await supabase.from('tcg_sets').select('id')
  const allRaw = (setsRaw || []).map((r: any) => r.id as string).filter(Boolean)

  // 2. Filter out JP-only / Pocket / McDonalds
  const filtered = allRaw.filter((id) => {
    if (id.startsWith('aopkm-')) return false                    // Pokemon Card Asia (JP-only)
    if (/^(en|fr)-2\d{3}/.test(id)) return false                 // McDonald's collections
    if (/^(en|fr)-[AB]\d/.test(id)) return false                 // Pokemon TCG Pocket
    return true
  })

  // 3. Strip lang prefix to get TCGdex-compatible IDs (e.g. "en-base1" -> "base1")
  const langPrefix = lang.toLowerCase() + '-'
  const stripped = filtered.map((id) => {
    if (id.startsWith('en-')) return id.slice(3)
    if (id.startsWith('fr-')) return id.slice(3)
    if (id.startsWith('jp-')) return id.slice(3)
    return id
  })

  // 4. Deduplicate + clean variant suffixes + sort
  const allSets = [...new Set(
    stripped.map((s) => s.replace(/-shadowless(-ns)?|-1st/g, ''))
  )].sort()

  if (!allSets.length) return { sets: [], cursor: null, total: 0 }

  // 5. Read last cursor from sync_logs
  const { data: lastLog } = await supabase
    .from('sync_logs')
    .select('stats')
    .eq('job_name', `prices_tcgdex_${lang}`)
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  const lastCursor = (lastLog?.stats as any)?.lastSet || null

  // 6. Find next batch starting after lastCursor (or from start if cursor not found / cycle complete)
  let startIdx = 0
  if (lastCursor) {
    const idx = allSets.indexOf(lastCursor)
    startIdx = idx >= 0 ? idx + 1 : 0
    if (startIdx >= allSets.length) startIdx = 0 // cycle back to start
  }

  const batch = allSets.slice(startIdx, startIdx + batchSize)
  const newCursor = batch.length > 0 ? batch[batch.length - 1] : null
  return { sets: batch, cursor: newCursor, total: allSets.length }
}

// Add Bearer auth check (CRON_SECRET) for protected GET trigger
async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // no secret configured = open
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// GET = cron entry point (auth required, paginated batch from tcg_cards)
export async function GET(request: Request) {
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'en'
  const batchSize = Number(searchParams.get('batch') || '30')
  const { sets, cursor, total } = await getNextSetsBatch(lang, batchSize)
  if (!sets.length) {
    return NextResponse.json({ skipped: true, reason: 'no sets found in DB', total })
  }
  console.log(`[tcgdex/${lang}] batch ${sets.length}/${total} sets, cursor=${cursor}`)
  return syncTcgdex(sets, lang, 'cron', cursor, total)
}

export async function POST(request: Request) {
  let { sets = [], lang = 'en' } = await request.json().catch(() => ({}))
  // Auto-detect if no sets given
  if (!sets.length) {
    sets = await getPortfolioTcgdexSets()
  }
  return syncTcgdex(sets, lang)
}

async function syncTcgdex(sets: string[], lang: string, triggeredBy: 'cron' | 'manual' = 'manual', lastSet: string | null = null, totalSets: number = 0) {
  const log = await startSyncLog(`prices_tcgdex_${lang}`, triggeredBy)
  try {
  let totalUpdated = 0
  let totalCards = 0
  const errors: string[] = []

  const snapshots: PriceSnapshot[] = []

  for (const tcgdexSetId of sets) {

    try {
      // Fetch set card list
      const setR = await fetch(`https://api.tcgdex.net/v2/${lang}/sets/${tcgdexSetId}`)
      if (!setR.ok) { errors.push(`Set ${tcgdexSetId}: ${setR.status}`); continue }
      const setData = await setR.json()
      const slug = tcgdexIdToSlug(tcgdexSetId, setData.name || tcgdexSetId)
      const cards = setData.cards || []

      for (const card of cards) {
        const cardId = `${tcgdexSetId}-${card.localId}`
        try {
          const cardR = await fetch(`https://api.tcgdex.net/v2/${lang}/cards/${cardId}`)
          if (!cardR.ok) continue
          const cardData = await cardR.json()
          const cm = cardData.pricing?.cardmarket

          if (cm && (cm.avg || cm.trend || cm['avg-holo'] || cm['trend-holo'])) {
            totalCards++

            const cardRefBase = `tcgdex-${slug}-${card.localId}`
            const baseMeta = {
              card_name: cardData.name,
              tcgdex_set_id: tcgdexSetId,
              tcgdex_id_product: cm.idProduct ?? null,
              lang,
            }
            const now = Date.now()

            // ── RAW (non-holo unlimited) ──
            if (cm.avg || cm.trend) {
              const rawAvg = cm.avg ?? cm.trend ?? null
              // Snapshot du jour
              snapshots.push({
                card_ref: cardRefBase,
                source: 'cardmarket',
                variant: 'raw',
                price_avg: rawAvg,
                price_low: cm.low ?? null,
                currency: 'EUR',
                source_meta: { ...baseMeta, cardmarket_trend: cm.trend ?? null, period_label: 'current' },
              })
              // Historique rétroactif (J-1, J-7, J-30) — synthetic flag
              if (cm.avg1) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'raw',
                price_avg: cm.avg1, period_days: 1, currency: 'EUR',
                fetched_at: new Date(now - 1 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg1' },
              })
              if (cm.avg7) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'raw',
                price_avg: cm.avg7, period_days: 7, currency: 'EUR',
                fetched_at: new Date(now - 7 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg7' },
              })
              if (cm.avg30) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'raw',
                price_avg: cm.avg30, period_days: 30, currency: 'EUR',
                fetched_at: new Date(now - 30 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg30' },
              })
            }

            // ── HOLO variant ──
            const holoAvg = cm['avg-holo'] ?? cm['trend-holo'] ?? null
            if (holoAvg) {
              snapshots.push({
                card_ref: cardRefBase,
                source: 'cardmarket',
                variant: 'holo',
                price_avg: holoAvg,
                price_low: cm['low-holo'] ?? null,
                currency: 'EUR',
                source_meta: { ...baseMeta, cardmarket_trend: cm['trend-holo'] ?? null, period_label: 'current' },
              })
              if (cm['avg1-holo']) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'holo',
                price_avg: cm['avg1-holo'], period_days: 1, currency: 'EUR',
                fetched_at: new Date(now - 1 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg1-holo' },
              })
              if (cm['avg7-holo']) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'holo',
                price_avg: cm['avg7-holo'], period_days: 7, currency: 'EUR',
                fetched_at: new Date(now - 7 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg7-holo' },
              })
              if (cm['avg30-holo']) snapshots.push({
                card_ref: cardRefBase, source: 'cardmarket', variant: 'holo',
                price_avg: cm['avg30-holo'], period_days: 30, currency: 'EUR',
                fetched_at: new Date(now - 30 * 24 * 60 * 60 * 1000),
                source_meta: { ...baseMeta, synthetic: true, period_label: 'avg30-holo' },
              })
            }
            // Only update non-variant rows (TCGdex doesn't distinguish 1st Ed/Shadowless)
            // For shadowless/1st edition variants, Cardmarket is "Non disponible"
            const { data: allRows } = await supabase.from('_deprecated_prices')
              .select('id, set_slug, variant')
              .eq('set_slug', slug)
              .eq('card_number', card.localId.padStart(3, '0') + '/' + String(cards.length).padStart(3, '0'))
            
            // Filter: only non-shadowless slugs AND skip variants specific to 1st Ed
            const eligible = (allRows || []).filter(r => 
              !r.set_slug.includes('shadowless') &&
              r.variant !== '1st_Edition_Holofoil'
            )
            
            if (eligible.length) {
              for (const v of eligible) {
                await supabase.from('_deprecated_prices')
                  .update({
                    cardmarket_avg: cm.avg || null,
                    cardmarket_low: cm.low || null,
                    cardmarket_trend: cm.trend || null,
                  })
                  .eq('id', v.id)
                totalUpdated++
              }
            } else {
              // Also try matching by card name
              const { data: byName } = await supabase.from('_deprecated_prices')
                .select('id')
                .eq('set_slug', slug)
                .ilike('card_name', cardData.name)
                .limit(10)

              if (byName?.length) {
                for (const bn of byName) {
                  await supabase.from('_deprecated_prices')
                    .update({
                      cardmarket_avg: cm.avg || null,
                      cardmarket_low: cm.low || null,
                      cardmarket_trend: cm.trend || null,
                    })
                    .eq('id', bn.id)
                  totalUpdated++
                }
              } else {
                // No PokeTrace row exists — create a new row with just Cardmarket data
                const cardNumberFormatted = card.localId.padStart(3, '0') + '/' + String(cards.length).padStart(3, '0')
                await supabase.from('_deprecated_prices').insert({
                  card_name: cardData.name,
                  card_number: cardNumberFormatted,
                  set_slug: slug,
                  set_name: setData.name,
                  poketrace_id: 'tcgdex-' + slug + '-' + card.localId,
                  market: 'EU',
                  currency: 'EUR',
                  cardmarket_avg: cm.avg || null,
                  cardmarket_low: cm.low || null,
                  cardmarket_trend: cm.trend || null,
                  top_price: cm.avg || cm.trend || null,
                  condition: 'NEAR_MINT',
                  tier: (cm.avg || 0) >= 20 ? 'hot' : (cm.avg || 0) >= 1 ? 'warm' : 'cold',
                  source: 'tcgdex',
                  fetched_at: new Date().toISOString(),
                })
                totalUpdated++
              }
            }
          }
          // Respect TCGdex rate limits
          await sleep(100)
        } catch {}
      }
    } catch (e: any) {
      errors.push(`${tcgdexSetId}: ${e.message}`)
    }
  }

  if (snapshots.length > 0) {
    try {
      await writeSnapshots(snapshots)
    } catch (err: any) {
      console.warn('[tcgdex] writeSnapshots failed (non-fatal):', err?.message)
    }
  }

  const stats = { totalCards, totalUpdated, errorCount: errors.length, lang, lastSet, totalSets, currentBatch: sets.length, batchSets: sets }
  await finishSyncLog(log, errors.length > 0 ? 'partial' : 'success', stats, errors.length ? errors.slice(0,3).join(' | ') : null)
  return NextResponse.json({ totalCards, totalUpdated, lastSet, totalSets, currentBatch: sets.length, errors: errors.length ? errors : undefined })
  } catch (e: any) {
    await finishSyncLog(log, 'error', null, e?.message ?? String(e))
    throw e
  }
}
