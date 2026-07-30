// scripts/kodo-ingest-sealed-en.mjs
// Decouverte du catalogue scelle EN + cote, depuis les annonces eBay US.
// MEME METHODE QUE LE FR, DE BOUT EN BOUT. Dry-run par defaut.
//
//   node scripts/kodo-ingest-sealed-en.mjs --limit 10
//   node scripts/kodo-ingest-sealed-en.mjs --commit
//   KODO_SEALED_SETS=swsh7,sv03 node scripts/kodo-ingest-sealed-en.mjs --commit
//
// POURQUOI ON ABANDONNE LE CATALOGUE PPT :
//   1. Son prix est une boite noire : `unopenedPrice` seul, ni count ni median ni
//      historique (verifie sur le JSON complet), et date de 15 jours quand
//      `updatedAt` laisse croire au contraire.
//   2. Partir de SES produits nous fait demander au marche de confirmer des
//      distinctions qu'il ne fait pas : "Mini Tin [Day Pikachu]" et "[Zapdos]"
//      tombaient au meme centime sur le meme echantillon d'annonces.
//   Un produit n'existe que si le marche le nomme. C'est le principe du FR.
//
// CE QU'ON GARDE DE PPT : rien d'autre que le PACKSHOT. Quand un produit decouvert
// correspond a un produit PPT (meme serie, meme SKU), on herite de son image
// TCGplayer — le seul visuel propre disponible. L'image est un enrichissement,
// jamais une source de verite.
//
// Env : DATABASE_URL, EBAY_APP_ID, EBAY_CERT_ID
//       KODO_SEALED_SETS | KODO_SEALED_EN_SLEEP_MS(320) | KODO_SEALED_EN_MAX_MINUTES(50)

import { neon } from '@neondatabase/serverless';
import {
  detectSku, detectExclusion, detectFlags, detectContent,
  aggregateAsks, normalize, SKU_LABEL, MIN_ASKS, ASK_DISCOUNT, productKey, CONTENT_BEARING,
} from './lib/sealed-fr.mjs';

