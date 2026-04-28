/**
 * eBay Marketplace User Account Deletion notification endpoint.
 *
 * Required by eBay for ALL active developer applications.
 *
 * Two flows:
 *
 * 1. GET ?challenge_code=XXX
 *    → Verification handshake. eBay sends this when we register the URL.
 *      We must reply with sha256(challenge_code + verification_token + endpoint_url)
 *      as JSON: { challengeResponse: "<hex>" }
 *
 * 2. POST (body: notification payload)
 *    → Real notification: a user has requested data deletion.
 *      We log it (Supabase) and return 200. PokéAlpha doesn't store eBay user PII
 *      (we use client_credentials, not user OAuth), so no purge logic is required.
 *
 * Setup:
 *   - EBAY_VERIFICATION_TOKEN: 32-80 chars [a-zA-Z0-9_-], same value in eBay Alerts page
 *   - EBAY_DELETION_ENDPOINT: exact URL of this endpoint (must match what's saved on eBay)
 *     e.g. "https://pokealphaterminal.vercel.app/api/ebay/account-deletion"
 */

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminClient } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const VERIFICATION_TOKEN = process.env.EBAY_VERIFICATION_TOKEN || ''
const DELETION_ENDPOINT = process.env.EBAY_DELETION_ENDPOINT || ''

function computeChallengeResponse(challengeCode: string): string {
  // eBay spec: sha256(challenge_code + verification_token + endpoint_url) → hex
  const hash = crypto.createHash('sha256')
  hash.update(challengeCode)
  hash.update(VERIFICATION_TOKEN)
  hash.update(DELETION_ENDPOINT)
  return hash.digest('hex')
}

// ── GET: challenge_code verification handshake ──
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challengeCode = searchParams.get('challenge_code')

  if (!challengeCode) {
    return NextResponse.json(
      { error: 'Missing challenge_code query parameter' },
      { status: 400 }
    )
  }

  if (!VERIFICATION_TOKEN || !DELETION_ENDPOINT) {
    return NextResponse.json(
      { error: 'Server not configured: missing EBAY_VERIFICATION_TOKEN or EBAY_DELETION_ENDPOINT' },
      { status: 500 }
    )
  }

  const challengeResponse = computeChallengeResponse(challengeCode)

  // Must respond with Content-Type: application/json (NextResponse.json does this)
  return NextResponse.json({ challengeResponse }, { status: 200 })
}

// ── POST: real account deletion notification ──
export async function POST(request: Request) {
  let body: any = null
  try {
    body = await request.json()
  } catch {
    body = null
  }

  // Log the notification for compliance audit trail
  try {
    const supabase = getAdminClient()
    await supabase.from('sync_logs').insert({
      job_name: 'ebay_account_deletion_notification',
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      status: 'success',
      stats: {
        notification_id: body?.notification?.notificationId ?? null,
        event_date: body?.notification?.eventDate ?? null,
        publish_date: body?.notification?.publishDate ?? null,
        topic: body?.metadata?.topic ?? null,
        // We deliberately DO NOT store the username/userId — RGPD-friendly default
        received_at: new Date().toISOString(),
      },
      triggered_by: 'event' as any,
    })
  } catch (e: any) {
    console.warn('[ebay/account-deletion] failed to log notification (non-fatal):', e?.message)
  }

  // PokéAlpha does NOT store any eBay user PII (we use client_credentials OAuth, not user OAuth).
  // No purge logic is necessary. We acknowledge receipt with 200.
  return NextResponse.json({ received: true }, { status: 200 })
}
