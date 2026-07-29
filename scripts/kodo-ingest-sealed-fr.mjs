// scripts/kodo-ingest-sealed-fr.mjs
// Ingestion du scelle FR : decouverte du catalogue + cote, depuis les annonces eBay FR.
// Dry-run par defaut. --commit pour ecrire.
//
//   node scripts/kodo-ingest-sealed-fr.mjs --limit 10
//   node scripts/kodo-ingest-sealed-fr.mjs --commit
//   KODO_SEALED_SETS=me05,sv09 node scripts/kodo-ingest-sealed-fr.mjs --commit
//
// REGLES (identiques aux singles FR, aucune exception) :
//   - chaque prix son marche : le FR sort d'annonces FR, jamais d'un prix US converti
//   - >= 3 VENDEURS DISTINCTS, sinon pas de cote (une voix par vendeur : republier 3 fois
//     la meme annonce ne fait pas un marche)
//   - ce sont des ANNONCES -> decote 0.88 + is_asking=true -> l'UI etiquette "des X EUR"
//   - donnees insuffisantes = prix NULL, JAMAIS un chiffre invente
//   - un produit entre au catalogue quand le marche le prouve, et n'en sort JAMAIS ensuite
//
// Env : DATABASE_URL, EBAY_APP_ID, EBAY_CERT_ID
//       KODO_SEALED_SLEEP_MS(350) | KODO_SEALED_MAX_MINUTES(40) | KODO_SEALED_SETS | KODO_SEALED_LIMIT

import { neon } from '@neondatabase/serverless';
import { parseSealedTitle, aggregateAsks, normalize, SKU_LABEL, MIN_ASKS, ASK_DISCOUNT } from './lib/sealed-fr.mjs';

