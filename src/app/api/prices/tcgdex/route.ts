import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/db'
import { writeSnapshots } from '@/lib/prices/writer'
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

// Add Bearer auth check (CRON_SECRET) for protected GET trigger
async function isAuthorizedCron(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return true // no secret configured = open
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${cronSecret}`
}

// GET = cron entry point (auth required, auto-detects portfolio sets)
export async function GET(request: Request) {
  if (!(await isAuthorizedCron(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const lang = searchParams.get('lang') || 'en'
  const sets = await getPortfolioTcgdexSets()
  if (!sets.length) {
    return NextResponse.json({ skipped: true, reason: 'no portfolio sets' })
  }
  // Reuse the same processing path as POST by calling syncTcgdex directly
  return syncTcgdex(sets, lang)
}

export async function POST(request: Request) {
  let { sets = [], lang = 'en' } = await request.json().catch(() => ({}))
  // Auto-detect if no sets given
  if (!sets.length) {
    sets = await getPortfolioTcgdexSets()
  }
  return syncTcgdex(sets, lang)
}

async function syncTcgdex(sets: string[], lang: string) {
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

          if (cm && (cm.avg || cm.trend)) {
            totalCards++

            snapshots.push({
              card_ref: `tcgdex-${slug}-${card.localId}`,
              source: 'cardmarket',
              variant: 'raw',
              price_avg: cm.avg ?? null,
              price_low: cm.low ?? null,
              currency: 'EUR',
              source_meta: {
                card_name: cardData.name,
                tcgdex_set_id: tcgdexSetId,
                cardmarket_trend: cm.trend ?? null,
              },
            })
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

  return NextResponse.json({ totalCards, totalUpdated, errors: errors.length ? errors : undefined })
}
