// scripts/kodo-sealed-promote.mjs
// Inscrit au catalogue les produits que la FENETRE 90 JOURS valide, alors qu'aucune
// journee isolee n'y arrive. Dry-run par defaut, --commit pour ecrire.
//
//   node scripts/kodo-sealed-promote.mjs
//   node scripts/kodo-sealed-promote.mjs --commit
//
// L'IMPASSE QU'IL RESOUT
//   Regle du catalogue : un produit entre quand le marche le prouve, soit 3 vendeurs
//   distincts. Les ingests appliquent ce seuil A LA JOURNEE — or un display Set de
//   Base 1ere edition passe une fois par mois. Il ne pouvait donc JAMAIS entrer, et
//   sa fourchette n'etait jamais servie : le journal le voyait, le catalogue
//   l'ignorait, l'utilisateur ne voyait rien.
//
//   Le seuil n'est pas remis en cause, c'est sa FENETRE qui change. Trois vendeurs
//   sur trois mois valent trois vendeurs sur un jour : dans les deux cas le marche
//   a parle par plusieurs voix. Un produit vu par UN seul vendeur reste dehors.
//
// CE QU'IL N'ECRIT PAS : aucun prix. La promotion cree la fiche produit ; la cote
// vient ensuite de la route, qui lit sealed_ask_window. Un produit promu sans cote
// affiche sa fourchette — "4 499 EUR, 1 annonce sur 90 jours" — ce qui est
// exactement ce dont un collectionneur de vintage a besoin.
//
// Env : DATABASE_URL

import { neon } from '@neondatabase/serverless';
import { SKU_LABEL } from './lib/sealed-fr.mjs';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const COMMIT = process.argv.includes('--commit');
const SEUIL = Number(process.env.KODO_SEALED_PROMOTE_MIN || 3);

// Candidats : presents au journal, absents du catalogue, et portes par assez de
// vendeurs distincts sur la fenetre.
const candidats = await sql.query(
  `SELECT j.sealed_id, j.lang, j.kodo_set_id, j.sku,
          max(j.content_qty) AS content_qty, max(j.content_unit) AS content_unit,
          count(DISTINCT COALESCE(j.seller, 'anon:' || j.item_id))::int AS vendeurs,
          count(*)::int AS annonces,
          min(j.first_seen_at)::date AS depuis,
          (array_agg(j.ebay_epid ORDER BY j.last_seen_at DESC) FILTER (WHERE j.ebay_epid IS NOT NULL))[1] AS epid
     FROM sealed_asks_raw j
     LEFT JOIN k_sealed_products p ON p.id = j.sealed_id
    WHERE j.sealed_id IS NOT NULL
      AND NOT j.excluded
      AND j.last_seen_at > now() - interval '90 days'
      AND p.id IS NULL
    GROUP BY 1, 2, 3, 4
   HAVING count(DISTINCT COALESCE(j.seller, 'anon:' || j.item_id)) >= $1
   ORDER BY 7 DESC`,
  [SEUIL]
);

console.log((COMMIT ? '>>> COMMIT' : '>>> DRY-RUN') + ' | seuil ' + SEUIL + ' vendeurs sur 90 jours\n');
console.log(candidats.length + ' produit(s) a promouvoir');

if (!candidats.length) {
  // Ce qui approche du seuil, pour savoir ce qui viendra
  const proches = await sql.query(
    `SELECT j.sealed_id, count(DISTINCT COALESCE(j.seller, 'anon:' || j.item_id))::int v
       FROM sealed_asks_raw j LEFT JOIN k_sealed_products p ON p.id = j.sealed_id
      WHERE j.sealed_id IS NOT NULL AND NOT j.excluded AND p.id IS NULL
        AND j.last_seen_at > now() - interval '90 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 6`
  );
  if (proches.length) {
    console.log('\nen attente (sous le seuil) :');
    for (const x of proches) console.log('  ' + String(x.sealed_id).padEnd(34) + x.v + ' vendeur(s)');
    console.log('\nCes produits entreront des que d autres vendeurs les proposeront.');
  }
  process.exit(0);
}

for (const c of candidats) {
  console.log('  ' + String(c.sealed_id).padEnd(34) + c.vendeurs + ' vendeurs · '
    + c.annonces + ' annonces · depuis le ' + c.depuis);
}

if (!COMMIT) {
  console.log('\nDRY-RUN : rien ecrit. Relancer avec --commit.');
  process.exit(0);
}

// Nom de serie pour le libelle, depuis le catalogue canonique.
const sets = new Map();
const sr = await sql.query(
  `SELECT id, COALESCE(name_fr, name) AS nom_fr, name AS nom_en FROM k_sets`
);
for (const r of sr) sets.set(r.id, { fr: r.nom_fr, en: r.nom_en });

const rows = candidats.map((c) => {
  const s = sets.get(c.kodo_set_id) || {};
  const nomSerie = (c.lang === 'fr' ? s.fr : s.en) || c.kodo_set_id || '?';
  const qty = c.content_qty == null ? null : Number(c.content_qty);
  const unit = c.content_unit || null;
  const suffixe = qty && unit ? ' (' + qty + ' ' + String(unit).replace('_', '-') + ')' : '';
  return {
    id: c.sealed_id, lang: c.lang, setId: c.kodo_set_id, sku: c.sku,
    qty, unit,
    name: (SKU_LABEL[c.sku] || c.sku) + suffixe + ' \u2014 ' + nomSerie,
    setName: nomSerie,
    productType: SKU_LABEL[c.sku] || c.sku,
    epid: c.epid || null,
  };
});

await sql.query(
  `INSERT INTO k_sealed_products
     (id, tcgplayer_id, lang, name, set_name, set_id, product_type, image_url,
      kodo_set_id, sku, content_qty, content_unit, source, sku_source,
      first_seen_at, last_seen_at, ebay_epid)
   SELECT * FROM unnest(
     $1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[],
     $9::text[], $10::text[], $11::int[], $12::text[], $13::text[], $14::text[],
     $15::timestamptz[], $16::timestamptz[], $17::text[])
   ON CONFLICT (id) DO NOTHING`,
  [
    rows.map((r) => r.id), rows.map(() => null), rows.map((r) => r.lang),
    rows.map((r) => r.name), rows.map((r) => r.setName), rows.map((r) => r.setId),
    rows.map((r) => r.productType), rows.map(() => null),
    rows.map((r) => r.setId), rows.map((r) => r.sku),
    rows.map((r) => r.qty), rows.map((r) => r.unit),
    rows.map((r) => (r.lang === 'fr' ? 'ebay_fr' : 'ebay_us')), rows.map(() => 'parser'),
    rows.map(() => new Date()), rows.map(() => new Date()),
    rows.map((r) => r.epid),
  ]
);
console.log('\n' + rows.length + ' produit(s) inscrit(s) au catalogue.');
console.log('Leur cote viendra de la fenetre ; sans cote ils afficheront leur fourchette.');
