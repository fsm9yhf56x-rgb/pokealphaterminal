// src/lib/sealed/catalog.ts
// Couche donnees du catalogue scelle. SOURCE UNIQUE, partagee par
// /api/v1/sealed (liste, client) et /cartes/scelles/[id] (fiche, serveur).
//
// Pourquoi ce fichier existe : la fiche produit rendue cote serveur a besoin
// EXACTEMENT de la meme resolution de prix que la liste. La dupliquer, c'est
// garantir qu'un jour la fiche affichera un prix que la liste n'affiche pas.
// Meme raisonnement que graded.ts / graded-rule.js, sauf qu'ici un seul
// fichier suffit : les deux appelants sont dans l'app.
//
// REGLES (miroir des singles, aucune exception) :
//   - chaque prix son marche : EN = US converti (ppt_unopened), FR = annonces
//     eBay FR (ebay_fr_ask, deja decotees 0.88). Jamais melanges.
//   - is_asking = true -> l'UI etiquette "des X EUR". Demandes, pas ventes.
//   - pas de donnee -> price = null. Jamais 0, jamais un chiffre invente.
//   - les photos d'annonces eBay ne sont PAS servies comme illustration produit.

export const LANGS = new Set(['fr', 'en', 'jp'])

export const SKU_LABEL: Record<string, string> = {
  case: 'Case',
  display_bundle: 'Display de bundles',
  display_tin: 'Display de mini-tins',
  demi_display: 'Demi-display',
  display: 'Display 36 boosters',
  etb: "Coffret Dresseur d'Élite",
  bundle: 'Bundle 6 boosters',
  tripack: 'Tripack',
  blister: 'Blister',
  coffret: 'Coffret',
  deck: 'Deck',
  tin: 'Pokébox',
  booster: 'Booster',
}

// MIROIR de scripts/lib/sealed-fr.mjs. Constantes physiques : un display
// contient 36 boosters, ca ne changera pas. Uniquement la ou le contenu est
// CERTAIN — un ETB fait 8, 9 ou 10 selon l'epoque, donc pas de prix au booster
// pour lui plutot qu'un chiffre invente.
const BOOSTERS_PER_SKU: Record<string, number> = { display: 36, demi_display: 18, bundle: 6, tripack: 3, booster: 1 }
// Standardises dans tous les marches. Ailleurs qu'en FR, TCGplayer vend ses
// propres lots sous le mot "bundle" -> on ne compte que ce qui est universel.
const BOOSTERS_UNIVERSAL: Record<string, number> = { display: 36, demi_display: 18 }

const UNIT_LABEL: Record<string, string> = {
  display: 'displays', bundle: 'bundles', blister: 'blisters',
  etb: 'coffrets', coffret: 'coffrets', mini_tin: 'mini-tins', booster: 'boosters',
}

export function boosterCount(sku: string | null, qty: number | null, unit: string | null, lang: string): number | null {
  if (!sku) return null
  if (sku === 'display_bundle' && qty && unit === 'bundle') return qty * 6
  if (sku === 'case' && qty && unit === 'display') return qty * 36
  const table = lang === 'fr' ? BOOSTERS_PER_SKU : BOOSTERS_UNIVERSAL
  const n = table[sku]
  return n == null ? null : n
}

/**
 * Titre court : le nom du produit debarrasse de la serie, affichee a part.
 * Sans ca, dix produits d'une meme serie portent le MEME titre.
 */
export function shortName(name: string, setName: string | null): string {
  if (!setName) return name
  const esc = setName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let out = name.trim()
  out = out.replace(new RegExp('^' + esc + '[\\s:\\-\u2013\u2014]*', 'i'), '')
  out = out.replace(new RegExp('[\\s:\\-\u2013\u2014]*' + esc + '$', 'i'), '')
  out = out.trim()
  return out.length >= 3 ? out : name
}

/** Une photo d'annonce eBay n'est pas une illustration produit. */
export function servableImage(url: string | null, source: string | null): string | null {
  if (!url) return null
  if (source === 'ebay_fr') return null
  return url
}

export interface SealedPrice {
  value: number
  currency: string
  basis: 'spot' | 'window'
  windowDays?: number
  low: number | null
  perBooster: number | null
  raw: number | null
  method: string | null
  market: string | null
  sellers: number | null
  sampleSize: number | null
  isAsking: boolean
  asOf: string | null
  updatedAt: string | null
}

export interface SealedItem {
  id: string
  name: string
  shortName: string
  lang: string
  sku: string | null
  skuLabel: string
  content: { qty: number; unit: string; label: string } | null
  setId: string | null
  setName: string | null
  series: string | null
  setLogo: string | null
  image: string | null
  boosters: number | null
  skuTrusted: boolean
  range: { low: number; high: number; sellers: number | null; days: number } | null
  price: SealedPrice | null
}

export interface Facet { sku: string; label: string; total: number; priced: number }

