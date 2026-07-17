/**
 * Résolution du plan — SOURCE UNIQUE DE VÉRITÉ, serveur ET client.
 *
 * Fonction PURE : zéro import, zéro process.env, zéro accès DB.
 * L'appelant injecte tout (même `betaActive` et `now`), ce qui la rend
 * testable et utilisable des deux côtés — même contrat que goals/types.ts.
 *
 * Règle : chaque source produit un plan candidat, on garde le NIVEAU LE PLUS
 * HAUT. En cas d'égalité, l'ordre du tableau `candidates` tranche : stripe
 * d'abord. C'est ce qui rend la fin de bêta invisible pour un abonné (voir
 * commentaire dans resolvePlan).
 */

export type Plan = 'free' | 'pro' | 'premium';
export type PlanSource = 'free' | 'stripe' | 'referral' | 'beta';

export interface PlanInput {
  /** profiles.plan — le plan PAYÉ, écrit par le webhook Stripe. */
  stripePlan?: string | null;
  /** profiles.premium_until — Premium offert (parrainage). */
  premiumUntil?: string | Date | null;
  /** beta_invites.tier — null si l'email n'est pas invité. */
  betaTier?: string | null;
  /** Calculé par l'appelant : betaActive() de src/lib/beta.ts (serveur). */
  betaActive?: boolean;
  /** BETA_ENDS_AT, propagé tel quel pour l'affichage. */
  betaEndsAt?: string | null;
  /** Injectable pour les tests. */
  now?: number;
}

export interface PlanResult {
  /** Le plan EFFECTIF. C'est lui que lisent requirePlan() et usePlan(). */
  plan: Plan;
  /** D'où vient le plan effectif. Pour l'UI honnête et l'analytics. */
  source: PlanSource;
  /** Non-null uniquement si source === 'beta'. Sert au badge et à la notif. */
  betaUntil: string | null;
  /** Le plan réellement PAYÉ (écrit par le webhook Stripe).
   *  Peut être INFÉRIEUR à `plan` pendant la bêta : un testeur qui s'abonne
   *  Pro garde Premium prêté jusqu'à l'échéance.
   *  L'UI doit afficher `paidPlan` comme « ton abonnement » et `plan` comme
   *  « ton accès ». Les confondre = le testeur découvre son vrai plan le jour
   *  du BETA_MODE=off. */
  paidPlan: Plan;
  /** Raccourci : paidPlan !== 'free'. Le champ qui dit qui reste à convertir. */
  isPaying: boolean;
}

const RANK: Record<Plan, number> = { free: 0, pro: 1, premium: 2 };

function asPlan(v: unknown): Plan {
  return v === 'pro' || v === 'premium' ? v : 'free';
}

function isFuture(v: string | Date | null | undefined, now: number): boolean {
  if (!v) return false;
  const t = v instanceof Date ? v.getTime() : Date.parse(String(v));
  return Number.isFinite(t) && t > now;
}

export function resolvePlan(i: PlanInput): PlanResult {
  const now = i.now ?? Date.now();

  const stripe = asPlan(i.stripePlan);
  const referral: Plan = isFuture(i.premiumUntil, now) ? 'premium' : 'free';
  const beta: Plan = i.betaActive ? asPlan(i.betaTier) : 'free';

  // L'ORDRE COMPTE. Comparaison en `>` strict : à niveau égal, le premier
  // arrivé garde la main. stripe en tête => un abonné Premium qui est aussi
  // bêta-testeur ressort en 'premium'/'stripe' et NON 'premium'/'beta'.
  // Conséquence : le jour où BETA_MODE passe à off, il ne se passe rien pour
  // lui. C'est ce qui rend la fenêtre de chevauchement gratuite.
  const candidates: Array<[Plan, PlanSource]> = [
    [stripe, 'stripe'],
    [referral, 'referral'],
    [beta, 'beta'],
  ];

  let plan: Plan = 'free';
  let source: PlanSource = 'free';
  for (const [p, s] of candidates) {
    if (RANK[p] > RANK[plan]) {
      plan = p;
      source = s;
    }
  }

  return {
    plan,
    source,
    betaUntil: source === 'beta' ? (i.betaEndsAt ?? null) : null,
    paidPlan: stripe,
    isPaying: stripe !== 'free',
  };
}
