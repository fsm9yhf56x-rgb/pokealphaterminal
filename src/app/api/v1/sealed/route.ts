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
import { checkPublicRateLimit } from '@/lib/rate-limit';

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
// Standardises dans tous les marches. Ailleurs qu'en FR, TCGplayer vend ses
// propres lots sous le mot "bundle" -> on ne compte que ce qui est universel.
const BOOSTERS_UNIVERSAL: Record<string, number> = { display: 36, demi_display: 18 };

function boosterCount(sku: string | null, qty: number | null, unit: string | null, lang: string): number | null {
  if (!sku) return null;
  if (sku === 'display_bundle' && qty && unit === 'bundle') return qty * 6;
  if (sku === 'case' && qty && unit === 'display') return qty * 36;
  const table = lang === 'fr' ? BOOSTERS_PER_SKU : BOOSTERS_UNIVERSAL;
  const n = table[sku];
  return n == null ? null : n;
}

const UNIT_LABEL: Record<string, string> = {
  display: 'displays', bundle: 'bundles', blister: 'blisters',
  etb: 'coffrets', coffret: 'coffrets', mini_tin: 'mini-tins', booster: 'boosters',
};

/**
 * Titre court : le nom du produit debarrasse de la serie, qui est affichee a part.
 * Sans ca, dix produits d'une meme serie portent le MEME titre — cinq "SV: Scarlet
 * & Violet 151" a des prix differents sans qu'on puisse les distinguer.
 *   "Brilliant Stars Booster Box Case"      + "Brilliant Stars" -> "Booster Box Case"
 *   "Display 36 boosters — Nuit Noire"      + "Nuit Noire"      -> "Display 36 boosters"
 */
function shortName(name: string, setName: string | null): string {
  if (!setName) return name;
  const esc = setName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let out = name.trim();
  out = out.replace(new RegExp('^' + esc + '[\\s:\\-\u2013\u2014]*', 'i'), '');
  out = out.replace(new RegExp('[\\s:\\-\u2013\u2014]*' + esc + '$', 'i'), '');
  out = out.trim();
  return out.length >= 3 ? out : name;
}

/** Une photo d'annonce eBay n'est pas une illustration produit. */
function servableImage(url: string | null, source: string | null): string | null {
  if (!url) return null;
  if (source === 'ebay_fr') return null;
  return url;
}

export async function GET(req: NextRequest) {
  // Route publique servant le catalogue scelle cote : c'est du moat data, la meme
  // chose que kodo/prices/batch protege deja. Un utilisateur qui navigue fait
  // quelques appels, un aspirateur en fait des centaines.
  // Fail-open si Upstash est indisponible : on prefere servir que bloquer.
  const _rl = await checkPublicRateLimit(req, 'data');
  if (_rl) return _rl;

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

    // Le catalogue servi est celui que le MARCHE prouve : produits decouverts sur
    // eBay (FR et US). Les 2292 lignes PPT restent en base comme reserve de
    // packshots — leur prix etait une boite noire et leurs variantes n'existaient
    // pas dans les titres du marche — mais elles ne sont plus le catalogue.
    const where: string[] = ["p.lang = $1", "p.source IN ('ebay_fr','ebay_us')"];
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
              sp.sellers, sp.sample_size, sp.as_of, sp.updated_at, sp.last_priced_at,
              ks.name_fr AS set_name_fr, ks.logo_url, ks.series,
              w.cote_decotee AS w_price, w.vendeurs AS w_sellers,
              w.plancher AS w_low, w.plafond AS w_high, w.cotable AS w_cotable
         FROM k_sealed_products p
         LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
         LEFT JOIN k_sets ks ON ks.id = p.kodo_set_id
         LEFT JOIN sealed_ask_window w ON w.sealed_id = p.id
        WHERE ${where.join(' AND ')}
        ORDER BY ${order}
        LIMIT ${pLimit} OFFSET ${pOffset}`,
      params
    );

    const items = rows.map((r: Record<string, unknown>) => {
      const value = r.market_eur == null ? null : Number(r.market_eur);
      const contentQty = r.content_qty == null ? null : Number(r.content_qty);
      const unit = r.content_unit ? String(r.content_unit) : null;
      // RESOLUTION EN TROIS TEMPS
      //  1. l'instantane (sealed_prices) : la donnee du jour, la plus juste
      //  2. la fenetre 90 jours : quand le jour n'a pas atteint 3 vendeurs mais que
      //     trois mois y arrivent. C'est ce qui rend le vintage cotable — un display
      //     Set de Base ne trouve pas 3 vendeurs le meme jour, mais 12 sur 90 jours.
      //  3. la fourchette : meme la fenetre echoue -> on montre ce qui passe
      //     ("2 annonces sur 90 jours, de 449 a 79 000 EUR") plutot qu'un vide muet.
      const wPrice = r.w_price == null ? null : Number(r.w_price);
      const wSellers = r.w_sellers == null ? null : Number(r.w_sellers);
      const wLow = r.w_low == null ? null : Number(r.w_low);
      const wHigh = r.w_high == null ? null : Number(r.w_high);
      const skuKey = r.sku ? String(r.sku) : null;
      // Le SKU n'est fiable que s'il vient du parseur de titres (source ebay_fr).
      // Cote EN il est derive du product_type PPT, qui range un CASE de 6 bundles
      // sous 'Booster Bundle' -> tout calcul par booster serait faux.
      const skuTrusted = String(r.sku_source || '') === 'parser' || String(r.source || '') === 'ebay_fr';
      const boosters = skuTrusted ? boosterCount(skuKey, contentQty, unit, lang) : null;
      const low = r.low_eur == null ? null : Number(r.low_eur);
      const setName = r.set_name_fr ? String(r.set_name_fr) : (r.set_name ? String(r.set_name) : null);
      const spotOk = value != null && value > 0;
      const winOk = wPrice != null && wPrice > 0;
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
        // contenu certain -> le collectionneur peut comparer un display a un demi-display
        boosters,
        skuTrusted,
        // fourchette des annonces vues sur 90 jours, meme sans cote possible
        range: wLow != null && wHigh != null && !spotOk && !winOk ? {
          low: wLow, high: wHigh, sellers: wSellers, days: 90,
        } : null,
        price: !spotOk && winOk ? {
          // repli sur la fenetre : l'UI doit dire "sur 90 jours", pas "aujourd'hui"
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
          value,
          currency: 'EUR',
          basis: 'spot',
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
          // AGE DU PRIX, pas heure d'ecriture du pipeline. updated_at est pose
          // par le trigger kodo_touch_sealed_prices a chaque passe, meme quand la
          // cote n'est pas recalculee : l'ecran affichait "releve aujourd'hui" sur
          // un prix vieux de deux jours. Meme distinction que sync-health, inversee:
          // ici c'est l'age de la COTE qui interesse le collectionneur.
          updatedAt: r.last_priced_at ?? null,
        },
      };
    });

    // compte sur tout le perimetre filtre, pas sur la page servie : sinon
    // "2292 produits - 1000 cotes" alors que 1000 n'est que le plafond de pagination
    const totalRows = await sql.query(
      `SELECT count(*)::int n, count(sp.market_eur)::int priced
         FROM k_sealed_products p
         LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
        WHERE ${where.join(' AND ')}`,
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
      priced: totalRows[0] ? Number(totalRows[0].priced) : 0,
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
