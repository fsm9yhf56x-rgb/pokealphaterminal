'use client'

/**
 * MASQUAGE DES PRIX PENDANT LA BÊTA
 *
 * Décision produit (18/07) : pendant la bêta, les tarifs d'abonnement ne sont
 * PAS figés -> on ne montre aucun chiffre qui pourrait changer. Flou DÉFINITIF
 * (pas de « révéler » au survol) + mention « tarifs à la sortie ». On masque le
 * chiffre, JAMAIS la structure des plans : le visiteur voit toujours quels plans
 * existent et ce qu'ils contiennent.
 *
 * SOURCE DE VÉRITÉ = NEXT_PUBLIC_BETA_MODE. Pourquoi une var publique alors que
 * beta.ts dit « aucune NEXT_PUBLIC_ nécessaire » ? Parce que ce masquage doit
 * agir sur la LANDING PUBLIQUE (visiteur non connecté, pas de /api/profile). Le
 * flag serveur BETA_MODE reste la vérité côté serveur ; celui-ci n'est que son
 * reflet public, à poser AU MÊME ENDROIT et à retirer AU MÊME MOMENT (étape 4 du
 * démantèlement décrit dans beta.ts). Si les deux divergent, le masquage ne
 * correspondra plus à l'état réel de la bêta.
 */

// true tant que la bêta masque les prix. Lisible serveur ET client (NEXT_PUBLIC).
export const betaHidesPrices = process.env.NEXT_PUBLIC_BETA_MODE === 'on'

/**
 * Rend un prix, ou sa version floutée pendant la bêta.
 * Usage : <MaskPrice>{PRICES.pro.monthly}</MaskPrice>
 * Le contenu reste dans le DOM (blur CSS) : ni copiable à l'œil, ni lisible, mais
 * la largeur du bloc est préservée -> la mise en page ne saute pas.
 */
export function MaskPrice({ children }: { children: React.ReactNode }) {
  if (!betaHidesPrices) return <>{children}</>
  return (
    <span
      aria-hidden="true"
      style={{
        filter: 'blur(7px)',
        opacity: 0.55,
        userSelect: 'none',
        pointerEvents: 'none',
        // Empêche la sélection/copie du texte réel sous le flou.
        WebkitUserSelect: 'none',
      }}
    >
      {children}
    </span>
  )
}

/**
 * Mention à placer une fois par bloc de prix (sous le prix flouté).
 * Ne s'affiche QUE pendant la bêta ; sinon rien (les vrais prix parlent).
 */
export function BetaPriceNote({
  align = 'center',
  style,
}: {
  align?: 'center' | 'left'
  style?: React.CSSProperties
}) {
  if (!betaHidesPrices) return null
  return (
    <span
      style={{
        display: 'block',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.01em',
        color: '#86868B',
        textAlign: align,
        lineHeight: 1.4,
        ...style,
      }}
    >
      Tarifs communiqués à la sortie
    </span>
  )
}
