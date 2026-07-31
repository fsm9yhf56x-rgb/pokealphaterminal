// Recalcule sealed_prices depuis sealed_asks_raw. ZERO appel eBay.
// La regle vient de aggregateAsks : le prix affiche est la MOINS CHERE annonce
// reelle passant la garde a 50% de la mediane. Aucune decote.
//
//   node scripts/recompute-sealed-prices.mjs --lang=fr [--commit]
//   node scripts/recompute-sealed-prices.mjs --lang=en [--commit]
//
// EN : les annonces sont en USD. On agrege en USD (la garde a 50% doit porter
// sur la devise d'origine), on convertit APRES, comme le fait l'ingest.
import { neon } from '@neondatabase/serverless';
import { aggregateAsks } from './lib/sealed-fr.mjs';

const COMMIT = process.argv.includes('--commit');
const LANG = ((process.argv.find((a) => a.startsWith('--lang=')) || '--lang=fr').split('=')[1] || 'fr').toLowerCase();
if (LANG !== 'fr' && LANG !== 'en') { console.error('--lang=fr|en'); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);

let fx = 1;
if (LANG === 'en') {
  const r = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR'
                       ORDER BY rate_date DESC LIMIT 1`;
  fx = r[0] ? Number(r[0].rate) : 0;
  if (!(fx > 0)) { console.error('taux USD->EUR introuvable dans fx_rates'); process.exit(1); }
}
const METHOD = LANG === 'fr' ? 'ebay_fr_ask' : 'ebay_us_ask';
const MARKET = LANG === 'fr' ? 'EU_FR' : 'US';
const CURSRC = LANG === 'fr' ? 'EUR' : 'USD';
const r2 = (v) => (v == null ? null : Math.round(v * 100) / 100);

const raw = await sql`
  SELECT sealed_id, price::float8 AS price, seller
    FROM sealed_asks_raw
   WHERE NOT excluded AND sealed_id IS NOT NULL AND price > 0
     AND lang = ${LANG} AND last_seen_at > now() - interval '3 days'`;

const groups = new Map();
for (const r of raw) {
  if (!groups.has(r.sealed_id)) groups.set(r.sealed_id, []);
  groups.get(r.sealed_id).push({ price: r.price, seller: r.seller });
}
// sealed_asks_raw journalise des annonces appariees a des produits qui n'ont
// jamais atteint le seuil : 702 groupes EN pour 457 produits au catalogue. Sans
// ce garde, l'UPSERT fabriquerait des cotes orphelines.
const catalogue = new Set(
  (await sql`SELECT id FROM k_sealed_products WHERE lang = ${LANG}`).map((r) => r.id)
);
const cur = await sql`SELECT sealed_id, market_eur::float8 AS m FROM sealed_prices`;
const byId = new Map(cur.map((x) => [x.sealed_id, x.m]));

const out = [];
for (const [id, rows] of groups) {
  const agg = aggregateAsks(rows);
  out.push({ id, agg, eur: r2(agg.price == null ? null : agg.price * fx), av: byId.get(id) });
}
out.sort((a, b) => (b.eur || 0) - (a.eur || 0));

console.log(LANG.toUpperCase() + ' | fx ' + fx + ' | produits avec annonces < 3j : ' + out.length);
console.log('id'.padEnd(34) + 'avant EUR'.padStart(11) + 'apres EUR'.padStart(11) + 'ecart'.padStart(9) + '  vend.');
for (const o of out.slice(0, 25)) {
  const d = (o.av && o.eur) ? Math.round((o.eur / o.av - 1) * 100) + '%' : '-';
  console.log(o.id.padEnd(34) + String(o.av ?? '-').padStart(11) + String(o.eur ?? 'null').padStart(11)
    + d.padStart(9) + '  ' + o.agg.sellers);
}
const nuls = out.filter((o) => o.agg.price == null);
console.log('\nsous le seuil de 3 vendeurs (NON TOUCHES) : ' + nuls.length);

if (!COMMIT) { console.log('\nDRY-RUN. Relancer avec --commit.'); process.exit(0); }

const hors = out.filter((o) => o.agg.price != null && !catalogue.has(o.id));
if (hors.length) console.log('hors catalogue, ignores : ' + hors.length);
const ok = out.filter((o) => o.agg.price != null && catalogue.has(o.id));
for (let i = 0; i < ok.length; i += 200) {
  const b = ok.slice(i, i + 200);
  await sql.query(
    // UPSERT et non UPDATE : un produit peut entrer au catalogue sans ligne
    // sealed_prices, et un UPDATE a vide ne remonte aucune erreur.
    `INSERT INTO sealed_prices
       (sealed_id, market_eur, low_eur, raw_eur, market_usd, low_usd, sellers,
        sample_size, currency_src, method, market, is_asking, as_of, computed_at, last_priced_at)
     SELECT v.id, v.eur, v.eur, v.raweur, v.usd, v.usd, v.sellers, v.n,
            $8::text, $9::text, $10::text, true, now(), now(), now()
       FROM unnest($1::text[], $2::numeric[], $3::numeric[], $4::numeric[], $5::numeric[],
                   $6::int[], $7::int[])
         AS v(id, eur, raweur, usd, usdlow, sellers, n)
     ON CONFLICT (sealed_id) DO UPDATE SET
       market_eur = EXCLUDED.market_eur, low_eur = EXCLUDED.low_eur,
       raw_eur = EXCLUDED.raw_eur, market_usd = EXCLUDED.market_usd,
       low_usd = EXCLUDED.low_usd, sellers = EXCLUDED.sellers,
       sample_size = EXCLUDED.sample_size, currency_src = EXCLUDED.currency_src,
       method = EXCLUDED.method, market = EXCLUDED.market, is_asking = true,
       computed_at = now(), last_priced_at = now()`,
    [
      b.map((o) => o.id),
      b.map((o) => o.eur),
      b.map((o) => r2(o.agg.raw == null ? null : o.agg.raw * fx)),
      b.map((o) => (LANG === 'en' ? r2(o.agg.price) : null)),
      b.map((o) => (LANG === 'en' ? r2(o.agg.price) : null)),
      b.map((o) => o.agg.sellers),
      b.map((o) => o.agg.n),
      CURSRC, METHOD, MARKET,
    ]);
}
console.log('\n' + ok.length + ' lignes recalculees.');
