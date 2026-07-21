// scripts/kodo-price-by-state.mjs
// Écrit les prix PAR ÉTAT dans price_matrix, pour valoriser le portfolio selon
// l'état réel déclaré par l'utilisateur (NM/EX/LP/MP/HP/DMG).
//
// NIVEAU 2 (cartes avec distribution eBay riche, >=MIN_ANNONCES) : percentiles réels
//   de la distribution des annonces (nettoyée MAD). Chaque état = un percentile observé.
// NIVEAU 1 (autres cartes) : prix d'ancrage (AGGREGATED/cote) × ratios de décote FR
//   calibrés sur 742 cartes vintage réelles (base EXCELLENT=1.0).
//
// Écrit tier NEAR_MINT/EXCELLENT/LIGHTLY_PLAYED/MODERATELY_PLAYED/HEAVILY_PLAYED/DAMAGED
// source 'kodo_state', is_asking=false -> portfolio-pricing.ts les trouve via pm.tier=t.tier.
// DRY-RUN par défaut, --commit.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');
const MIN_ANNONCES = 8;   // seuil Niveau 2 (distribution fiable)

// Ratios de décote FR réels (calibrés sur 742 cartes vintage, base EXCELLENT=1.0)
const DECAY = { MINT:1.38, NEAR_MINT:1.38, EXCELLENT:1.00, LIGHTLY_PLAYED:0.79, MODERATELY_PLAYED:0.65, HEAVILY_PLAYED:0.53, DAMAGED:0.42 };
// Mapping état -> percentile (Niveau 2). MINT=NM (même haut de gamme observable).
const STATE_PCT = { MINT:0.85, NEAR_MINT:0.85, EXCELLENT:0.65, LIGHTLY_PLAYED:0.45, MODERATELY_PLAYED:0.30, HEAVILY_PLAYED:0.18, DAMAGED:0.08 };
const STATES = ['NEAR_MINT','EXCELLENT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED'];

