/**
 * VERIFICATION PAR LES CARACTERISTIQUES eBay (localizedAspects).
 *
 * Le titre ment, la description precise, les caracteristiques tranchent.
 * Trois erreurs constatees sur le marche reel que seul ce niveau attrape :
 *   - "DISPLAY 36 BOOSTERS" a 385 EUR : produit JAPONAIS (Langue = Japonais)
 *   - "Display de 8 Kit du dresseur" a 65 EUR : le mot "display" designe ici un
 *     PRESENTOIR de vente, pas une boite de 36 boosters. Meme mot, autre produit.
 *   - "Protection acrylique Display" a 12,99 EUR : accessoire, ni langue ni cartes.
 *
 * COUT : localizedAspects n'existe PAS dans item_summary/search (verifie, meme
 * avec fieldgroups=EXTENDED) et l'endpoint multi-items renvoie 403 sur notre
 * keyset. Il faut donc UN APPEL PAR ANNONCE. On ne verifie donc pas tout : on
 * verifie les N MOINS CHERES de chaque produit, celles qui fixent le prix
 * affiche et qui sont listees. Une erreur sur une annonce invisible ne coute
 * rien ; une erreur sur celle qu'on met en avant coute la confiance.
 *
 * PRINCIPE : une caracteristique ne peut que RESTREINDRE. Presente et
 * contradictoire -> rejet. Absente -> on ne conclut pas (beaucoup de vendeurs
 * particuliers ne remplissent rien). Jamais l'inverse : aucune caracteristique
 * ne fait monter un produit en gamme.
 */

/** Cartes attendues par SKU (boosters x 10 cartes, tolerance large). */
const CARTES_ATTENDUES = {
  display: [280, 460],       // 36 boosters x 10 (parfois 11) cartes
  demi_display: [140, 230],  // 18 boosters
  bundle: [45, 90],          // 6 boosters
  tripack: [20, 45],         // 3 boosters
  blister: [20, 60],
  etb: [70, 130],            // 8-9 boosters + promos
  coffret: [20, 200],
  tin: [20, 90],
};

const norm = (v) => String(v ?? '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim();

/** Aplatit localizedAspects en dictionnaire, cle normalisee. */
export function aspectsToMap(localizedAspects) {
  const m = {};
  for (const a of localizedAspects || []) {
    if (!a || !a.name) continue;
    m[norm(a.name)] = String(a.value ?? '');
  }
  return m;
}

/**
 * Verifie une annonce deja parsee contre ses caracteristiques.
 * @param {object} parsed  resultat de parseSealedTitle (sku, lang attendue...)
 * @param {object} aspects dictionnaire issu de aspectsToMap
 * @param {string} langAttendue 'fr' | 'en' | 'jp'
 * @returns {{ok: boolean, reason: string|null}}
 */
export function verifyAsk(parsed, aspects, langAttendue = 'fr') {
  if (!parsed || !parsed.sku) return { ok: true, reason: null };
  const a = aspects || {};

  // --- LANGUE. Le signal le plus fiable : c'est un champ ferme cote eBay.
  const langue = norm(a['langue'] || a['language']);
  if (langue) {
    const attendu = { fr: 'francais', en: 'anglais', jp: 'japonais' }[langAttendue] || 'francais';
    const alias = {
      francais: ['francais', 'french'],
      anglais: ['anglais', 'english'],
      japonais: ['japonais', 'japanese'],
    }[attendu] || [];
    const correspond = alias.some((x) => langue.includes(x));
    if (!correspond) return { ok: false, reason: 'langue_produit' };
  }

  // --- NOMBRE DE BOITES. "Display de 8 Kit du dresseur" declare 8 boites ;
  // un display de boosters en declare 1. C'est ce qui distingue le presentoir
  // de vente de la boite scellee, deux objets que le mot "display" confond.
  const boites = parseInt(String(a['nombre de boites'] || a['number of boxes'] || '').replace(/[^\d]/g, ''), 10);
  if (Number.isFinite(boites) && boites > 1 && !parsed.content) {
    return { ok: false, reason: 'presentoir_multi_boites' };
  }

  // --- NOMBRE DE CARTES. Un display annonce ~360 cartes. Un kit du dresseur
  // en annonce 60. Quand le vendeur remplit ce champ, il est decisif.
  const cartes = parseInt(String(a['nombre de cartes'] || a['number of cards'] || '').replace(/[^\d]/g, ''), 10);
  const bornes = CARTES_ATTENDUES[parsed.sku];
  if (Number.isFinite(cartes) && cartes > 0 && bornes) {
    if (cartes < bornes[0] || cartes > bornes[1]) {
      return { ok: false, reason: 'contenu_incoherent' };
    }
  }

  // --- CONFIGURATION. Champ ferme eBay : distingue boite scellee, carte
  // unique, lot, accessoire.
  const config = norm(a['configuration']);
  if (config && /carte unique|single card|lot de cartes|card lot/.test(config)) {
    return { ok: false, reason: 'pas_un_produit_scelle' };
  }

  // PAS DE REGLE "ACCESSOIRE" ICI. Une version precedente rejetait quand aucune
  // caracteristique n'etait renseignee : elle a tue deux vrais displays Soleil et
  // Lune a 1350 et 1250 EUR, simplement parce que leurs vendeurs particuliers
  // n'avaient rempli aucun champ. L'absence de donnee n'est PAS une preuve.
  // Les accessoires se detectent dans le TITRE (motif 'accessoire' du parseur),
  // la ou le mot est explicite.

  return { ok: true, reason: null };
}

/**
 * Recupere les caracteristiques d'une annonce. UN appel = UNE annonce.
 * @returns {Promise<object|null>} dictionnaire d'aspects, ou null si echec
 */
export async function fetchAspects(itemHref, headers, fetchFn = fetch) {
  try {
    const r = await fetchFn(itemHref, { headers });
    if (!r.ok) return null;
    const d = await r.json();
    return aspectsToMap(d.localizedAspects);
  } catch {
    return null;
  }
}
