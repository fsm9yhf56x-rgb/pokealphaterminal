// src/app/api/v1/sealed/route.ts
// Catalogue scelle Kodo. Sert le catalogue REEL (k_sealed_products + sealed_prices),
// jamais un JSON de maquette.
//
// REGLES (miroir de celles des singles, aucune exception) :
//   - chaque prix son marche : EN = US converti (ppt_unopened), FR = annonces eBay FR
//     (ebay_fr_ask, deja decotees 0.88). Les deux ne se melangent JAMAIS dans une meme colonne.
//   - is_asking = true -> l'UI etiquette "des X EUR". Ce sont des demandes, pas des ventes.
//   - pas de donnee -> price = null. Jamais 0, jamais un chiffre invente.
//   - les photos d'annonces eBay ne sont PAS servies comme illustration produit
//     (decision Alon : un cadre vide vaut mieux qu'une photo de vendeur).
//
// GET /api/v1/sealed?lang=FR&sku=display&set=me05&q=nuit&sort=price&limit=200

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LANGS = new Set(['fr', 'en', 'jp']);

const SKU_LABEL: Record<string, string> = {
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
};

// MIROIR de scripts/lib/sealed-fr.mjs (meme pattern que graded.ts / graded-rule.js).
// Constantes physiques : un display contient 36 boosters, ca ne changera pas.
// Uniquement la ou le contenu est CERTAIN — un ETB fait 8, 9 ou 10 selon l'epoque,
// donc pas de prix au booster pour lui plutot qu'un chiffre invente.
const BOOSTERS_PER_SKU: Record<string, number> = { display: 36, demi_display: 18, bundle: 6, tripack: 3, booster: 1 };

function boosterCount(sku: string | null, qty: number | null, unit: string | null): number | null {
  if (!sku) return null;
  if (sku === 'display_bundle' && qty && unit === 'bundle') return qty * 6;
  if (sku === 'case' && qty && unit === 'display') return qty * 36;
  const n = BOOSTERS_PER_SKU[sku];
  return n == null ? null : n;
}

const UNIT_LABEL: Record<string, string> = {
  display: 'displays', bundle: 'bundles', blister: 'blisters',
  etb: 'coffrets', coffret: 'coffrets', mini_tin: 'mini-tins', booster: 'boosters',
};

