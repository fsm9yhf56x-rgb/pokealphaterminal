import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// TCGdex set ID → our set_slug mapping
const TCGDEX_TO_SLUG: Record<string, string> = {
  'base1': 'base-set',
  'base2': 'jungle',
  'base3': 'fossil',
  'base4': 'base-set-2',
  'base5': 'team-rocket',
  'gym1': 'gym-heroes',
  'gym2': 'gym-challenge',
  'neo1': 'neo-genesis',
  'neo2': 'neo-discovery',
  'neo3': 'neo-revelation',
  'neo4': 'neo-destiny',
  'base6': 'legendary-collection',
  'ecard1': 'expedition',
  'ecard2': 'aquapolis',
  'ecard3': 'skyridge',
}

export async function POST(request: Request) {
  const { sets = Object.keys(TCGDEX_TO_SLUG) } = await request.json().catch(() => ({}))
  
  let totalUpdated = 0
  let totalCards = 0
  const errors: string[] = []

  for (const tcgdexSetId of sets) {
    const slug = TCGDEX_TO_SLUG[tcgdexSetId]
    if (!slug) continue

    try {
      // Fetch set card list
      const setR = await fetch(`https://api.tcgdex.net/v2/en/sets/${tcgdexSetId}`)
      if (!setR.ok) { errors.push(`Set ${tcgdexSetId}: ${setR.status}`); continue }
      const setData = await setR.json()
      const cards = setData.cards || []

      for (const card of cards) {
        const cardId = `${tcgdexSetId}-${card.localId}`
        try {
          const cardR = await fetch(`https://api.tcgdex.net/v2/en/cards/${cardId}`)
          if (!cardR.ok) continue
          const cardData = await cardR.json()
          const cm = cardData.pricing?.cardmarket

          if (cm && (cm.avg || cm.trend)) {
            totalCards++
            // Update existing price row with Cardmarket data
            const { data: existing } = await supabase.from('prices')
              .select('id')
              .eq('set_slug', slug)
              .eq('card_number', card.localId.padStart(3, '0') + '/' + String(cards.length).padStart(3, '0'))
              .eq('source', 'poketrace')
              .limit(1)

            if (existing?.length) {
              await supabase.from('prices')
                .update({
                  cardmarket_avg: cm.avg || null,
                  cardmarket_low: cm.low || null,
                  cardmarket_trend: cm.trend || null,
                })
                .eq('id', existing[0].id)
              totalUpdated++
            } else {
              // Also try matching by card name
              const { data: byName } = await supabase.from('prices')
                .select('id')
                .eq('set_slug', slug)
                .ilike('card_name', cardData.name)
                .eq('source', 'poketrace')
                .limit(1)

              if (byName?.length) {
                await supabase.from('prices')
                  .update({
                    cardmarket_avg: cm.avg || null,
                    cardmarket_low: cm.low || null,
                    cardmarket_trend: cm.trend || null,
                  })
                  .eq('id', byName[0].id)
                totalUpdated++
              } else {
                // No PokeTrace row exists — create a new row with just Cardmarket data
                const cardNumberFormatted = card.localId.padStart(3, '0') + '/' + String(cards.length).padStart(3, '0')
                await supabase.from('prices').insert({
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

  return NextResponse.json({ totalCards, totalUpdated, errors: errors.length ? errors : undefined })
}
