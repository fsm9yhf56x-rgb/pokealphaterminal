// scripts/sonde-sealed-fr.mjs
// Decouverte du catalogue scelle FR depuis les annonces eBay FR. DRY-RUN PUR : n'ecrit RIEN.
// But : prouver, avant de creer la moindre table, quels produits scelles FR le marche porte
// reellement et lesquels atteignent le seuil de cote (>= 3 vendeurs distincts).
//
// Usage :
//   node scripts/sonde-sealed-fr.mjs --map              -> table de correspondance code FR <-> set
//   node scripts/sonde-sealed-fr.mjs --limit 12         -> decouverte sur 12 sets
//   KODO_SEALED_SETS=sv01,swsh11,me05 node scripts/sonde-sealed-fr.mjs
//
// Env : DATABASE_URL, EBAY_APP_ID, EBAY_CERT_ID

import { neon } from '@neondatabase/serverless';
import { parseSealedTitle, aggregateAsks, normalize, SKU_LABEL } from './lib/sealed-fr.mjs';

const DB_URL = process.env.DATABASE_URL;
const APP = process.env.EBAY_APP_ID;
const CERT = process.env.EBAY_CERT_ID;
if (!DB_URL || !APP || !CERT) { console.error('Manque DATABASE_URL / EBAY_APP_ID / EBAY_CERT_ID'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const MAP_ONLY = argv.includes('--map');
const LIMIT = Number((argv.find((a) => a.startsWith('--limit')) || '').split(/[=\s]/)[1] || process.env.KODO_SEALED_LIMIT || 10);
const ONLY = (process.env.KODO_SEALED_SETS || '').split(',').map((s) => s.trim()).filter(Boolean);
const SLEEP_MS = Number(process.env.KODO_SEALED_SLEEP_MS || 350);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Le marche FR nomme ses series avec ses propres prefixes ; TCGdex utilise les prefixes US.
// La correspondance est deterministe -> aucune table a maintenir.
const PREFIX_FR = {
  sv: 'ev', swsh: 'eb', sm: 'sl', xy: 'xy', bw: 'nb', me: 'me',
  dp: 'dp', pl: 'pt', hgss: 'hs', ex: 'ex', dpp: 'dp',
};

/** "sv03.5" -> "ev3.5" ; "swsh11" -> "eb11" ; null si non derivable */
function frCode(setId) {
  const base = String(setId || '').replace(/^(fr|en|jp)-/, '').replace(/-(1st|shadowless)(-ns)?$/i, '');
  const m = /^([a-z]+)(\d{1,2}(?:\.\d)?)$/.exec(base);
  if (!m) return null;
  const p = PREFIX_FR[m[1]];
  if (!p) return null;
  const num = m[2];
  if (num.includes('.')) {
    const [a, b] = num.split('.');
    return p + String(Number(a)) + '.' + b;
  }
  return p + String(Number(num));
}

// Un set sans produit scelle physique n'a rien a faire ici : le chercher ne rend que du bruit.
function sealable(id, series) {
  const i = String(id);
  if (/^[AB]\d/.test(i) || i === 'P-A') return false;                 // TCG Pocket = jeu mobile
  if (/^(sve|mee|swshe|sme|xye)$/i.test(i)) return false;             // decks d'energies
  if (/^(svp|mep|bwp|basep|xyp|smp|swshp|dpp|hgssp)$/i.test(i)) return false; // Black Star Promos
  if (/tg$/i.test(i)) return false;                                   // Trainer Gallery = sous-set
  if (/black star promos/i.test(String(series || ''))) return false;
  return true;
}

// release_date est NULL sur la plupart des sets FR modernes (TCGdex ne les date pas).
// Le rang de serie se derive de l'id : deterministe, et il ne ment jamais.
const SERIE_RANK = {
  me: 140, sv: 130, swsh: 120, sm: 110, xy: 100, bw: 90, hgss: 85, pl: 82, dp: 80,
  ex: 60, ecard: 50, neo: 40, gym: 30, base: 20, col: 45, cel25: 125, g: 95, dv: 88, dc: 92, det: 118,
};
function rank(id) {
  const base = String(id).replace(/-(1st|shadowless)(-ns)?$/i, '');
  const m = /^([a-z]+)(\d{0,2}(?:\.\d)?)/.exec(base);
  if (!m) return 0;
  const r = SERIE_RANK[m[1]];
  if (r == null) return 0;
  return r * 100 + (m[2] ? Number(m[2]) : 0);
}

// Une requete generique ("pokemon Nuit Noire") rend des CARTES a l'unite.
// On demande explicitement du scelle, avec un plancher de prix par famille.
const QUERY_PLAN = [
  { terms: 'display', minPrice: 60 },
  { terms: "coffret dresseur elite", minPrice: 25 },
  { terms: 'coffret scelle', minPrice: 15 },
  { terms: 'bundle booster box', minPrice: 15 },
];

async function loadSets() {
  const rows = await sql.query(
    `SELECT id, name, name_fr, series, release_date
       FROM k_sets
      WHERE langs::text ILIKE '%fr%' AND name IS NOT NULL AND NOT hidden
      ORDER BY id`
  );
  const byCode = new Map();
  const byName = [];
  const list = [];
  for (const r of rows) {
    if (!sealable(r.id, r.series)) continue;
    // eBay FR ne parle que francais : name_fr est la source, l'anglais un repli qui degrade proprement
    const nameFr = r.name_fr || r.name;
    const code = frCode(r.id);
    const norm = normalize(nameFr);
    if (code && !byCode.has(code)) byCode.set(code, r.id);
    if (norm.length >= 5) byName.push({ id: r.id, norm });
    list.push({ id: r.id, name: nameFr, nameEn: r.name, localized: Boolean(r.name_fr), code, rank: rank(r.id) });
  }
  list.sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
  return { list, byCode, byName };
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

async function search(tk, q, minPrice = 0) {
  const price = minPrice > 0 ? ',price:[' + minPrice + '..8000]' : '';
  const p = new URLSearchParams({
    q, limit: '100',
    filter: 'itemLocationCountry:FR,priceCurrency:EUR' + price,
  });
  const r = await fetch('https://api.ebay.com/buy/browse/v1/item_summary/search?' + p, {
    headers: { Authorization: 'Bearer ' + tk, 'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR' },
  });
  if (!r.ok) return { items: [], total: 0, err: r.status };
  const j = await r.json();
  return { items: j.itemSummaries || [], total: j.total || 0 };
}

// ---------------------------------------------------------------- main

const { list, byCode, byName } = await loadSets();

if (MAP_ONLY) {
  const ok = list.filter((s) => s.code);
  const ko = list.filter((s) => !s.code);
  console.log('Sets FR : ' + list.length + ' | code derive ' + ok.length + ' | sans code ' + ko.length + '\n');
  const noFr = list.filter((s) => !s.localized);
  for (const s of ok.slice(0, 40)) console.log('  ' + String(s.code).padEnd(9) + ' <- ' + s.id.padEnd(14) + (s.localized ? '   ' : ' EN ') + s.name);
  console.log('\n--- sans code derivable (matching par NOM FR uniquement) ---');
  for (const s of ko.slice(0, 40)) console.log('  ' + s.id.padEnd(18) + (s.localized ? '   ' : ' EN ') + s.name);
  if (noFr.length) {
    console.log('\n!! ' + noFr.length + ' sets sans name_fr (repli anglais, matching eBay FR peu probable) :');
    for (const s of noFr.slice(0, 25)) console.log('   ' + s.id.padEnd(18) + s.name);
  }
  process.exit(0);
}

let targets = list.filter((s) => s.name);
if (ONLY.length) targets = targets.filter((s) => ONLY.includes(s.id) || ONLY.includes(s.code));
else targets = targets.slice(0, LIMIT); // tri par date de sortie DESC : marche le plus dense

const tk = await token();
console.log('OAuth ok | ' + targets.length + ' sets cibles | seuil 3 vendeurs distincts\n');

const catalogue = [];
let totalSeen = 0, totalKept = 0;
const rejects = new Map();

for (const set of targets) {
  const seen = new Map();
  let totalApi = 0, queries = 0;
  for (const plan of QUERY_PLAN) {
    const r = await search(tk, 'pokemon ' + set.name + ' ' + plan.terms, plan.minPrice);
    queries++;
    if (r.err) continue;
    totalApi = Math.max(totalApi, r.total);
    for (const it of r.items) if (it.itemId && !seen.has(it.itemId)) seen.set(it.itemId, it);
    await sleep(SLEEP_MS);
  }
  const items = [...seen.values()];

  const bySku = new Map();
  for (const it of items) {
    totalSeen++;
    const r = parseSealedTitle(it.title, { byCode, byName, condition: it.condition });
    if (r.excluded) {
      rejects.set(r.excludeReason, (rejects.get(r.excludeReason) || 0) + 1);
      continue;
    }
    if (r.setId !== set.id) continue; // le titre parle d'une autre serie -> pas notre affaire
    totalKept++;
    const key = r.sku + (r.content ? ':' + r.content.qty + r.content.unit : '');
    if (!bySku.has(key)) bySku.set(key, { sku: r.sku, content: r.content, rows: [] });
    bySku.get(key).rows.push({
      price: Number(it.price && it.price.value),
      seller: (it.seller && it.seller.username) || null,
      title: it.title,
    });
  }

  const lines = [];
  for (const [key, g] of bySku) {
    const agg = aggregateAsks(g.rows);
    lines.push({ key, sku: g.sku, content: g.content, ...agg });
    if (agg.price != null) catalogue.push({ setId: set.id, code: set.code, setName: set.name, key, ...agg });
  }
  lines.sort((a, b) => (b.price || 0) - (a.price || 0));

  console.log('=== ' + set.id + ' (' + (set.code || '-') + ') ' + set.name + '  [' + items.length + ' annonces uniques sur ' + queries + ' requetes]');
  if (!lines.length) console.log('    aucun SKU retenu');
  for (const l of lines) {
    const label = (SKU_LABEL[l.sku] || l.sku) + (l.content ? ' (' + l.content.qty + ' ' + l.content.unit + ')' : '');
    const price = l.price != null ? String(l.price).padStart(9) + ' EUR' : '   donnees insuffisantes';
    console.log('    ' + label.padEnd(30) + price + '   n=' + String(l.n).padStart(3) + ' vendeurs=' + String(l.sellers).padStart(3) + (l.raw ? '  (brut ' + l.raw + ')' : ''));
  }
  console.log('');
}

console.log('================ RECAP ================');
console.log('annonces vues        : ' + totalSeen);
console.log('annonces retenues    : ' + totalKept + ' (' + Math.round((totalKept / Math.max(totalSeen, 1)) * 100) + '%)');
console.log('produits cotables    : ' + catalogue.length + ' couples (serie, SKU) au-dessus du seuil');
console.log('\nmotifs de rejet :');
for (const [k, v] of [...rejects].sort((a, b) => b[1] - a[1])) console.log('  ' + String(v).padStart(5) + '  ' + k);
console.log('\nDRY-RUN : rien n a ete ecrit en base.');