const DB_URL = process.env.DATABASE_URL;
const APP = process.env.EBAY_APP_ID;
const CERT = process.env.EBAY_CERT_ID;
if (!DB_URL || !APP || !CERT) { console.error('Manque DATABASE_URL / EBAY_APP_ID / EBAY_CERT_ID'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const LIMIT = Number((argv.find((a) => a.startsWith('--limit')) || '').split(/[=\s]/)[1] || process.env.KODO_SEALED_LIMIT || 0);
const ONLY = (process.env.KODO_SEALED_SETS || '').split(',').map((x) => x.trim()).filter(Boolean);
const SLEEP_MS = Number(process.env.KODO_SEALED_SLEEP_MS || 350);
const MAX_MS = Number(process.env.KODO_SEALED_MAX_MINUTES || 40) * 60000;
const START = Date.now();
const TODAY = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SERIE_RANK = {
  me: 140, sv: 130, swsh: 120, sm: 110, xy: 100, bw: 90, hgss: 85, pl: 82, dp: 80,
  ex: 60, ecard: 50, neo: 40, gym: 30, base: 20, col: 45, cel25: 125, g: 95, dv: 88, dc: 92, det: 118,
};
const PREFIX_FR = { sv: 'ev', swsh: 'eb', sm: 'sl', xy: 'xy', bw: 'nb', me: 'me', dp: 'dp', pl: 'pt', hgss: 'hs', ex: 'ex', dpp: 'dp' };

const QUERY_PLAN = [
  { terms: 'display', minPrice: 60 },
  { terms: 'coffret dresseur elite', minPrice: 25 },
  { terms: 'coffret scelle', minPrice: 15 },
  { terms: 'bundle booster box', minPrice: 15 },
];

function rank(id) {
  const base = String(id).replace(/-(1st|shadowless)(-ns)?$/i, '');
  const m = /^([a-z]+)(\d{0,2}(?:\.\d)?)/.exec(base);
  if (!m) return 0;
  const r = SERIE_RANK[m[1]];
  return r == null ? 0 : r * 100 + (m[2] ? Number(m[2]) : 0);
}

function frCode(setId) {
  const base = String(setId || '').replace(/^(fr|en|jp)-/, '').replace(/-(1st|shadowless)(-ns)?$/i, '');
  const m = /^([a-z]+)(\d{1,2}(?:\.\d)?)$/.exec(base);
  if (!m) return null;
  const p = PREFIX_FR[m[1]];
  if (!p) return null;
  const n = m[2];
  return n.includes('.') ? p + String(Number(n.split('.')[0])) + '.' + n.split('.')[1] : p + String(Number(n));
}

// Un nom de serie n'est un identifiant que s'il est DISCRIMINANT.
// "Team Rocket" apparait dans des dizaines de produits modernes -> base5 recevait un
// "display 158 EUR" alors qu'un display Team Rocket 1999 FR vaut des milliers d'euros.
// Ces noms-la exigent le code de serie ; sans code, le set sort du perimetre. Mieux vaut
// pas de donnee qu'une fausse.
const NAME_AMBIGUOUS = new Set([
  'team rocket', '151', 'dragon', 'tempete', 'emeraude', 'expedition', 'generations',
  'jungle', 'fossile', 'promo', 'energie', 'aquapolis', 'celebrations',
]);
function discriminant(norm) {
  return norm.length >= 10 && !NAME_AMBIGUOUS.has(norm);
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

/** Identifiant deterministe : meme produit -> meme id a chaque run, sans compteur ni hasard. */
function productId(setId, sku, content) {
  const base = 'fr-' + setId + '-' + sku;
  return content ? base + '-' + content.qty + content.unit : base;
}

function productName(sku, content, setNameFr) {
  const label = SKU_LABEL[sku] || sku;
  const qty = content ? ' (' + content.qty + ' ' + content.unit.replace('_', '-') + ')' : '';
  return label + qty + ' \u2014 ' + setNameFr;
}

// ---------------------------------------------------------------- eBay

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
  const price = minPrice > 0 ? ',price:[' + minPrice + '..8000]' : '';
  const p = new URLSearchParams({ q, limit: '100', filter: 'itemLocationCountry:FR,priceCurrency:EUR' + price });
  try {
    const r = await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search?' + p, {
      headers: { Authorization: 'Bearer ' + tk, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR' },
    });
    if (!r.ok) return { items: [], err: r.status };
    const j = await r.json();
    return { items: j.itemSummaries || [] };
  } catch (e) { return { items: [], err: e.message }; }
}

// ---------------------------------------------------------------- ecriture

// Idempotent : la colonne d'identite eBay est posee au premier run et jamais retouchee.
await sql.query(`ALTER TABLE k_sealed_products ADD COLUMN IF NOT EXISTS ebay_epid text`);

async function upsertProducts(rows) {
  if (!rows.length) return;
  await sql.query(
    `INSERT INTO k_sealed_products
       (id, tcgplayer_id, lang, name, set_name, set_id, product_type, image_url,
        kodo_set_id, sku, content_qty, content_unit, source, first_seen_at, last_seen_at, ebay_epid)
     SELECT * FROM unnest(
       $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[],
       $9::text[], $10::text[], $11::int[], $12::text[], $13::text[], $14::timestamptz[], $15::timestamptz[], $16::text[])
     ON CONFLICT (id) DO UPDATE SET
       name=EXCLUDED.name, set_name=EXCLUDED.set_name, product_type=EXCLUDED.product_type,
       image_url=COALESCE(EXCLUDED.image_url, k_sealed_products.image_url),
       ebay_epid=COALESCE(EXCLUDED.ebay_epid, k_sealed_products.ebay_epid),
       kodo_set_id=EXCLUDED.kodo_set_id, sku=EXCLUDED.sku,
       content_qty=EXCLUDED.content_qty, content_unit=EXCLUDED.content_unit,
       last_seen_at=EXCLUDED.last_seen_at, updated_at=now()`,
    [
      rows.map((r) => r.id), rows.map(() => null), rows.map(() => 'fr'),
      rows.map((r) => r.name), rows.map((r) => r.setName), rows.map((r) => r.setId),
      rows.map((r) => r.productType), rows.map((r) => r.image),
      rows.map((r) => r.setId), rows.map((r) => r.sku),
      rows.map((r) => (r.content ? r.content.qty : null)), rows.map((r) => (r.content ? r.content.unit : null)),
      rows.map(() => 'ebay_fr'), rows.map(() => new Date()), rows.map(() => new Date()),
      rows.map((r) => r.epid || null),
    ]
  );
}

async function upsertPrices(rows) {
  if (!rows.length) return;
  await sql.query(
    `INSERT INTO sealed_prices
       (sealed_id, market_eur, low_eur, market_usd, low_usd, currency_src, sellers,
        as_of, computed_at, method, market, sample_size, is_asking, raw_eur)
     SELECT * FROM unnest(
       $1::text[], $2::numeric[], $3::numeric[], $4::numeric[], $5::numeric[], $6::text[], $7::int[],
       $8::timestamptz[], $9::timestamptz[], $10::text[], $11::text[], $12::int[], $13::bool[], $14::numeric[])
     ON CONFLICT (sealed_id) DO UPDATE SET
       market_eur=EXCLUDED.market_eur, low_eur=EXCLUDED.low_eur, currency_src=EXCLUDED.currency_src,
       sellers=EXCLUDED.sellers, as_of=EXCLUDED.as_of, computed_at=now(),
       method=EXCLUDED.method, market=EXCLUDED.market, sample_size=EXCLUDED.sample_size,
       is_asking=EXCLUDED.is_asking, raw_eur=EXCLUDED.raw_eur`,
    [
      rows.map((r) => r.id), rows.map((r) => r.price), rows.map((r) => r.low),
      rows.map(() => null), rows.map(() => null), rows.map(() => 'EUR'), rows.map((r) => r.sellers),
      rows.map(() => new Date()), rows.map(() => new Date()),
      rows.map((r) => r.method), rows.map(() => 'EU_FR'), rows.map((r) => r.n),
      rows.map(() => true), rows.map((r) => r.raw),
    ]
  );
  const withPrice = rows.filter((r) => r.price != null);
  if (!withPrice.length) return;
  // Idempotence du snapshot SANS dependre d'une contrainte unique dont on n'est pas sur :
  // on efface le point du jour pour ces produits avant de le reecrire. Deux runs le meme
  // jour donnent une seule ligne, quel que soit l'etat des index.
  await sql.query(
    `DELETE FROM sealed_price_history WHERE snapshot_date = $1::date AND sealed_id = ANY($2::text[])`,
    [TODAY, withPrice.map((r) => r.id)]
  );
  await sql.query(
    `INSERT INTO sealed_price_history (sealed_id, snapshot_date, market_eur, low_eur, market_usd, sellers, method)
     SELECT * FROM unnest($1::text[], $2::date[], $3::numeric[], $4::numeric[], $5::numeric[], $6::int[], $7::text[])`,
    [
      withPrice.map((r) => r.id), withPrice.map(() => TODAY), withPrice.map((r) => r.price),
      withPrice.map((r) => r.low), withPrice.map(() => null), withPrice.map((r) => r.sellers),
      withPrice.map((r) => r.method),
    ]
  );
}

// ---------------------------------------------------------------- main

const setRows = await sql.query(
  `SELECT id, name, name_fr, series, logo_url FROM k_sets
    WHERE langs::text ILIKE '%fr%' AND name IS NOT NULL ORDER BY id`
);
const byCode = new Map();
const byName = [];
let sets = [];
for (const r of setRows) {
  if (!sealable(r.id, r.series)) continue;
  const nameFr = r.name_fr || r.name;
  const code = frCode(r.id);
  const norm = normalize(nameFr);
  if (code && !byCode.has(code)) byCode.set(code, r.id);
  if (discriminant(norm)) byName.push({ id: r.id, norm });
  sets.push({ id: r.id, name: nameFr, code, logo: r.logo_url, rank: rank(r.id) });
}
sets.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
if (ONLY.length) sets = sets.filter((s) => ONLY.includes(s.id) || ONLY.includes(s.code));
else if (LIMIT > 0) sets = sets.slice(0, LIMIT);

// Produits FR deja connus : une fois decouvert, un produit ne quitte plus le catalogue.
// Si le marche ne le porte plus aujourd'hui, c'est son PRIX qui tombe a NULL, pas le produit.
const known = new Set(
  (await sql.query(`SELECT id FROM k_sealed_products WHERE lang='fr'`)).map((r) => r.id)
);

const tk = await token();
console.log((COMMIT ? '>>> COMMIT' : '>>> DRY-RUN') + ' | ' + sets.length + ' sets | ' + known.size + ' produits FR deja connus');
console.log('seuil ' + MIN_ASKS + ' vendeurs distincts | decote ' + ASK_DISCOUNT + '\n');

const outProducts = [];
const outPrices = [];
let seen = 0, kept = 0, newProducts = 0, stopped = false;

for (const set of sets) {
  if (Date.now() - START > MAX_MS) { console.log('!! plafond de temps atteint, arret propre'); stopped = true; break; }

  const uniq = new Map();
  for (const plan of QUERY_PLAN) {
    const r = await search(tk, 'pokemon ' + set.name + ' ' + plan.terms, plan.minPrice);
    if (r.err) console.log('   (eBay ' + r.err + ' sur "' + plan.terms + '")');
    for (const it of r.items) if (it.itemId && !uniq.has(it.itemId)) uniq.set(it.itemId, it);
    await sleep(SLEEP_MS);
  }

  const groups = new Map();
  for (const it of uniq.values()) {
    seen++;
    const p = parseSealedTitle(it.title, { byCode, byName, condition: it.condition });
    if (p.excluded || p.setId !== set.id) continue;
    kept++;
    const key = p.sku + (p.content ? ':' + p.content.qty + p.content.unit : '');
    if (!groups.has(key)) groups.set(key, { sku: p.sku, content: p.content, rows: [] });
    groups.get(key).rows.push({
      price: Number(it.price && it.price.value),
      seller: (it.seller && it.seller.username) || null,
      epid: it.epid || null,
      image: (it.image && it.image.imageUrl) || null,
    });
  }

  // L'epid est l'identifiant produit du catalogue eBay : plusieurs annonces du meme produit
  // le partagent. Le plus frequent designe donc le produit canonique du groupe, et son
  // annonce porte l'illustration la plus proche d'une photo de catalogue.
  const pickVisual = (rows) => {
    const tally = new Map();
    for (const r of rows) if (r.epid) tally.set(r.epid, (tally.get(r.epid) || 0) + 1);
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top) {
      const withEpid = rows.find((r) => r.epid === top[0] && r.image);
      if (withEpid) return { epid: top[0], image: withEpid.image };
    }
    const withImg = rows.filter((r) => r.image && Number.isFinite(r.price)).sort((a, b) => a.price - b.price);
    const mid = withImg[Math.floor(withImg.length / 2)];
    return { epid: null, image: mid ? mid.image : null };
  };

  const lines = [];
  for (const g of groups.values()) {
    const agg = aggregateAsks(g.rows);
    const id = productId(set.id, g.sku, g.content);
    const cotable = agg.price != null;
    // Entree au catalogue : seulement si le marche le prouve. Sinon on n'invente pas un produit.
    if (!cotable && !known.has(id)) continue;
    if (!known.has(id)) newProducts++;

    const visual = pickVisual(g.rows);
    outProducts.push({
      id, setId: set.id, sku: g.sku, content: g.content,
      name: productName(g.sku, g.content, set.name),
      setName: set.name,
      productType: SKU_LABEL[g.sku] || g.sku,
      // image du produit canonique eBay ; logo de serie en dernier repli (ce n'est PAS le produit)
      image: visual.image || set.logo || null,
      epid: visual.epid,
    });
    outPrices.push({
      id, price: agg.price, raw: agg.raw,
      low: agg.low,
      sellers: agg.sellers, n: agg.n, method: agg.method,
    });
    lines.push({ id, ...agg, sku: g.sku, content: g.content, isNew: !known.has(id) });
  }

  if (lines.length) {
    lines.sort((a, b) => (b.price || 0) - (a.price || 0));
    console.log('=== ' + set.id + ' ' + set.name + '  [' + uniq.size + ' annonces]');
    for (const l of lines) {
      const label = (SKU_LABEL[l.sku] || l.sku) + (l.content ? ' (' + l.content.qty + ' ' + l.content.unit + ')' : '');
      const price = l.price != null ? String(l.price).padStart(9) + ' EUR' : '   donnees insuffisantes';
      console.log('    ' + (l.isNew ? '+ ' : '  ') + label.padEnd(30) + price + '  vendeurs=' + String(l.sellers).padStart(3));
    }
  }
}