const SELECT_COLS = `p.id, p.name, p.lang, p.sku, p.product_type, p.set_name, p.set_id,
       p.kodo_set_id, p.content_qty, p.content_unit, p.image_url, p.source, p.sku_source,
       sp.market_eur, sp.low_eur, sp.raw_eur, sp.method, sp.market, sp.is_asking,
       sp.sellers, sp.sample_size, sp.as_of, sp.updated_at, sp.last_priced_at,
       ks.name_fr AS set_name_fr, ks.logo_url, ks.series,
       w.cote_decotee AS w_price, w.vendeurs AS w_sellers,
       w.plancher AS w_low, w.plafond AS w_high, w.cotable AS w_cotable`

const FROM_JOINS = `FROM k_sealed_products p
    LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
    LEFT JOIN k_sets ks ON ks.id = p.kodo_set_id
    LEFT JOIN sealed_ask_window w ON w.sealed_id = p.id AND w.lang = p.lang`

async function db() {
  const { neon } = await import('@neondatabase/serverless')
  return neon(process.env.DATABASE_URL as string)
}

/**
 * RESOLUTION EN TROIS TEMPS
 *  1. l'instantane (sealed_prices) : la donnee du jour, la plus juste
 *  2. la fenetre 90 jours : quand le jour n'a pas atteint 3 vendeurs mais que
 *     trois mois y arrivent. C'est ce qui rend le vintage cotable.
 *  3. la fourchette : meme la fenetre echoue -> on montre ce qui passe
 *     ("2 annonces sur 90 jours, de 449 a 79 000 EUR") plutot qu'un vide muet.
 */
export function mapRow(r: Record<string, unknown>, lang: string): SealedItem {
  const value = r.market_eur == null ? null : Number(r.market_eur)
  const contentQty = r.content_qty == null ? null : Number(r.content_qty)
  const unit = r.content_unit ? String(r.content_unit) : null
  const wPrice = r.w_price == null ? null : Number(r.w_price)
  const wSellers = r.w_sellers == null ? null : Number(r.w_sellers)
  const wLow = r.w_low == null ? null : Number(r.w_low)
  const wHigh = r.w_high == null ? null : Number(r.w_high)
  const skuKey = r.sku ? String(r.sku) : null
  // Le SKU n'est fiable que s'il vient du parseur de titres (source ebay_fr).
  // Cote EN il est derive du product_type PPT, qui range un CASE de 6 bundles
  // sous 'Booster Bundle' -> tout calcul par booster serait faux.
  const skuTrusted = String(r.sku_source || '') === 'parser' || String(r.source || '') === 'ebay_fr'
  const boosters = skuTrusted ? boosterCount(skuKey, contentQty, unit, lang) : null
  const low = r.low_eur == null ? null : Number(r.low_eur)
  const setName = r.set_name_fr ? String(r.set_name_fr) : (r.set_name ? String(r.set_name) : null)
  const spotOk = value != null && value > 0
  const winOk = wPrice != null && wPrice > 0

  return {
    id: String(r.id),
    name: String(r.name),
    shortName: shortName(String(r.name), setName),
    lang: String(r.lang).toUpperCase(),
    sku: skuKey,
    skuLabel: skuKey ? (SKU_LABEL[skuKey] || String(r.product_type || skuKey)) : String(r.product_type || ''),
    content: contentQty && unit ? { qty: contentQty, unit, label: contentQty + ' ' + (UNIT_LABEL[unit] || unit) } : null,
    setId: r.kodo_set_id ? String(r.kodo_set_id) : (r.set_id ? String(r.set_id) : null),
    setName,
    series: r.series ? String(r.series) : null,
    setLogo: r.logo_url ? String(r.logo_url) : null,
    image: servableImage(r.image_url as string | null, r.source as string | null),
    boosters,
    skuTrusted,
    range: wLow != null && wHigh != null && !spotOk && !winOk
      ? { low: wLow, high: wHigh, sellers: wSellers, days: 90 }
      : null,
    price: !spotOk && winOk ? {
      value: wPrice as number,
      currency: 'EUR',
      basis: 'window',
      windowDays: 90,
      low: wLow != null && wLow <= (wPrice as number) ? wLow : null,
      perBooster: boosters && boosters > 1 ? Math.round(((wPrice as number) / boosters) * 100) / 100 : null,
      isAsking: true,
      method: 'ebay_ask_90d',
      market: lang === 'fr' ? 'EU_FR' : 'US',
      sellers: wSellers,
      sampleSize: null,
      raw: null,
      asOf: null,
      updatedAt: null,
    } : !spotOk ? null : {
      value: value as number,
      currency: 'EUR',
      basis: 'spot',
      low: low != null && low > 0 && low <= (value as number) ? low : null,
      perBooster: boosters && boosters > 1 ? Math.round(((value as number) / boosters) * 100) / 100 : null,
      isAsking: Boolean(r.is_asking),
      method: r.method ? String(r.method) : null,
      market: r.market ? String(r.market) : null,
      sellers: r.sellers == null ? null : Number(r.sellers),
      sampleSize: r.sample_size == null ? null : Number(r.sample_size),
      raw: r.raw_eur == null ? null : Number(r.raw_eur),
      asOf: (r.as_of as string) ?? null,
      // AGE DU PRIX, pas heure d'ecriture du pipeline : updated_at est pose par
      // le trigger a chaque passe meme sans recalcul de la cote.
      updatedAt: (r.last_priced_at as string) ?? null,
    },
  }
}