const DB_URL = process.env.DATABASE_URL;
const APP = process.env.EBAY_APP_ID;
const CERT = process.env.EBAY_CERT_ID;
if (!DB_URL || !APP || !CERT) { console.error('Manque DATABASE_URL / EBAY_APP_ID / EBAY_CERT_ID'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const iLimit = argv.indexOf('--limit');
const LIMIT = iLimit >= 0 ? Number(argv[iLimit + 1] || 0) : 0;
const ONLY = (process.env.KODO_SEALED_SETS || '').split(',').map((x) => x.trim()).filter(Boolean);
const SLEEP_MS = Number(process.env.KODO_SEALED_EN_SLEEP_MS || 320);
const MAX_MS = Number(process.env.KODO_SEALED_EN_MAX_MINUTES || 50) * 60000;
const START = Date.now();
const TODAY = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// eBay plafonne l'application a la journee. Sans garde, le script continue de
// tirer dans le vide apres le premier 429 : le run parait tourner, ne ramene
// plus rien, et brule le temps du job (meme piege que la boucle 429 PokeTrace
// du 17/07). On compte les refus consecutifs et on s'arrete proprement.
const MAX_429 = Number(process.env.KODO_EBAY_MAX_429 || 5);
let streak429 = 0;
let quotaDead = false;

// Termes anglais, pendant du QUERY_PLAN francais.
const QUERY_PLAN = [
  { terms: 'booster box', minPrice: 40 },
  { terms: 'elite trainer box', minPrice: 25 },
  { terms: 'booster bundle', minPrice: 15 },
  { terms: 'collection box sealed', minPrice: 15 },
];

// Un nom de serie court ou trop commun n'identifie rien : "151" ou "Base Set"
// ramenent tout et n'importe quoi. Pendant exact de NAME_AMBIGUOUS cote FR.
const NAME_AMBIGUOUS = new Set([
  'base set', '151', 'team rocket', 'jungle', 'fossil', 'promo', 'energy',
  'dragon', 'emerald', 'expedition', 'aquapolis', 'generations', 'celebrations',
]);

const SERIE_RANK = {
  me: 140, sv: 130, swsh: 120, sm: 110, xy: 100, bw: 90, hgss: 85, pl: 82, dp: 80,
  ex: 60, ecard: 50, neo: 40, gym: 30, base: 20, col: 45, cel25: 125, g: 95, det: 118,
};
function rank(id) {
  const base = String(id).replace(/-(1st|shadowless)(-ns)?$/i, '');
  const m = /^([a-z]+)(\d{0,2}(?:\.\d)?)/.exec(base);
  if (!m) return 0;
  const r = SERIE_RANK[m[1]];
  return r == null ? 0 : r * 100 + (m[2] ? Number(m[2]) : 0);
}
function sealable(id, series) {
  const i = String(id);
  if (/^[AB]\d/.test(i) || i === 'P-A') return false;
  if (/^(sve|mee|swshe|sme|xye)$/i.test(i)) return false;
  if (/^(svp|mep|bwp|basep|xyp|smp|swshp|dpp|hgssp)$/i.test(i)) return false;
  if (/tg$/i.test(i)) return false;
  if (/black star promos/i.test(String(series || ''))) return false;
  return true;
}

const productId = (setId, sku, content) =>
  'en-' + setId + '-' + sku + (content ? '-' + content.qty + content.unit : '');
const productName = (sku, content, setName) =>
  (SKU_LABEL[sku] || sku) + (content ? ' (' + content.qty + ' ' + content.unit.replace('_', '-') + ')' : '') + ' \u2014 ' + setName;

// ---------------------------------------------------------------- eBay US

// ---------------------------------------------------------------- journal des annonces

// On enregistre TOUTES les annonces croisees, y compris celles qu'on exclut et
// celles qui ne passent pas le seuil de 3 vendeurs. Raison : c'est l'annonce
// isolee d'aujourd'hui qui, accumulee sur 90 jours, formera l'echantillon du
// vintage. Un display Set de Base ne trouve pas 3 vendeurs le meme jour, mais il
// en trouve 12 sur trois mois — et cette donnee ne s'achete pas, elle s'accumule.
// Dedup par item_id : une annonce vue 40 nuits reste UNE ligne, first/last_seen_at
// donnant sa duree de vie (une annonce qui disparait vite s'est souvent vendue).
async function journaliser(sql, lang, lignes) {
  if (!lignes.length) return 0;
  const CH = 400;
  let n = 0;
  for (let i = 0; i < lignes.length; i += CH) {
    const b = lignes.slice(i, i + CH);
    await sql.query(
      `INSERT INTO sealed_asks_raw
         (item_id, lang, sealed_id, kodo_set_id, sku, content_qty, content_unit,
          title, price, currency, seller, condition_raw, ebay_epid, image_url,
          excluded, exclude_reason, first_seen_at, last_seen_at)
       SELECT * FROM unnest(
         $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::int[], $7::text[],
         $8::text[], $9::numeric[], $10::text[], $11::text[], $12::text[], $13::text[], $14::text[],
         $15::bool[], $16::text[], $17::timestamptz[], $18::timestamptz[])
       ON CONFLICT (item_id) DO UPDATE SET
         last_seen_at = EXCLUDED.last_seen_at,
         price = EXCLUDED.price,
         sealed_id = COALESCE(EXCLUDED.sealed_id, sealed_asks_raw.sealed_id),
         sku = COALESCE(EXCLUDED.sku, sealed_asks_raw.sku),
         excluded = EXCLUDED.excluded,
         exclude_reason = EXCLUDED.exclude_reason`,
      [
        b.map((x) => x.itemId), b.map(() => lang), b.map((x) => x.sealedId ?? null),
        b.map((x) => x.setId ?? null), b.map((x) => x.sku ?? null),
        b.map((x) => x.qty ?? null), b.map((x) => x.unit ?? null),
        b.map((x) => x.title), b.map((x) => x.price), b.map((x) => x.currency),
        b.map((x) => x.seller ?? null), b.map((x) => x.condition ?? null),
        b.map((x) => x.epid ?? null), b.map((x) => x.image ?? null),
        b.map((x) => !!x.excluded), b.map((x) => x.reason ?? null),
        b.map(() => new Date()), b.map(() => new Date()),
      ]
    );
    n += b.length;
  }
  return n;
}

async function token() {
  const b = Buffer.from(APP + ':' + CERT).toString('base64');
  const r = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + b, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=' + encodeURIComponent('https://api.ebay.com/oauth/api_scope'),
  });
  const j = await r.json();
  if (!j.access_token) { console.error('OAuth echec: ' + JSON.stringify(j).slice(0, 300)); process.exit(1); }
  return j.access_token;
}

