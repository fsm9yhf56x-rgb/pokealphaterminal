import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getStripe, planFromPriceId } from '@/lib/stripe'
import type Stripe from 'stripe'

export const dynamic = 'force-dynamic'
// Le webhook a besoin du body brut pour vérifier la signature (pas de parsing JSON auto)
export const runtime = 'nodejs'

export async function POST(req: Request) {
  const stripe = getStripe()
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET manquante')
    return NextResponse.json({ error: 'config' }, { status: 500 })
  }

  const sig = req.headers.get('stripe-signature')
  const raw = await req.text() // body brut indispensable pour constructEvent

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(raw, sig as string, secret)
  } catch (e: any) {
    console.error('[stripe/webhook] signature invalide:', e?.message)
    return NextResponse.json({ error: 'signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const userId = s.metadata?.userId
        const customerId = (s.customer as string) || undefined
        const subscriptionId = (s.subscription as string) || undefined
        if (userId && subscriptionId) {
          // Récupère la subscription pour connaître le price -> plan
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = sub.items.data[0]?.price?.id
          const plan = planFromPriceId(priceId)
          await applyPlan(userId, plan, customerId, subscriptionId)
        }
        break
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const priceId = sub.items.data[0]?.price?.id
        // Si l'abo est actif/en essai -> plan correspondant, sinon free
        const active = ['active', 'trialing', 'past_due'].includes(sub.status)
        const plan = active ? planFromPriceId(priceId) : 'free'
        if (userId) {
          await applyPlan(userId, plan, sub.customer as string, sub.id)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        if (userId) {
          await applyPlan(userId, 'free', sub.customer as string, null)
        }
        break
      }
      default:
        // événements non gérés : on les ignore proprement
        break
    }
    return NextResponse.json({ received: true })
  } catch (e: any) {
    console.error('[stripe/webhook] traitement échoué:', e?.message || e)
    // 500 -> Stripe réessaiera (idempotent côté applyPlan)
    return NextResponse.json({ error: 'processing' }, { status: 500 })
  }
}

async function applyPlan(
  userId: string,
  plan: 'free' | 'pro' | 'premium',
  customerId: string | undefined,
  subscriptionId: string | null
) {
  await sql.query(
    `UPDATE profiles
       SET plan = $1,
           stripe_customer_id = COALESCE($2, stripe_customer_id),
           stripe_subscription_id = $3,
           updated_at = now()
     WHERE id = $4`,
    [plan, customerId ?? null, subscriptionId, userId]
  )
  console.log(`[stripe/webhook] user ${userId} -> plan ${plan}`)
}
