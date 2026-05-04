import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'
import { writeSnapshots } from '@/lib/prices/writer'
import { startSyncLog, finishSyncLog } from '@/lib/sync-logger'
import type { PriceSnapshot, PriceVariant } from '@/lib/prices/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// Vercel Hobby max = 60s
export const maxDuration = 60

const supabase = getAdminClient()
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const TCGP_SEARCH = 'https://mp-search-api.tcgplayer.com/v1/search/request?q=&isList=true'
const TCGP_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.tcgplayer.com',
  'Referer': 'https://www.tcgplayer.com/',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
}

function buildPayload(productLine: string, setName: string, from = 0, size = 100) {
  return {
    algorithm: '',
    from,
    size,
    filters: {
      term: setName ? { productLineName: [productLine], setName: [setName] } : { productLineName: [productLine] },
      range: {},
      match: {},
    },
    listingSearch: {
      filters: {
        term: {},
        range: { quantity: { gte: 1 } },
        exclude: { channelExclusion: 0, listingType: 'Custom' },
      },
      context: { cart: {} },
    },
    context: { cart: {}, shippingCountry: 'US', userProfile: { productLineAffinity: '', priceAffinity: 0 } },
    sort: {},
  }
}

// Discover all setName slugs available on TCGPlayer for a given productLine.
async function fetchAllSetNames(productLine: string): Promise<{ slug: string; count: number }[]> {
  const r = await fetch(TCGP_SEARCH, {
    method: 'POST',
    headers: TCGP_HEADERS,
    body: JSON.stringify(buildPayload(productLine, '', 0, 1)),
  })
  console.log(`[tcgplayer] fetchAllSetNames(${productLine}) HTTP=${r.status}`)
  if (!r.ok) {
    const txt = await r.text().catch(() => '')
    console.error(`[tcgplayer] body sample: ${txt.slice(0, 200)}`)
    return []
  }
  const data = await r.json()
  const sets = data?.results?.[0]?.aggregations?.setName || []
  const result = sets
    .map((s: any) => ({ slug: s.urlValue as string, count: Number(s.count) }))
    .filter((s: any) => s.slug && s.count > 0)
    .sort((a: any, b: any) => a.slug.localeCompare(b.slug))
  console.log(`[tcgplayer] discovered ${result.length} sets for ${productLine}`)
  return result
}

async function fetchSetCards(productLine: string, setName: string): Promise<any[]> {
  const all: any[] = []
  let from = 0
  const SIZE = 100
  while (true) {
    const r = await fetch(TCGP_SEARCH, {
      method: 'POST',
      headers: TCGP_HEADERS,
      body: JSON.stringify(buildPayload(productLine, setName, from, SIZE)),
    })
    if (!r.ok) {
      console.error(`[tcgplayer] HTTP ${r.status} for set=${setName} from=${from}`)
      const txt = await r.text().catch(() => '')
      console.error(`[tcgplayer] body sample: ${txt.slice(0, 300)}`)
      break
    }
    const data = await r.json()
    const totalRes = data?.results?.[0]?.totalResults
    const hits = data?.results?.[0]?.results || []
    console.log(`[tcgplayer] set=${setName} from=${from} totalResults=${totalRes} hits=${hits.length}`)
    if (!hits.length) break
    all.push(...hits)
    if (hits.length < SIZE) break
    from += SIZE
    await sleep(300)
  }
  return all
}

// "052/102" -> "52", "GG69" -> "GG69", "WAT" -> "WAT"
function cleanNumber(rawNum?: string): string | null {
  if (!rawNum) return null
  const beforeSlash = rawNum.split('/')[0].trim()
  if (!beforeSlash) return null
  if (/^\d+$/.test(beforeSlash)) return String(parseInt(beforeSlash, 10))
  return beforeSlash
}

function detectVariant(rarity?: string, productName?: string, foilOnly?: boolean): PriceVariant {
  const r = (rarity || '').toLowerCase()
  const n = (productName || '').toLowerCase()
  if (n.includes('reverse')) return 'reverse_holo'
  if (r.includes('holo') || foilOnly || n.includes('holofoil')) return 'holo'
  return 'raw'
}

// Cursor-paginated batch (1 set/run on Hobby, looped 10x in workflow)
async function getNextSetsBatch(
  market: 'EN' | 'JP',
  batchSize: number = 1
): Promise<{ sets: { slug: string; count: number }[]; cursor: string | null; total: number }> {
  const productLine = market === 'JP' ? 'pokemon-japan' : 'pokemon'
  const allSets = await fetchAllSetNames(productLine)
  if (!allSets.length) return { sets: [], cursor: null, total: 0 }

  const { data: lastLog } = await supabase
    .from('sync_logs')
    .select('stats')
    .eq('job_name', `prices_tcgplayer_${market.toLowerCase()}`)
    .in('status', ['success', 'partial', 'error'])
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastCursor = (lastLog?.stats as any)?.lastSet || null

  let startIdx = 0
  if (lastCursor) {
    const idx = allSets.findIndex((s) => s.slug === lastCursor)
    startIdx = idx >= 0 ? idx + 1 : 0
    if (startIdx >= allSets.length) startIdx = 0
  }

  const batch = allSets.slice(startIdx, startIdx + batchSize)
  const newCursor = batch.length > 0 ? batch[batch.length - 1].slug : null
  return { sets: batch, cursor: newCursor, total: allSets.length }
}

