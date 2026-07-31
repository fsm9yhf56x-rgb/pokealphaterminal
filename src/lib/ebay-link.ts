/**
 * Liens sortants eBay — construction et affiliation.
 *
 * L'item_id stocke par l'ingest est au format Browse API : "v1|336319892551|0".
 * Le segment du milieu est l'itemId "legacy", le seul utilisable dans une URL
 * publique. Aucune migration necessaire : les 10 000+ annonces deja journalisees
 * deviennent cliquables retroactivement.
 *
 * AFFILIATION : les parametres EPN ne sont ajoutes QUE si EBAY_EPN_CAMPID et
 * EBAY_EPN_ROTATION_ID sont definis. Sans eux, le lien reste valide mais ne
 * rapporte rien — on peut donc brancher l'UI maintenant et activer la
 * monetisation le jour ou la demande EPN (Account ID 7537864) est approuvee,
 * sans retoucher une ligne de composant.
 *
 * Les deux valeurs se recuperent dans le tableau de bord EPN une fois le compte
 * valide : le campaign ID identifie la campagne, le rotation ID (mkrid) depend
 * du SITE eBay cible — celui de ebay.fr n'est pas celui de ebay.com. Ne pas les
 * deviner : un mkrid errone produit un lien qui fonctionne mais ne trace rien.
 */

const EBAY_DOMAIN: Record<string, string> = {
  fr: 'www.ebay.fr',
  en: 'www.ebay.com',
  jp: 'www.ebay.com',
}

/** Extrait l'itemId legacy d'un identifiant Browse API. */
export function legacyItemId(itemId: string | null | undefined): string | null {
  const raw = String(itemId ?? '')
  const parts = raw.split('|')
  const candidate = parts.length >= 2 ? parts[1] : raw
  return /^\d{6,}$/.test(candidate) ? candidate : null
}

/**
 * URL publique d'une annonce, avec suivi d'affiliation si configure.
 * @param customId trace la source du clic (ex: 'sealed-fr-sm12-display') pour
 *                 savoir dans les rapports EPN quelles pages convertissent.
 */
export function ebayItemUrl(
  itemId: string | null | undefined,
  lang: string = 'fr',
  customId?: string
): string | null {
  const legacy = legacyItemId(itemId)
  if (!legacy) return null

  const domain = EBAY_DOMAIN[String(lang).toLowerCase()] ?? EBAY_DOMAIN.fr
  const url = new URL(`https://${domain}/itm/${legacy}`)

  const campid = process.env.EBAY_EPN_CAMPID
  const rotation = process.env.EBAY_EPN_ROTATION_ID
  if (campid && rotation) {
    url.searchParams.set('mkcid', '1')
    url.searchParams.set('mkrid', rotation)
    url.searchParams.set('campid', campid)
    url.searchParams.set('toolid', '10001')
    url.searchParams.set('mkevt', '1')
    if (customId) url.searchParams.set('customid', customId.slice(0, 256))
  }
  return url.toString()
}

/** Vrai quand la monetisation est reellement active (sert a l'affichage de la mention). */
export function affiliationActive(): boolean {
  return Boolean(process.env.EBAY_EPN_CAMPID && process.env.EBAY_EPN_ROTATION_ID)
}