const pct=(a,p)=>{const s=[...a].sort((x,y)=>x-y);const i=(s.length-1)*p;const lo=Math.floor(i),hi=Math.ceil(i);return lo===hi?s[lo]:s[lo]+(s[hi]-s[lo])*(i-lo);};
const median=a=>{const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const clean=a=>{if(a.length<4)return a;const md=median(a);let k=a.filter(p=>p>=0.30*md);const lg=k.map(Math.log),lm=median(lg);const mad=median(lg.map(l=>Math.abs(l-lm)))||1e-4;return k.filter((p,i)=>Math.abs(lg[i]-lm)<=3*1.4826*mad);};

// FLUSH GROUPE : upsert tamponne puis ecrit par paquets (avant : 1 INSERT par
// (carte x etat) = ~112 000 allers-retours Neon, cause du timeout du maillon).
const BUF = { kid: [], tier: [], price: [], print: [] };
const FLUSH_AT = 2000;
const flush = async () => {
  if (!BUF.kid.length) return;
  // DEDUP (fix 20/07) : la cle de conflit est (kid, tier) pour ce script
  // (market/source/variant constants). Le SELECT Niveau 2 produit une ligne
  // PAR EDITION (1st/unl) de la meme carte -> deux ecritures de la meme cle
  // dans le meme lot -> erreur 21000 'cannot affect row a second time'
  // (4 nuits d'echec Ed1). Dernier arrive gagne.
  const seen = new Map();
  for (let i = 0; i < BUF.kid.length; i++) seen.set(BUF.kid[i] + '|' + BUF.tier[i], i);
  const keep = [...seen.values()].sort((a, b) => a - b);
  for (const k of Object.keys(BUF)) BUF[k] = keep.map(i => BUF[k][i]);
  await sql.query(`INSERT INTO price_matrix
    (kodo_card_id, market, tier, source, variant, spot, avg30d, median30d, currency, is_asking, as_of, print_id)
    SELECT x.kid, 'EU', x.tier, 'kodo_state', 'state', x.price, x.price, x.price, 'EUR', false, now(), x.print
    FROM unnest($1::text[], $2::text[], $3::numeric[], $4::text[]) AS x(kid, tier, price, print)
    ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
      spot=EXCLUDED.spot, avg30d=EXCLUDED.avg30d, median30d=EXCLUDED.median30d, is_asking=false, as_of=now()`,
    [BUF.kid, BUF.tier, BUF.price, BUF.print]);
  BUF.kid = []; BUF.tier = []; BUF.price = []; BUF.print = [];
};
const upsert = async (kid, printId, tier, price) => {
  if (!COMMIT) return;
  BUF.kid.push(kid); BUF.tier.push(tier);
  BUF.price.push(Math.round(price*100)/100); BUF.print.push(printId);
  if (BUF.kid.length >= FLUSH_AT) await flush();
};

// ── PRECHARGE : ancres typees (etat reel declare) ──
// Pour chaque carte ayant >=1 annonce avec condition_tier connu (titre LP/NM/...
// ou champ eBay fiable), l'ancre EXCELLENT = mediane des votes prix/DECAY[tier].
// UNE requete pour tout le stock (jamais 1 requete/carte = goulot Neon).
// Les annonces 'Gradee' (champ eBay) sont EXCLUES : 227 gradees avaient echappe
// au filtre isGraded(titre) et polluaient le raw.
const typedRows = await sql`
  SELECT kodo_card_id,
         percentile_cont(0.5) WITHIN GROUP (ORDER BY price / CASE condition_tier
           WHEN 'NEAR_MINT' THEN 1.38 WHEN 'EXCELLENT' THEN 1.00
           WHEN 'LIGHTLY_PLAYED' THEN 0.79 WHEN 'MODERATELY_PLAYED' THEN 0.65
           WHEN 'HEAVILY_PLAYED' THEN 0.53 WHEN 'DAMAGED' THEN 0.42 END
         ) AS anchor,
         count(*)::int AS votes
  FROM ebay_fr_ed1_raw
  WHERE condition_tier IS NOT NULL AND price > 0
    AND COALESCE(condition_raw,'') NOT IN ('Gradée','Gradee')
  GROUP BY kodo_card_id`;
const typedAnchors = new Map(typedRows.map(r => [r.kodo_card_id, { anchor: Number(r.anchor), votes: r.votes }]));
console.log(`Ancres typees (etat reel declare) : ${typedAnchors.size} cartes`);
// ── NIVEAU 2 : cartes avec distribution eBay (staging ed1_raw) ──
const distribCards = await sql`
  SELECT s.kodo_card_id, s.edition, kc.print_id
  FROM (SELECT DISTINCT kodo_card_id, edition FROM ebay_fr_ed1_raw) s
  JOIN k_cards kc ON kc.id = s.kodo_card_id`;

let n2=0, n2states=0;
const n2done = new Set();
for (const c of distribCards) {
  const rows = await sql`SELECT price FROM ebay_fr_ed1_raw WHERE kodo_card_id=${c.kodo_card_id} AND edition=${c.edition} AND price>0 AND COALESCE(condition_raw,'') NOT IN ('Gradée','Gradee')`;
  let prices = clean(rows.map(r=>Number(r.price)));
  if (prices.length < MIN_ANNONCES) continue;
  const printId = c.kodo_card_id.replace(/^fr-/,'');
  const typed = typedAnchors.get(c.kodo_card_id);
  for (const st of STATES) {
    // Etat reel declare disponible -> l'ancre typee fait foi (le declare prime
    // sur le modele statistique). Sinon percentiles de la distribution (actuel).
    const price = typed ? typed.anchor * DECAY[st] : pct(prices, STATE_PCT[st]);
    if (price > 0) { await upsert(c.kodo_card_id, printId, st, price); n2states++; }
  }
  n2++; n2done.add(c.kodo_card_id);
}

// ── NIVEAU 1 : cartes FR avec un prix d'ancrage mais PAS de distribution ──
// Ancre = AGGREGATED (cardmarket) ou ed1_raw/unl_raw (ebay_fr). L'ancre ≈ état EXCELLENT.
const anchorCards = await sql`
  SELECT DISTINCT pm.kodo_card_id, pm.print_id, pm.spot AS anchor
  FROM price_matrix pm
  WHERE pm.kodo_card_id LIKE 'fr-%' AND pm.market='EU' AND pm.spot > 0
    AND (
      (pm.source='cardmarket' AND pm.tier='AGGREGATED')
      OR (pm.source='ebay_fr' AND pm.variant IN ('ed1_raw','unl_raw'))
    )`;

let n1=0, n1states=0;
for (const c of anchorCards) {
  if (n2done.has(c.kodo_card_id)) continue;   // déjà en Niveau 2 (plus précis)
  const printId = c.print_id || c.kodo_card_id.replace(/^fr-/,'');
  // Etat reel declare -> l'ancre typee remplace le spot arbitrairement suppose
  // EXCELLENT (c'est CE mecanisme qui projetait un NM au-dessus des annonces).
  const typed = typedAnchors.get(c.kodo_card_id);
  const anchor = typed ? typed.anchor : Number(c.anchor);
  if (!(anchor > 0)) continue;
  for (const st of STATES) {
    const price = anchor * DECAY[st];   // ancre = EXCELLENT (×1.0)
    if (price > 0) { await upsert(c.kodo_card_id, printId, st, price); n1states++; }
  }
  n1++;
}

if (COMMIT) await flush();  // dernier paquet partiel
console.log(`=== prix par état -> price_matrix (${COMMIT?'COMMIT':'DRY-RUN'}) ===`);
console.log(`Niveau 2 (percentiles réels) : ${n2} cartes, ${n2states} lignes état`);
console.log(`Niveau 1 (ratios décote FR)  : ${n1} cartes, ${n1states} lignes état`);
console.log(`Total : ${n2+n1} cartes valorisées par état`);
if(!COMMIT) console.log('(DRY-RUN — rien écrit)');

// Aperçu Dracaufeu Éd1
if(COMMIT){
  const p = await sql`SELECT tier, ROUND(spot) spot FROM price_matrix WHERE kodo_card_id='fr-base1-1st-4' AND source='kodo_state' ORDER BY spot DESC`;
  console.log('\nDracaufeu Éd1 par état :');
  p.forEach(x=>console.log(`  ${x.tier.padEnd(18)} ${x.spot}€`));
}