async function search(tk, q, minPrice) {
  const price = minPrice > 0 ? ',price:[' + minPrice + '..40000]' : '';
  const p = new URLSearchParams({ q, limit: '100', filter: 'priceCurrency:USD' + price });
  try {
    if (quotaDead) return { items: [], err: 'quota' };
    const r = await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search?' + p, {
      headers: { Authorization: 'Bearer ' + tk, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US' },
    });
    if (r.status === 429) {
      streak429++;
      if (streak429 >= MAX_429) {
        quotaDead = true;
        console.log('!! quota eBay epuise (' + streak429 + ' refus consecutifs) — arret propre');
      } else {
        await sleep(Math.min(2000 * Math.pow(2, streak429), 20000));
      }
      return { items: [], err: 429 };
    }
    if (!r.ok) return { items: [], err: r.status };
    streak429 = 0;
    const j = await r.json();
    return { items: j.itemSummaries || [] };
  } catch (e) { return { items: [], err: e.message }; }
}

async function fxUsdEur() {
  const r = await sql.query(
    `SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`
  );
  const v = r[0] ? Number(r[0].rate) : null;
  if (!v || !(v > 0)) { console.error('Taux USD->EUR introuvable dans fx_rates'); process.exit(1); }
  return v;
}

// ---------------------------------------------------------------- catalogue

const setRows = await sql.query(
  `SELECT id, name, series FROM k_sets
    WHERE langs::text ILIKE '%en%' AND name IS NOT NULL ORDER BY id`
);
let sets = [];
for (const r of setRows) {
  if (!sealable(r.id, r.series)) continue;
  const norm = normalize(r.name);
  if (norm.length < 5 || NAME_AMBIGUOUS.has(norm)) continue;
  sets.push({ id: r.id, name: r.name, norm, rank: rank(r.id) });
}
sets.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
if (ONLY.length) sets = sets.filter((s) => ONLY.includes(s.id));
else if (LIMIT > 0) sets = sets.slice(0, LIMIT);

// Packshots PPT, indexes par (serie normalisee, sku). Seule chose qu'on leur garde.
const pptRows = await sql.query(
  `SELECT set_name, sku, image_url FROM k_sealed_products
    WHERE lang='en' AND source='ppt' AND image_url IS NOT NULL AND sku IS NOT NULL`
);
const packshots = new Map();
for (const r of pptRows) {
  const key = normalize(String(r.set_name || '').replace(/^[a-z]+\s*\d*[.\d]*\s*:\s*/i, '')) + '|' + r.sku;
  if (!packshots.has(key)) packshots.set(key, r.image_url);
}

const fx = await fxUsdEur();
const tk = await token();
console.log((COMMIT ? '>>> COMMIT' : '>>> DRY-RUN') + ' | ' + sets.length + ' series | fx ' + fx
  + ' | seuil ' + MIN_ASKS + ' vendeurs | decote ' + ASK_DISCOUNT);
console.log(packshots.size + ' packshots PPT disponibles pour enrichissement\n');

