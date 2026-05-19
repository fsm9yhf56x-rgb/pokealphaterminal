/**
 * Cron route: eBay Browse API → prices_snapshots
 *
 * Multi-lang (EN/FR/JP) coverage of Pokemon cards via eBay US listings.
 * Captures all variants (raw + graded) per card with title parsing.
 *
 * Strategy:
 *  - Cursor-based: continues from last successful tcg_cards.id
 *  - Filters by lang via ?lang=EN|FR|JP (default = EN)
 *  - Batch size via ?batch=N (default = 20, max ~50)
 *  - Writes card_ref = tcg_cards.id directly (canonical from day one)
 *  - Auto-fills card_aliases.ebay_card_ref for future mappings
 */

import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { writeSnapshots } from '@/lib/prices/writer'
import { startSyncLog, finishSyncLog } from '@/lib/sync-logger'
import {
  buildEbayQuery,
  buildEbayUrl,
  buildEbaySnapshots,
  type EbayListing,
  type CardForQuery,
} from '@/lib/prices/adapters/ebay-mapper'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const CRON_SECRET = process.env.CRON_SECRET
const EBAY_APP_ID = process.env.EBAY_APP_ID || ''
const EBAY_CERT_ID = process.env.EBAY_CERT_ID || ''

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── OAuth token cache ────────────────────────────────────────────────
let cachedToken: { value: string; expiresAt: number } | null = null

