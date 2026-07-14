import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getStripe, planFromPriceId, isEarlyPriceId } from '@/lib/stripe'
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
          await applyPlan(userId, plan, customerId, subscriptionId, priceId)
          await sql`INSERT INTO analytics_events (user_id, event, props, consent) VALUES (${userId}, 'checkout_completed', ${JSON.stringify({ plan })}::jsonb, 'legitimate')`.catch(() => {})
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
          await applyPlan(userId, plan, sub.customer as string, sub.id, active ? priceId : null)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.userId
        const customerId = sub.customer as string
        if (userId) {
          // Un autre abonnement actif existe-t-il pour ce customer ?
          // (cas changement de cycle/plan : Stripe annule l'ancien, en crée un nouveau)
          const others = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 3,
          })
          const stillActive = others.data.find((x) => x.id !== sub.id)
          if (stillActive) {
            const priceId = stillActive.items.data[0]?.price?.id
            await applyPlan(userId, planFromPriceId(priceId), customerId, stillActive.id, priceId)
          } else {
            // Plus d'abo actif : retour free ET perte du statut early (libère une place)
            await applyPlan(userId, 'free', customerId, null, null)
          }
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
  subscriptionId: string | null,
  priceId?: string | null
) {
  // Early Supporter = abonnement actif sur un price early. Sinon false (perte si résiliation).
  const early = isEarlyPriceId(priceId)
  await sql.query(
    `UPDATE profiles
       SET plan = $1,
           stripe_customer_id = COALESCE($2, stripe_customer_id),
           stripe_subscription_id = $3,
           is_early_supporter = $4,
           updated_at = now()
     WHERE id = $5`,
    [plan, customerId ?? null, subscriptionId, early, userId]
  )
  // Rang de membre fondateur: attribue une seule fois, jamais reattribue (meme apres resiliation).
  // Index unique partiel sur early_rank => retry si course entre deux webhooks.
  if (early) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await sql.query(
          `UPDATE profiles
             SET early_rank = (SELECT COALESCE(MAX(early_rank), 0) + 1 FROM profiles)
           WHERE id = $1 AND early_rank IS NULL`,
          [userId]
        )
        break
      } catch (e: any) {
        if (attempt === 2) console.error('[stripe/webhook] early_rank failed:', e?.message)
      }
    }
  }
  console.log(`[stripe/webhook] user ${userId} -> plan ${plan}${early ? ' (early)' : ''}`)
}