const outProducts = [], outPrices = [];
let vus = 0, retenus = 0, stopped = false, journalisees = 0;
const rejets = new Map();
const rejet = (k) => rejets.set(k, (rejets.get(k) || 0) + 1);

for (const set of sets) {
  if (Date.now() - START > MAX_MS) { console.log('!! plafond de temps atteint, arret propre'); stopped = true; break; }
  if (quotaDead) { stopped = true; break; }

  const uniq = new Map();
  for (const plan of QUERY_PLAN) {
    const r = await search(tk, 'pokemon ' + set.name + ' ' + plan.terms, plan.minPrice);
    if (r.err) { rejet('ebay_' + r.err); continue; }
    for (const it of r.items) if (it.itemId && !uniq.has(it.itemId)) uniq.set(it.itemId, it);
    await sleep(SLEEP_MS);
  }

  const groups = new Map();
  const journal = [];
  for (const it of uniq.values()) {
    vus++;
    const title = it.title || '';
    const n = normalize(title);

    // Journal : on enregistre TOUT, y compris les exclues et les non-appariees.
    // L'entree est mutable et deja poussee — chaque filtre y inscrit son motif.
    const j = {
      itemId: it.itemId, title,
      price: Number(it.price && it.price.value) || 0,
      currency: (it.price && it.price.currency) || 'USD',
      seller: (it.seller && it.seller.username) || null,
      condition: it.condition || null,
      epid: it.epid || null,
      image: (it.image && it.image.imageUrl) || null,
      setId: set.id, sku: null, qty: null, unit: null,
      sealedId: null, excluded: false, reason: null,
    };
    journal.push(j);

    const foreign = detectFlags(title).filter((f) => f !== 'en');
    if (foreign.length) { j.excluded = true; j.reason = 'drapeau_' + foreign[0]; rejet(j.reason); continue; }

    const c = normalize(String(it.condition || ''));
    if (/non[\s-]*scelle|occasion|used|opened/.test(c)) { j.excluded = true; j.reason = 'non_scelle'; rejet('non_scelle'); continue; }

    const ex = detectExclusion(n);
    if (ex) { j.excluded = true; j.reason = ex; rejet(ex); continue; }

    // la serie doit etre NOMMEE dans le titre : c'est notre seul ancrage
    if (!n.includes(set.norm)) { j.excluded = true; j.reason = 'serie_absente'; rejet('serie_absente'); continue; }

    const sku = detectSku(n);
    if (!sku) { j.excluded = true; j.reason = 'sku_inconnu'; rejet('sku_inconnu'); continue; }

    const content = detectContent(n);
    j.sku = sku;
    if (CONTENT_BEARING.has(sku) && !content) { j.excluded = true; j.reason = 'contenu_indetermine'; rejet('contenu_indetermine'); continue; }

    const price = Number(it.price && it.price.value);
    if (!Number.isFinite(price) || price <= 0) continue;
    retenus++;

    j.qty = content ? content.qty : null;
    j.unit = content ? content.unit : null;
    j.sealedId = productId(set.id, sku, CONTENT_BEARING.has(sku) ? content : null);
    const key = productKey(sku, content);
    if (!groups.has(key)) groups.set(key, { sku, content: CONTENT_BEARING.has(sku) ? content : null, rows: [] });
    groups.get(key).rows.push({
      price, seller: (it.seller && it.seller.username) || null, itemId: it.itemId,
    });
  }

  if (COMMIT) journalisees += await journaliser(sql, 'en', journal.filter((x) => x.itemId && x.price > 0));

  const lignes = [];
  for (const g of groups.values()) {
    const agg = aggregateAsks(g.rows);
    if (agg.price == null) continue; // le marche ne prouve pas ce produit
    const id = productId(set.id, g.sku, g.content);
    const image = packshots.get(set.norm + '|' + g.sku) || null;
    outProducts.push({
      id, setId: set.id, sku: g.sku, content: g.content,
      name: productName(g.sku, g.content, set.name),
      setName: set.name, productType: SKU_LABEL[g.sku] || g.sku, image,
      signature: g.rows.map((r) => r.itemId).filter(Boolean).sort().slice(0, 8).join('|'),
    });
    outPrices.push({
      id,
      usd: agg.price, usdLow: agg.low,
      eur: Math.round(agg.price * fx * 100) / 100,
      eurLow: agg.low == null ? null : Math.round(agg.low * fx * 100) / 100,
      eurRaw: agg.raw == null ? null : Math.round(agg.raw * fx * 100) / 100,
      sellers: agg.sellers, n: agg.n,
    });
    lignes.push({ sku: g.sku, content: g.content, eur: Math.round(agg.price * fx * 100) / 100, sellers: agg.sellers, image: !!image });
  }

  if (lignes.length) {
    lignes.sort((a, b) => b.eur - a.eur);
    console.log('=== ' + set.id + ' ' + set.name + '  [' + uniq.size + ' annonces]');
    for (const l of lignes) {
      const label = (SKU_LABEL[l.sku] || l.sku) + (l.content ? ' (' + l.content.qty + ' ' + l.content.unit + ')' : '');
      console.log('    ' + label.padEnd(30) + String(l.eur).padStart(9) + ' EUR  vendeurs=' + String(l.sellers).padStart(3) + (l.image ? '  [packshot]' : ''));
    }
  }
}