async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// GET = cron entry point
export async function GET(request: Request) {
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const market = ((searchParams.get('market') || 'EN').toUpperCase() === 'JP' ? 'JP' : 'EN') as 'EN' | 'JP'
  const batchSize = Number(searchParams.get('batch') || '1')
  const { sets, cursor, total } = await getNextSetsBatch(market, batchSize)
  if (!sets.length) {
    return NextResponse.json({ skipped: true, reason: 'no sets discovered', total })
  }
  console.log(`[tcgplayer/${market}] batch ${sets.length}/${total} sets, cursor=${cursor}`)
  return syncTcgplayer(sets, market, 'cron', cursor, total)
}

// POST = manual trigger (full backfill or specific sets)
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({} as any))
  const market = ((body.market || 'EN').toUpperCase() === 'JP' ? 'JP' : 'EN') as 'EN' | 'JP'
  let sets: { slug: string; count: number }[] | undefined = body.sets
  if (!sets?.length) {
    sets = await fetchAllSetNames(market === 'JP' ? 'pokemon-japan' : 'pokemon')
  }
  return syncTcgplayer(sets, market, 'manual')
}

async function syncTcgplayer(
  sets: { slug: string; count: number }[],
  market: 'EN' | 'JP',
  triggeredBy: 'cron' | 'manual' = 'manual',
  _lastSet: string | null = null,
  totalSets: number = 0
) {
  const productLine = market === 'JP' ? 'pokemon-japan' : 'pokemon'
  const log: any = await startSyncLog(`prices_tcgplayer_${market.toLowerCase()}`, triggeredBy)
  try {
    let totalUpdated = 0
    let totalCards = 0
    const errors: string[] = []
    let snapshots: PriceSnapshot[] = []
    let lastProcessedSet: string | null = null

    for (const setInfo of sets) {
      try {
        const cards = await fetchSetCards(productLine, setInfo.slug)
        if (!cards.length) {
          errors.push(`Set ${setInfo.slug}: 0 cards returned`)
          lastProcessedSet = setInfo.slug
          continue
        }

        for (const card of cards) {
          if (card.sealed) continue
          const num = cleanNumber(card.customAttributes?.number)
          if (!num) continue

          if (card.marketPrice == null && card.lowestPrice == null && card.medianPrice == null) continue

          totalCards++

          const cardRef = `tcgplayer-${setInfo.slug}-${num}`
          const variant = detectVariant(card.rarityName, card.productName, card.foilOnly)
          const meta = {
            card_name: card.productName,
            tcgplayer_product_id: card.productId,
            tcgplayer_set_url_name: card.setUrlName,
            tcgplayer_set_slug: setInfo.slug,
            rarity: card.rarityName ?? null,
            market,
            total_listings: card.totalListings ?? null,
          }

          snapshots.push({
            card_ref: cardRef,
            source: 'tcgplayer',
            lang: market === 'JP' ? 'JA' : 'EN',
            variant,
            condition: 'NEAR_MINT',
            price_avg: card.marketPrice ?? null,
            price_low: card.lowestPrice ?? null,
            price_median: card.medianPrice ?? null,
            currency: 'USD',
            source_meta: meta,
          })
        }

        lastProcessedSet = setInfo.slug

        if (snapshots.length >= 500) {
          await writeSnapshots(snapshots)
          totalUpdated += snapshots.length
          snapshots = []
        }

        await sleep(500)
      } catch (e: any) {
        errors.push(`Set ${setInfo.slug}: ${e.message || e}`)
      }
    }

    if (snapshots.length > 0) {
      await writeSnapshots(snapshots)
      totalUpdated += snapshots.length
    }

    const stats: Record<string, unknown> = {
      market,
      setsProcessed: sets.length,
      totalSets,
      totalCards,
      totalUpdated,
      lastSet: lastProcessedSet,
      errors: errors.slice(0, 10),
      errorCount: errors.length,
    }

    const status: 'success' | 'partial' | 'error' =
      sets.length === 0
        ? 'error'
        : errors.length > 0
        ? 'partial'
        : 'success'

    await finishSyncLog(log.id, status, stats)

    return NextResponse.json({ ok: true, ...stats })
  } catch (e: any) {
    await finishSyncLog(log.id, 'error', { error: e.message })
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