async function getEbayToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value
  if (!EBAY_APP_ID || !EBAY_CERT_ID) return null

  try {
    const auth = Buffer.from(`${EBAY_APP_ID}:${EBAY_CERT_ID}`).toString('base64')
    const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${auth}`,
      },
      body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
    })
    const d = await r.json()
    if (!d.access_token) return null
    cachedToken = {
      value: d.access_token,
      expiresAt: Date.now() + (d.expires_in - 300) * 1000,
    }
    return d.access_token
  } catch {
    return null
  }
}

// ── FX rate fetch ────────────────────────────────────────────────────
async function getFxRate(from: string, to: string): Promise<number> {
  try {
    const rows = await sql.query(
      `SELECT rate FROM fx_rates
       WHERE from_currency = $1 AND to_currency = $2
       ORDER BY rate_date DESC LIMIT 1`,
      [from, to]
    )
    return (rows[0] as any)?.rate ? Number((rows[0] as any).rate) : 0.92
  } catch {
    return 0.92
  }
}

// ── Card batch fetcher ───────────────────────────────────────────────
interface DbCard {
  id: string
  set_id: string | null
  local_id: string | null
  name: string
  lang: 'EN' | 'FR' | 'JP'
  set_name: string | null
}

async function getNextCardBatch(
  lang: 'EN' | 'FR' | 'JP',
  batchSize: number,
): Promise<DbCard[]> {
  // Resume cursor
  const lastLog = await sql.query(
    `SELECT stats FROM sync_logs
     WHERE job_name = 'prices_ebay_' || LOWER($1::text)
       AND status IN ('success', 'partial')
     ORDER BY finished_at DESC LIMIT 1`,
    [lang]
  )
  const lastCardId = ((lastLog[0] as any)?.stats as any)?.lastCardId || null

  // Bloomberg-grade filter: only cards with eBay match potential
  // EN/FR: rarity (rare+) AND exclude TCG Pocket sets (en-A*, en-B*, en-P-A*)
  // JP: name suffix (ex/V/VMAX/VSTAR/GX) since rarity_normalized is NULL on JP
  const tcgPocketExclusion = "AND NOT (c.set_id ~ '^(en|fr)-(A[0-9]|B[0-9]|P-A)')"
  const rarityFilter = lang === 'JP'
    ? "AND (c.name LIKE '% ex' OR c.name LIKE '% EX' OR c.name LIKE '% V' OR c.name LIKE '% VMAX' OR c.name LIKE '% VSTAR' OR c.name LIKE '% GX')"
    : `AND c.rarity_normalized IN (
        'rare', 'holo_rare', 'rare_holo',
        'ultra_rare', 'double_rare',
        'illustration_rare', 'special_illustration_rare',
        'hyper_rare', 'shiny_rare', 'shiny_ultra_rare',
        'radiant_rare', 'amazing_rare', 'secret_rare',
        'ace_spec', 'prime', 'legend',
        'classic_collection', 'black_white_rare', 'full_art_trainer'
      ) ${tcgPocketExclusion}`

  // For FR/JP cards, prefer the English set name (used by eBay listings)
  // We bridge via set_aliases: get tcgdex_slug from our set, then re-lookup EN equivalent
  const cards = await sql.query(
    `SELECT
        c.id, c.set_id, c.local_id, c.name, c.lang,
        COALESCE(sa_en.name, s.name) AS set_name
     FROM tcg_cards c
     LEFT JOIN tcg_sets s ON c.set_id = s.id
     LEFT JOIN set_aliases sa_local
       ON sa_local.internal_set_id = c.set_id AND sa_local.lang = c.lang
     LEFT JOIN set_aliases sa_en
       ON sa_en.tcgdex_slug = sa_local.tcgdex_slug AND sa_en.lang = 'EN'
     WHERE c.lang = $1::text
       AND c.name IS NOT NULL
       ${rarityFilter}
       AND ($2::text IS NULL OR c.id > $2::text)
     ORDER BY c.id ASC
     LIMIT $3::int`,
    [lang, lastCardId, batchSize]
  )

  return (cards as any[]).map((c) => ({
    id: c.id,
    set_id: c.set_id,
    local_id: c.local_id,
    name: c.name,
    lang: c.lang,
    set_name: c.set_name,
  }))
}

// ── Record ebay_card_ref mapping into card_aliases ────────────────────
async function recordEbayMapping(tcgCardId: string, ebayQuery: string): Promise<void> {
  try {
    // Only record if we don't already have an ebay_card_ref for this card
    await sql.query(
      `UPDATE card_aliases
       SET ebay_card_ref = $1, updated_at = now()
       WHERE tcg_card_id = $2 AND (ebay_card_ref IS NULL OR ebay_card_ref = '')`,
      [ebayQuery, tcgCardId]
    )
  } catch {
    // Non-fatal
  }
}

// ── Main handler ─────────────────────────────────────────────────────
export async function GET(request: Request) {
  // Auth
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const langParam = (searchParams.get('lang') || 'EN').toUpperCase()
  const lang = (['EN', 'FR', 'JP'].includes(langParam) ? langParam : 'EN') as
    | 'EN'
    | 'FR'
    | 'JP'
  const batchSize = Math.min(Math.max(Number(searchParams.get('batch') || '20'), 1), 50)
  const triggeredBy = (searchParams.get('triggeredBy') || 'cron') as any

  const jobName = `prices_ebay_${lang.toLowerCase()}`
  const log = await startSyncLog(jobName, triggeredBy)

  try {
    const ebayToken = await getEbayToken()
    if (!ebayToken) {
      await finishSyncLog(log, 'error', null, 'eBay auth failed')
      return NextResponse.json({ error: 'eBay auth failed' }, { status: 500 })
    }

    const usdToEur = await getFxRate('USD', 'EUR')

    const cards = await getNextCardBatch(lang, batchSize)
    if (cards.length === 0) {
      await finishSyncLog(log, 'success', {
        lang,
        message: 'No more cards — cycle complete (will restart on next run)',
      })
      return NextResponse.json({ ok: true, lang, totalCards: 0 })
    }

    const allSnapshots: any[] = []
    let processed = 0
    let withResults = 0
    const errors: string[] = []
    let lastCardId: string | null = null

    for (const card of cards) {
      try {
        const cardForQuery: CardForQuery = {
          name: card.name,
          local_id: card.local_id,
          set_id: card.set_id,
          set_name: card.set_name,
          lang: card.lang === 'JP' ? 'JA' : (card.lang as 'EN' | 'FR'),
        }
        const query = buildEbayQuery(cardForQuery)
        const url = buildEbayUrl(query, 30)


        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${ebayToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        })

        if (!r.ok) {
          errors.push(`${card.id}: HTTP ${r.status}`)
          processed++
          lastCardId = card.id
          continue
        }

        const data = await r.json()
        const items = (data.itemSummaries || []) as any[]
        const listings: EbayListing[] = items
          .filter((i: any) => i.price?.value)
          .map((i: any) => ({
            title: i.title || '',
            price_value: Number(i.price.value),
            price_currency: i.price.currency || 'USD',
            condition: i.condition,
          }))


        if (listings.length >= 3) {
          const snapshots = buildEbaySnapshots(
            {
              card_ref: card.id,
              lang: cardForQuery.lang,
              name: card.name,
              set_name: card.set_name,
              local_id: card.local_id,
            },
            listings,
            usdToEur
          )
          if (snapshots.length > 0) {
            allSnapshots.push(...snapshots)
            withResults++
            // Record canonical mapping (fire-and-forget)
            recordEbayMapping(card.id, query).catch(() => {})
          }
        }

        processed++
        lastCardId = card.id
        await sleep(150) // rate-limit safety (50ms minimum, 150 for headroom)
      } catch (e: any) {
        errors.push(`${card.id}: ${e?.message || 'unknown'}`)
        processed++
        lastCardId = card.id
      }
    }

    if (allSnapshots.length > 0) await writeSnapshots(allSnapshots)

    const stats = {
      lang,
      processed,
      withResults,
      snapshotsWritten: allSnapshots.length,
      lastCardId,
      errorCount: errors.length,
      errors: errors.slice(0, 10),
      fxRate: usdToEur,
    }

    await finishSyncLog(log, errors.length > 0 ? 'partial' : 'success', stats)
    return NextResponse.json({ ok: true, ...stats })
  } catch (e: any) {
    await finishSyncLog(log, 'error', null, e?.message || 'unknown')
    return NextResponse.json({ error: e?.message || 'unknown' }, { status: 500 })
  }
}