export interface ListOpts {
  lang: string
  sku?: string | null
  set?: string | null
  q?: string | null
  sort?: string | null
  limit?: number
  offset?: number
}

export async function listSealed(opts: ListOpts) {
  const lang = opts.lang
  const sql = await db()

  // Le catalogue servi est celui que le MARCHE prouve : produits decouverts sur
  // eBay (FR et US). Les 2292 lignes PPT restent en base comme reserve de
  // packshots mais ne sont plus le catalogue.
  const where: string[] = ['p.lang = $1', "p.source IN ('ebay_fr','ebay_us')"]
  const params: unknown[] = [lang]

  // sku accepte une LISTE : l'UI groupe les contenants sous une seule entree.
  if (opts.sku) {
    const skus = opts.sku.split(',').map((x) => x.trim()).filter(Boolean)
    if (skus.length) { params.push(skus); where.push('p.sku = ANY($' + params.length + '::text[])') }
  }
  if (opts.set) { params.push(opts.set); where.push('(p.kodo_set_id = $' + params.length + ' OR p.set_id = $' + params.length + ')') }
  if (opts.q) { params.push('%' + opts.q + '%'); where.push('(p.name ILIKE $' + params.length + ' OR p.set_name ILIKE $' + params.length + ')') }

  const order =
    opts.sort === 'name' ? 'p.name ASC'
    : opts.sort === 'recent' ? 'p.first_seen_at DESC NULLS LAST, p.name ASC'
    : 'sp.market_eur DESC NULLS LAST, p.name ASC'

  params.push(opts.limit ?? 300); const pLimit = '$' + params.length
  params.push(opts.offset ?? 0); const pOffset = '$' + params.length

  const rows = await sql.query(
    `SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${pLimit} OFFSET ${pOffset}`,
    params
  )

  // compte sur tout le perimetre filtre, pas sur la page servie
  const totalRows = await sql.query(
    `SELECT count(*)::int n, count(sp.market_eur)::int priced
       FROM k_sealed_products p
       LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
      WHERE ${where.join(' AND ')}`,
    params.slice(0, params.length - 2)
  )

  const facets = await sql.query(
    `SELECT p.sku, count(*)::int n, count(sp.market_eur)::int cotes
       FROM k_sealed_products p
       LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
      WHERE p.lang = $1 AND p.sku IS NOT NULL
      GROUP BY 1 ORDER BY 2 DESC`,
    [lang]
  )

  const items = rows.map((r: Record<string, unknown>) => mapRow(r, lang))

  return {
    items,
    total: totalRows[0] ? Number(totalRows[0].n) : items.length,
    priced: totalRows[0] ? Number(totalRows[0].priced) : 0,
    facets: facets.map((f: Record<string, unknown>) => ({
      sku: String(f.sku),
      label: SKU_LABEL[String(f.sku)] || String(f.sku),
      total: Number(f.n),
      priced: Number(f.cotes),
    })) as Facet[],
  }
}

/**
 * Un produit par son identifiant (`fr-sm12-display`). La langue se lit dans la
 * ligne, pas dans le prefixe de la cle : deduire la langue d'une chaine d'URL
 * fournie par le visiteur, c'est lui laisser choisir le marche de cotation.
 */
export async function getSealedById(id: string): Promise<SealedItem | null> {
  const sql = await db()
  const rows = await sql.query(
    `SELECT ${SELECT_COLS} ${FROM_JOINS} WHERE p.id = $1 AND p.source IN ('ebay_fr','ebay_us') LIMIT 1`,
    [id]
  )
  if (!rows.length) return null
  const r = rows[0] as Record<string, unknown>
  return mapRow(r, String(r.lang).toLowerCase())
}

/** Identifiants du catalogue, pour generateStaticParams et le sitemap. */
export async function getAllSealedIds(): Promise<{ id: string; lang: string; updatedAt: string | null }[]> {
  const sql = await db()
  const rows = await sql.query(
    `SELECT p.id, p.lang, sp.last_priced_at
       FROM k_sealed_products p
       LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
      WHERE p.source IN ('ebay_fr','ebay_us')
      ORDER BY p.id`
  )
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id),
    lang: String(r.lang),
    updatedAt: (r.last_priced_at as string) ?? null,
  }))
}