/** Une photo d'annonce eBay n'est pas une illustration produit. */
function servableImage(url: string | null, source: string | null): string | null {
  if (!url) return null;
  if (source === 'ebay_fr') return null;
  return url;
}

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const lang = String(sp.get('lang') || 'fr').toLowerCase();
    if (!LANGS.has(lang)) {
      return NextResponse.json({ error: 'lang invalide (fr|en|jp)' }, { status: 400 });
    }
    const sku = sp.get('sku');
    const set = sp.get('set');
    const q = (sp.get('q') || '').trim();
    const sort = sp.get('sort') || 'price';
    const limit = Math.min(Math.max(Number(sp.get('limit') || 300), 1), 1000);
    const offset = Math.max(Number(sp.get('offset') || 0), 0);

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL as string);

    const where: string[] = ['p.lang = $1'];
    const params: unknown[] = [lang];
    if (sku) { params.push(sku); where.push('p.sku = $' + params.length); }
    if (set) { params.push(set); where.push('(p.kodo_set_id = $' + params.length + ' OR p.set_id = $' + params.length + ')'); }
    if (q) { params.push('%' + q + '%'); where.push('(p.name ILIKE $' + params.length + ' OR p.set_name ILIKE $' + params.length + ')'); }

    const order =
      sort === 'name' ? 'p.name ASC'
      : sort === 'recent' ? 'p.first_seen_at DESC NULLS LAST, p.name ASC'
      : 'sp.market_eur DESC NULLS LAST, p.name ASC';

    params.push(limit); const pLimit = '$' + params.length;
    params.push(offset); const pOffset = '$' + params.length;

    const rows = await sql.query(
      `SELECT p.id, p.name, p.lang, p.sku, p.product_type, p.set_name, p.set_id,
              p.kodo_set_id, p.content_qty, p.content_unit, p.image_url, p.source, p.sku_source,
              sp.market_eur, sp.low_eur, sp.raw_eur, sp.method, sp.market, sp.is_asking,
              sp.sellers, sp.sample_size, sp.as_of, sp.updated_at,
              ks.name_fr AS set_name_fr, ks.logo_url, ks.series
         FROM k_sealed_products p
         LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
         LEFT JOIN k_sets ks ON ks.id = p.kodo_set_id
        WHERE ${where.join(' AND ')}
        ORDER BY ${order}
        LIMIT ${pLimit} OFFSET ${pOffset}`,
      params
    );

    const items = rows.map((r: Record<string, unknown>) => {
      const value = r.market_eur == null ? null : Number(r.market_eur);
      const contentQty = r.content_qty == null ? null : Number(r.content_qty);
      const unit = r.content_unit ? String(r.content_unit) : null;
      const skuKey = r.sku ? String(r.sku) : null;
      // Le SKU n'est fiable que s'il vient du parseur de titres (source ebay_fr).
      // Cote EN il est derive du product_type PPT, qui range un CASE de 6 bundles
      // sous 'Booster Bundle' -> tout calcul par booster serait faux.
      const skuTrusted = String(r.sku_source || '') === 'parser' || String(r.source || '') === 'ebay_fr';
      const boosters = skuTrusted ? boosterCount(skuKey, contentQty, unit) : null;
      const low = r.low_eur == null ? null : Number(r.low_eur);
      return {
        id: String(r.id),
        name: String(r.name),
        lang: String(r.lang).toUpperCase(),
        sku: skuKey,
        skuLabel: skuKey ? (SKU_LABEL[skuKey] || String(r.product_type || skuKey)) : String(r.product_type || ''),
        content: contentQty && unit ? { qty: contentQty, unit, label: contentQty + ' ' + (UNIT_LABEL[unit] || unit) } : null,
        setId: r.kodo_set_id ? String(r.kodo_set_id) : (r.set_id ? String(r.set_id) : null),
        setName: r.set_name_fr ? String(r.set_name_fr) : (r.set_name ? String(r.set_name) : null),
        series: r.series ? String(r.series) : null,
        setLogo: r.logo_url ? String(r.logo_url) : null,
        image: servableImage(r.image_url as string | null, r.source as string | null),
        // contenu certain -> le collectionneur peut comparer un display a un demi-display
        boosters,
        skuTrusted,
        price: value == null || !(value > 0) ? null : {
          value,
          currency: 'EUR',
          low: low != null && low > 0 && low <= value ? low : null,
          perBooster: boosters && boosters > 1 ? Math.round((value / boosters) * 100) / 100 : null,
          // true -> l'UI DOIT afficher "des X EUR", pas "X EUR"
          isAsking: Boolean(r.is_asking),
          method: r.method ? String(r.method) : null,
          market: r.market ? String(r.market) : null,
          sellers: r.sellers == null ? null : Number(r.sellers),
          sampleSize: r.sample_size == null ? null : Number(r.sample_size),
          raw: r.raw_eur == null ? null : Number(r.raw_eur),
          asOf: r.as_of ?? null,
          updatedAt: r.updated_at ?? null,
        },
      };
    });

    const totalRows = await sql.query(
      `SELECT count(*)::int n FROM k_sealed_products p WHERE ${where.slice(0, where.length).join(' AND ')}`,
      params.slice(0, params.length - 2)
    );

    const facets = await sql.query(
      `SELECT p.sku, count(*)::int n, count(sp.market_eur)::int cotes
         FROM k_sealed_products p
         LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
        WHERE p.lang = $1 AND p.sku IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC`,
      [lang]
    );

    return NextResponse.json({
      lang: lang.toUpperCase(),
      count: items.length,
      total: totalRows[0] ? Number(totalRows[0].n) : items.length,
      // le marche dont sortent ces prix, pour que l'UI puisse l'annoncer honnetement
      priceMarket: lang === 'fr' ? 'EU_FR' : 'US',
      items,
      facets: facets.map((f: Record<string, unknown>) => ({
        sku: String(f.sku),
        label: SKU_LABEL[String(f.sku)] || String(f.sku),
        total: Number(f.n),
        priced: Number(f.cotes),
      })),
    }, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erreur';
    return NextResponse.json({ error: 'sealed_failed', detail: msg }, { status: 500 });
  }
}
