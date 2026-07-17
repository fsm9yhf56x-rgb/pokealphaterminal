import 'server-only'
/**
 * LA BÊTA — le seul fichier du repo qui sait qu'elle existe.
 *
 * SERVEUR UNIQUEMENT (`server-only` fait échouer le build si un composant
 * client l'importe — sinon process.env.BETA_MODE y vaudrait undefined et
 * betaActive() renverrait false EN SILENCE). Le client ne dérive plus rien :
 * /api/profile lui renvoie plan / planSource / betaUntil / paidPlan calculés.
 * Aucune variable NEXT_PUBLIC_ n'est nécessaire.
 *
 * Vercel :
 *   BETA_MODE=on
 *   BETA_ENDS_AT=2026-09-30T22:00:00Z      (ISO 8601, UTC)
 *
 * === ORDRE DE DEMANTELEMENT — A RESPECTER ===
 *   1. Stripe live (SIRET) -> checkout ouvert, BETA_MODE reste 'on'.
 *      Fenetre de chevauchement : les testeurs gardent Premium ET peuvent
 *      s'abonner. Payer ne leur retire rien (cf. resolve.ts).
 *   2. BETA_MODE=off       -> effet immediat, sans deploiement, reversible.
 *   3. Verifier en prod que les abonnes ont bien leur plan.
 *   4. Retirer le code : ce fichier, from-profile.ts (champs beta*), les
 *      deux LEFT JOIN (auth/helpers.ts + api/profile/route.ts). Deployer.
 *   5. SEULEMENT APRES : node scripts/beta.mjs drop --yes
 *
 * /!\ DROP AVANT L'ETAPE 4 = les deux SELECT plantent sur une table absente,
 * le catch de getCurrentUserWithProfile degrade TOUT LE MONDE en 'free',
 * abonnes payants compris, sans un bruit. L'etape 5 est en dernier.
 */

export const BETA_ENDS_AT: string | null = process.env.BETA_ENDS_AT || null

/**
 * La beta expire PAR LA DONNEE (BETA_ENDS_AT), pas par un geste humain :
 * l'echeance tombe toute seule, au meme instant pour tout le monde.
 * BETA_MODE=off est la coupure d'urgence, pas le mecanisme nominal.
 *
 * FAIL-OPEN sur une date illisible : on considere qu'il n'y a pas d'echeance
 * plutot que de couper Premium a tous les testeurs sur une typo. BETA_MODE
 * reste le filet.
 */
export function betaActive(now: number = Date.now()): boolean {
  if (process.env.BETA_MODE !== 'on') return false
  if (!BETA_ENDS_AT) return true
  const t = Date.parse(BETA_ENDS_AT)
  return !Number.isFinite(t) || t > now
}