// Deux produits cotes sur le MEME echantillon ne sont pas distinguables.
const parSig = new Map();
for (const p of outProducts) {
  if (!p.signature) continue;
  if (!parSig.has(p.signature)) parSig.set(p.signature, []);
  parSig.get(p.signature).push(p.id);
}
const ambigus = new Set();
for (const g of parSig.values()) if (g.length > 1) for (const id of g) ambigus.add(id);
const produits = outProducts.filter((p) => !ambigus.has(p.id));
const prix = outPrices.filter((p) => !ambigus.has(p.id));

console.log('\n================ RECAP ================');
console.log('annonces vues        : ' + vus);
console.log('annonces retenues    : ' + retenus + ' (' + Math.round((retenus / Math.max(vus, 1)) * 100) + '%)');
console.log('annonces journalisees: ' + journalisees);
console.log('produits prouves     : ' + produits.length);
console.log('avec packshot PPT    : ' + produits.filter((p) => p.image).length);
console.log('ecartes (ambigus)    : ' + ambigus.size);
if (stopped) console.log('run PARTIEL');
console.log('\nmotifs de rejet :');
for (const [k, v] of [...rejets].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log('  ' + String(v).padStart(6) + '  ' + k);

if (!COMMIT) {
  console.log('\nDRY-RUN : rien ecrit. Relancer avec --commit.');
  process.exit(0);
}

const CH = 200;
for (let i = 0; i < produits.length; i += CH) {
  const b = produits.slice(i, i + CH);
  await sql.query(
    `INSERT INTO k_sealed_products
       (id, tcgplayer_id, lang, name, set_name, set_id, product_type, image_url,
        kodo_set_id, sku, content_qty, content_unit, source, sku_source, first_seen_at, last_seen_at)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[],
       $9::text[], $10::text[], $11::int[], $12::text[], $13::text[], $14::text[], $15::timestamptz[], $16::timestamptz[])
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, set_name=EXCLUDED.set_name, product_type=EXCLUDED.product_type,
       image_url=COALESCE(EXCLUDED.image_url, k_sealed_products.image_url),
       kodo_set_id=EXCLUDED.kodo_set_id, sku=EXCLUDED.sku,
       content_qty=EXCLUDED.content_qty, content_unit=EXCLUDED.content_unit,
       sku_source='parser', last_seen_at=EXCLUDED.last_seen_at, updated_at=now()`,
    [
      b.map((x) => x.id), b.map(() => null), b.map(() => 'en'),
      b.map((x) => x.name), b.map((x) => x.setName), b.map((x) => x.setId),
      b.map((x) => x.productType), b.map((x) => x.image),
      b.map((x) => x.setId), b.map((x) => x.sku),
      b.map((x) => (x.content ? x.content.qty : null)), b.map((x) => (x.content ? x.content.unit : null)),
      b.map(() => 'ebay_us'), b.map(() => 'parser'),
      b.map(() => new Date()), b.map(() => new Date()),
    ]
  );
}
for (let i = 0; i < prix.length; i += CH) {
  const b = prix.slice(i, i + CH);
  await sql.query(
    `INSERT INTO sealed_prices
       (sealed_id, market_eur, low_eur, market_usd, low_usd, currency_src, sellers,
        as_of, computed_at, method, market, sample_size, is_asking, raw_eur, last_priced_at)
     SELECT * FROM unnest(
       $1::text[], $2::numeric[], $3::numeric[], $4::numeric[], $5::numeric[], $6::text[], $7::int[],
       $8::timestamptz[], $9::timestamptz[], $10::text[], $11::text[], $12::int[], $13::bool[], $14::numeric[], $15::timestamptz[])
     ON CONFLICT (sealed_id) DO UPDATE SET
       market_eur=COALESCE(EXCLUDED.market_eur, sealed_prices.market_eur),
       low_eur=COALESCE(EXCLUDED.low_eur, sealed_prices.low_eur),
       market_usd=EXCLUDED.market_usd, low_usd=EXCLUDED.low_usd,
       currency_src=EXCLUDED.currency_src, sellers=COALESCE(EXCLUDED.sellers, sealed_prices.sellers),
       as_of=EXCLUDED.as_of, computed_at=now(), method=EXCLUDED.method,
       market=EXCLUDED.market, sample_size=EXCLUDED.sample_size,
       is_asking=EXCLUDED.is_asking, raw_eur=COALESCE(EXCLUDED.raw_eur, sealed_prices.raw_eur),
       last_priced_at=COALESCE(EXCLUDED.last_priced_at, sealed_prices.last_priced_at)`,
    [
      b.map((x) => x.id), b.map((x) => x.eur), b.map((x) => x.eurLow),
      b.map((x) => x.usd), b.map((x) => x.usdLow), b.map(() => 'USD'), b.map((x) => x.sellers),
      b.map(() => new Date()), b.map(() => new Date()),
      b.map(() => 'ebay_us_ask'), b.map(() => 'US'), b.map((x) => x.n),
      b.map(() => true), b.map((x) => x.eurRaw),
      b.map((x) => (x.eur != null ? new Date() : null)),
    ]
  );
  await sql.query(
    `DELETE FROM sealed_price_history WHERE snapshot_date = $1::date AND sealed_id = ANY($2::text[])`,
    [TODAY, b.map((x) => x.id)]
  );
  await sql.query(
    `INSERT INTO sealed_price_history (sealed_id, snapshot_date, market_eur, low_eur, market_usd, sellers, method)
     SELECT * FROM unnest($1::text[], $2::date[], $3::numeric[], $4::numeric[], $5::numeric[], $6::int[], $7::text[])`,
    [
      b.map((x) => x.id), b.map(() => TODAY), b.map((x) => x.eur),
      b.map((x) => x.eurLow), b.map((x) => x.usd), b.map((x) => x.sellers), b.map(() => 'ebay_us_ask'),
    ]
  );
}
console.log('\necrit en base.');

const v = await sql.query(
  `SELECT source, COALESCE(sp.method,'(aucun)') m, count(*)::int n
     FROM k_sealed_products p LEFT JOIN sealed_prices sp ON sp.sealed_id = p.id
    WHERE p.lang='en' GROUP BY 1,2 ORDER BY 3 DESC`
);
for (const r of v) console.log('  ' + String(r.source || '-').padEnd(10) + r.m.padEnd(20) + r.n);
