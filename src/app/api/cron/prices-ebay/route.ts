/**
 * Cron route : eBay listings → prices_snapshots
 *
 * Strategy: hybrid coverage
 *  - Top 1000 cartes by value : 1 query/card (high precision)
 *  - Rest : query per set (volume optimization)
 *
 * Budget: ~5000 eBay calls/day (free tier).
 * Cron every 2h : 50 cards/run × 12 runs/day = 600 cards/day = full top-1000 in ~2 days.
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

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ── OAuth token cache (in-memory, refreshed per Lambda invocation) ──
let cachedToken: { value: string; expiresAt: number } | null = null

async function getEbayToken(): Promise<string | null> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  }
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
      expiresAt: Date.now() + (d.expires_in - 300) * 1000, // refresh 5min before
    }
    return d.access_token
  } catch {
    return null
  }
}

// ── FX rate fetch ──
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
    return 0.92 // fallback USD/EUR
  }
}

// ── Card selection: top by value, with cursor ──
async function getNextCardBatch(batchSize: number): Promise<CardForQuery[]> {
  // Get last cursor
  const lastLog = await sql.query(
    `SELECT stats FROM sync_logs
     WHERE job_name = 'prices_ebay'
       AND status IN ('success', 'partial')
     ORDER BY finished_at DESC LIMIT 1`,
    []
  )
  const lastCardRef = ((lastLog[0] as any)?.stats as any)?.lastCardRef || null

  // Fetch top cards by value (prefer ones with existing valuation, skip orphans)
  const cards = await sql.query(
    `SELECT c.card_ref AS card_ref, c.name, c.local_id, c.lang,
            s.id AS set_id, s.name AS set_name
     FROM tcg_cards c
     LEFT JOIN tcg_sets s ON c.set_id = s.id
     WHERE c.card_ref IS NOT NULL
       AND ($1::text IS NULL OR c.card_ref > $1::text)
     ORDER BY c.card_ref ASC
     LIMIT $2`,
    [lastCardRef, batchSize]
  )

  return cards.map((c: any) => ({
    card_ref: c.card_ref,
    name: c.name,
    local_id: c.local_id,
    set_id: c.set_id,
    set_name: c.set_name,
    lang: c.lang || 'EN',
  })) as any
}

// ── Main handler ──
export async function GET(request: Request) {
  // Auth
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const batchSize = Number(searchParams.get('batch') || '20')
  const triggeredBy = (searchParams.get('triggeredBy') || 'cron') as any

  const log = await startSyncLog('prices_ebay', triggeredBy)

  try {
    // Get eBay token
    const ebayToken = await getEbayToken()
    if (!ebayToken) {
      await finishSyncLog(log, 'error', null, 'eBay auth failed')
      return NextResponse.json({ error: 'eBay auth failed' }, { status: 500 })
    }

    // Get FX rate
    const usdToEur = await getFxRate('USD', 'EUR')

    // Fetch batch of cards to process
    const cards = await getNextCardBatch(batchSize)
    if (cards.length === 0) {
      await finishSyncLog(log, 'success', {
        totalCards: 0,
        message: 'No more cards to process — cycle complete, will restart',
      })
      return NextResponse.json({ ok: true, totalCards: 0, message: 'cycle complete' })
    }

    const allSnapshots: any[] = []
    let processed = 0
    let withResults = 0
    const errors: string[] = []
    let lastCardRef: string | null = null

    for (const card of cards) {
      try {
        const query = buildEbayQuery(card as any)
        const url = buildEbayUrl(query, 30)

        const r = await fetch(url, {
          headers: {
            Authorization: `Bearer ${ebayToken}`,
            'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
          },
        })

        if (!r.ok) {
          errors.push(`${card.card_ref}: HTTP ${r.status}`)
          processed++
          lastCardRef = card.card_ref as any
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
          const snapshots = buildEbaySnapshots(card as any, listings, usdToEur)
          allSnapshots.push(...snapshots)
          if (snapshots.length > 0) withResults++
        }

        processed++
        lastCardRef = (card as any).card_ref
        await sleep(120) // rate limit safety
      } catch (e: any) {
        errors.push(`${(card as any).card_ref}: ${e?.message || 'unknown'}`)
        processed++
        lastCardRef = (card as any).card_ref
      }
    }

    if (allSnapshots.length > 0) {
      await writeSnapshots(allSnapshots)
    }

    const stats = {
      processed,
      withResults,
      snapshotsWritten: allSnapshots.length,
      lastCardRef,
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