console.log('\n================ RECAP ================');
console.log('annonces vues      : ' + seen);
console.log('annonces retenues  : ' + kept + ' (' + Math.round((kept / Math.max(seen, 1)) * 100) + '%)');
console.log('produits ecrits    : ' + outProducts.length + ' (dont ' + newProducts + ' nouveaux)');
console.log('avec cote          : ' + outPrices.filter((p) => p.price != null).length);
console.log('donnees insuff.    : ' + outPrices.filter((p) => p.price == null).length);
console.log('avec epid eBay     : ' + outProducts.filter((p) => p.epid).length);
console.log('avec illustration  : ' + outProducts.filter((p) => p.image).length);
if (stopped) console.log('run PARTIEL (plafond de temps) : les sets non traites gardent leur etat precedent');

if (!COMMIT) {
  console.log('\nDRY-RUN : rien ecrit. Relancer avec --commit.');
  process.exit(0);
}

const CH = 200;
for (let i = 0; i < outProducts.length; i += CH) await upsertProducts(outProducts.slice(i, i + CH));
for (let i = 0; i < outPrices.length; i += CH) await upsertPrices(outPrices.slice(i, i + CH));
console.log('\necrit en base.');

const v = await sql.query(
  `SELECT p.lang, COALESCE(s.method,'(aucun)') m, count(*)::int n
     FROM k_sealed_products p LEFT JOIN sealed_prices s ON s.sealed_id = p.id
    GROUP BY 1,2 ORDER BY 1,3 DESC`
);
for (const r of v) console.log('  ' + r.lang + ' ' + r.m + ' = ' + r.n);
