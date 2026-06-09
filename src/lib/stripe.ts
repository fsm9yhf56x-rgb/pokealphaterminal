import Stripe from 'stripe'

/** Client Stripe serveur (lazy : ne s'initialise qu'à l'appel, évite le bundle client). */
let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) throw new Error('STRIPE_SECRET_KEY manquante')
    _stripe = new Stripe(key)
  }
  return _stripe
}

export type Plan = 'pro' | 'premium'
export type Cycle = 'weekly' | 'monthly' | 'yearly'

/** Mapping (plan, cycle) -> Price ID, depuis les variables d'env. */
export function priceIdFor(plan: Plan, cycle: Cycle): string {
  const map: Record<string, string | undefined> = {
    'pro:weekly': process.env.STRIPE_PRICE_PRO_WEEKLY,
    'pro:monthly': process.env.STRIPE_PRICE_PRO_MONTHLY,
    'pro:yearly': process.env.STRIPE_PRICE_PRO_YEARLY,
    'premium:weekly': process.env.STRIPE_PRICE_PREMIUM_WEEKLY,
    'premium:monthly': process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    'premium:yearly': process.env.STRIPE_PRICE_PREMIUM_YEARLY,
  }
  const id = map[`${plan}:${cycle}`]
  if (!id) throw new Error(`Price ID introuvable pour ${plan}/${cycle}`)
  return id
}

/** Nombre total de places Early Supporter (offre -40% à vie sur Premium). */
export const EARLY_SUPPORTER_SEATS = 300

/** Price ID de l'offre Early Supporter (Premium uniquement, mensuel ou annuel). */
export function earlyPriceIdFor(cycle: 'monthly' | 'yearly'): string {
  const id = cycle === 'yearly'
    ? process.env.STRIPE_PRICE_PREMIUM_EARLY_YEARLY
    : process.env.STRIPE_PRICE_PREMIUM_EARLY_MONTHLY
  if (!id) throw new Error(`Price ID Early introuvable pour ${cycle}`)
  return id
}

/** True si le priceId correspond à l'offre Early Supporter. */
export function isEarlyPriceId(priceId: string | undefined | null): boolean {
  if (!priceId) return false
  return [
    process.env.STRIPE_PRICE_PREMIUM_EARLY_MONTHLY,
    process.env.STRIPE_PRICE_PREMIUM_EARLY_YEARLY,
  ].includes(priceId)
}

/** Résolution inverse : depuis un Price ID Stripe, retrouve le plan (pour le webhook). */
export function planFromPriceId(priceId: string | undefined | null): Plan | 'free' {
  if (!priceId) return 'free'
  const pro = [
    process.env.STRIPE_PRICE_PRO_WEEKLY,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ]
  const premium = [
    process.env.STRIPE_PRICE_PREMIUM_WEEKLY,
    process.env.STRIPE_PRICE_PREMIUM_MONTHLY,
    process.env.STRIPE_PRICE_PREMIUM_YEARLY,
    process.env.STRIPE_PRICE_PREMIUM_EARLY_MONTHLY,
    process.env.STRIPE_PRICE_PREMIUM_EARLY_YEARLY,
  ]
  if (premium.includes(priceId)) return 'premium'
  if (pro.includes(priceId)) return 'pro'
  return 'free'
}
