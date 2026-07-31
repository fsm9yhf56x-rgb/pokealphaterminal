// Recalcule sealed_prices depuis sealed_asks_raw. ZERO appel eBay.
// La regle vient de aggregateAsks : le prix affiche est la MOINS CHERE annonce
// reelle passant la garde a 50% de la mediane. Aucune decote sur le scelle.
// Fenetre 3 jours = celle de /api/v1/sealed/asks, pour que la fiche et le
// classeur ne puissent plus diverger.
import { neon } from '@neondatabase/serverless';
import { aggregateAsks } from './lib/sealed-fr.mjs';

const COMMIT = process.argv.includes('--commit');
const sql = neon(process.env.DATABASE_URL);

const raw = await sql`
  SELECT sealed_id, price::float8 AS price, seller
    FROM sealed_asks_raw
   WHERE NOT excluded AND sealed_id IS NOT NULL AND price > 0
     AND lang = 'fr' AND last_seen_at > now() - interval '3 days'`;

const groups = new Map();
for (const r of raw) {
  if (!groups.has(r.sealed_id)) groups.set(r.sealed_id, []);
  groups.get(r.sealed_id).push({ price: r.price, seller: r.seller });
}

const cur = await sql`SELECT sealed_id, market_eur::float8 AS m, raw_eur::float8 AS r
                        FROM sealed_prices`;
const byId = new Map(cur.map((x) => [x.sealed_id, x]));

const out = [];
for (const [id, rows] of groups) out.push({ id, agg: aggregateAsks(rows), av: byId.get(id) });
out.sort((a, b) => (b.agg.price || 0) - (a.agg.price || 0));

console.log('produits FR avec annonces < 3j : ' + out.length);
console.log('id'.padEnd(34) + 'avant'.padStart(11) + 'apres'.padStart(11) + 'ecart'.padStart(9) + '  vend.');
for (const o of out.slice(0, 25)) {
  const av = o.av?.m, ap = o.agg.price;
  const d = (av && ap) ? Math.round((ap / av - 1) * 100) + '%' : '-';
  console.log(o.id.padEnd(34) + String(av ?? '-').padStart(11) + String(ap ?? 'null').padStart(11)
    + d.padStart(9) + '  ' + o.agg.sellers);
}
const nuls = out.filter((o) => o.agg.price == null);
console.log('\nsous le seuil de 3 vendeurs (NON TOUCHES) : ' + nuls.length);
if (nuls.length) console.log('  ' + nuls.map((o) => o.id).join(' '));

if (!COMMIT) { console.log('\nDRY-RUN. Relancer avec --commit.'); process.exit(0); }

const ok = out.filter((o) => o.agg.price != null);
for (let i = 0; i < ok.length; i += 200) {
  const b = ok.slice(i, i + 200);
  await sql.query(
    // UPSERT et non UPDATE : un produit entre au catalogue sans forcement avoir
    // une ligne sealed_prices. Un UPDATE sur une ligne absente ne remonte AUCUNE
    // erreur — le prix calcule part dans le vide (fr-sm5-display, 699 EUR).
    `INSERT INTO sealed_prices
       (sealed_id, market_eur, low_eur, raw_eur, sellers, sample_size,
        currency_src, method, market, is_asking, as_of, computed_at, last_priced_at)
     SELECT v.id, v.price, v.price, v.raw, v.sellers, v.n,
            'EUR', 'ebay_fr_ask', 'EU_FR', true, now(), now(), now()
       FROM unnest($1::text[], $2::numeric[], $3::numeric[], $4::int[], $5::int[])
         AS v(id, price, raw, sellers, n)
     ON CONFLICT (sealed_id) DO UPDATE SET
       market_eur = EXCLUDED.market_eur, low_eur = EXCLUDED.low_eur,
       raw_eur = EXCLUDED.raw_eur, sellers = EXCLUDED.sellers,
       sample_size = EXCLUDED.sample_size, method = EXCLUDED.method,
       market = EXCLUDED.market, is_asking = EXCLUDED.is_asking,
       computed_at = now(), last_priced_at = now()`,
    [b.map((o) => o.id), b.map((o) => o.agg.price), b.map((o) => o.agg.raw),
     b.map((o) => o.agg.sellers), b.map((o) => o.agg.n)]);
}
console.log('\n' + ok.length + ' lignes recalculees.');
