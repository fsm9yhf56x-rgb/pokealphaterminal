import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { headers } from 'next/headers'
import { sql } from '@/lib/db/sql'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kodocards.com'

export async function POST() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const rows = await sql.query(
      'SELECT stripe_customer_id FROM profiles WHERE id = $1',
      [userId]
    )
    const customerId = rows?.[0]?.stripe_customer_id
    if (!customerId) {
      return NextResponse.json({ error: 'Aucun abonnement' }, { status: 400 })
    }

    const stripe = getStripe()
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${APP_URL}/abonnement`,
    })

    return NextResponse.json({ url: portal.url })
  } catch (e: any) {
    console.error('[stripe/portal]', e?.message || e)
    return NextResponse.json({ error: 'Erreur portail' }, { status: 500 })
  }
}
