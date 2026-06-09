import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth/server'
import { headers } from 'next/headers'
import { sql } from '@/lib/db/sql'
import { getStripe, priceIdFor, earlyPriceIdFor, type Plan, type Cycle } from '@/lib/stripe'
import { isEarlyOpen } from '@/lib/early'

export const dynamic = 'force-dynamic'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://kodocards.com'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    const userId = session?.user?.id
    const userEmail = session?.user?.email
    if (!userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const plan = body.plan as Plan
    const cycle = body.cycle as Cycle
    if (!['pro', 'premium'].includes(plan) || !['weekly', 'monthly', 'yearly'].includes(cycle)) {
      return NextResponse.json({ error: 'plan/cycle invalide' }, { status: 400 })
    }

    const stripe = getStripe()

    // Offre Early Supporter : Premium uniquement, mensuel/annuel, places limitées.
    const wantEarly = body.early === true && plan === 'premium' && (cycle === 'monthly' || cycle === 'yearly')
    let priceId: string
    let isEarly = false
    if (wantEarly && (await isEarlyOpen())) {
      priceId = earlyPriceIdFor(cycle as 'monthly' | 'yearly')
      isEarly = true
    } else {
      priceId = priceIdFor(plan, cycle)
    }

    // Récupère ou crée le customer Stripe lié à cet user
    const rows = await sql.query(
      'SELECT stripe_customer_id FROM profiles WHERE id = $1',
      [userId]
    )
    let customerId: string | undefined = rows?.[0]?.stripe_customer_id || undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail || undefined,
        metadata: { userId },
      })
      customerId = customer.id
      await sql.query(
        'UPDATE profiles SET stripe_customer_id = $1, updated_at = now() WHERE id = $2',
        [customerId, userId]
      )
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      // metadata sur la session ET la subscription (le webhook lit subscription.metadata)
      metadata: { userId, plan, early: isEarly ? '1' : '0' },
      subscription_data: { metadata: { userId, plan, early: isEarly ? '1' : '0' } },
      allow_promotion_codes: true,
      success_url: `${APP_URL}/abonnement?success=1`,
      cancel_url: `${APP_URL}/abonnement?canceled=1`,
    })

    return NextResponse.json({ url: checkout.url })
  } catch (e: any) {
    console.error('[stripe/checkout]', e?.message || e)
    return NextResponse.json({ error: 'Erreur création checkout' }, { status: 500 })
  }
}
