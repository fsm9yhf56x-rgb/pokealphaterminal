// scripts/kodo-sealed-normalize.mjs
// Retype les produits scelles a partir de leur NOM, via le parseur partage.
// Idempotent. Dry-run par defaut. Vaut pour EN, FR et JP : une seule regle.
//
//   node scripts/kodo-sealed-normalize.mjs --lang en
//   node scripts/kodo-sealed-normalize.mjs --lang en --commit
//
// POURQUOI : PPT type ses produits avec un champ `product_type` qui IGNORE le mot
// "Case" pourtant present dans son propre nom —
//   "Brilliant Stars Booster Box Case"      -> product_type "Booster Box" -> display
//   "Hidden Fates Elite Trainer Box Case"   -> product_type "Elite Trainer Box" -> etb
//   "Pitch Black Half Booster Boxes"        -> product_type "Booster Box" -> display
// Un carton de six displays affiche comme un display, c'est un mensonge d'etiquette,
// et tout calcul par booster bati dessus est faux. Le NOM porte la verite : on le lit.
//
// La colonne sku_source distingue un SKU lu par le parseur d'un SKU herite du
// fournisseur. La route ne fait confiance qu'au premier.

import { neon } from '@neondatabase/serverless';
import { normalize, detectSku, detectContent, SKU_LABEL } from './lib/sealed-fr.mjs';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const argv = process.argv.slice(2);
const COMMIT = argv.includes('--commit');
const LANG = (argv.find((a, i) => argv[i - 1] === '--lang') || 'en').toLowerCase();
if (!['en', 'fr', 'jp'].includes(LANG)) { console.error('--lang doit valoir en, fr ou jp'); process.exit(1); }

await sql.query(`ALTER TABLE k_sealed_products ADD COLUMN IF NOT EXISTS sku_source text`);

const rows = await sql.query(
  `SELECT id, name, sku, content_qty, content_unit, sku_source
     FROM k_sealed_products WHERE lang = $1 ORDER BY id`,
  [LANG]
);
console.log((COMMIT ? '>>> COMMIT' : '>>> DRY-RUN') + ' | langue ' + LANG.toUpperCase() + ' | ' + rows.length + ' produits\n');

const changes = [];
const transitions = new Map();
let inchanges = 0, sansSku = 0;

for (const r of rows) {
  const n = normalize(r.name);
  const sku = detectSku(n);
  if (!sku) { sansSku++; continue; }
  const content = detectContent(n);
  const qty = content ? content.qty : null;
  const unit = content ? content.unit : null;

  const same = sku === r.sku
    && (qty ?? null) === (r.content_qty == null ? null : Number(r.content_qty))
    && (unit ?? null) === (r.content_unit ?? null)
    && r.sku_source === 'parser';
  if (same) { inchanges++; continue; }

  if (sku !== r.sku) {
    const k = (r.sku || '(aucun)') + ' -> ' + sku;
    transitions.set(k, (transitions.get(k) || 0) + 1);
  }
  changes.push({ id: r.id, name: r.name, from: r.sku, sku, qty, unit });
}

console.log('deja corrects   : ' + inchanges);
console.log('a corriger      : ' + changes.length);
console.log('sans SKU lisible: ' + sansSku);

if (transitions.size) {
  console.log('\nretypages (le nom fait foi) :');
  for (const [k, v] of [...transitions].sort((a, b) => b[1] - a[1])) {
    console.log('  ' + String(v).padStart(4) + '  ' + k);
  }
  console.log('\nexemples :');
  for (const c of changes.filter((x) => x.from !== x.sku).slice(0, 12)) {
    console.log('  ' + String(c.from || '-').padEnd(14) + ' -> ' + String(c.sku).padEnd(14) + (c.qty ? '(' + c.qty + ' ' + c.unit + ') ' : '') + c.name.slice(0, 58));
  }
}

if (!COMMIT) {
  console.log('\nDRY-RUN : rien ecrit. Relancer avec --commit.');
  process.exit(0);
}

const CH = 300;
for (let i = 0; i < changes.length; i += CH) {
  const b = changes.slice(i, i + CH);
  await sql.query(
    `UPDATE k_sealed_products p SET
       sku = u.sku, content_qty = u.qty, content_unit = u.unit,
       sku_source = 'parser', updated_at = now()
     FROM unnest($1::text[], $2::text[], $3::int[], $4::text[]) AS u(id, sku, qty, unit)
     WHERE p.id = u.id`,
    [b.map((x) => x.id), b.map((x) => x.sku), b.map((x) => x.qty), b.map((x) => x.unit)]
  );
}
console.log('\necrit : ' + changes.length + ' produits retypes.');

const after = await sql.query(
  `SELECT sku, count(*)::int n FROM k_sealed_products
    WHERE lang = $1 AND sku IS NOT NULL GROUP BY 1 ORDER BY 2 DESC`,
  [LANG]
);
console.log('\nrepartition finale :');
for (const r of after) console.log('  ' + String(SKU_LABEL[r.sku] || r.sku).padEnd(24) + r.n);
