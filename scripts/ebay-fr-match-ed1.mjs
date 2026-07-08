// scripts/ebay-fr-match-ed1.mjs
// Lit ebay_fr_ed1_raw -> médiane + garde-fous -> price_matrix.
// Éd1 -> fr-{set}-1st-N (variant ed1_raw) | Unlimited -> fr-{set}-N (variant unl_raw)
// source='ebay_fr', tier='AGGREGATED', market='EU', is_asking=true.
// Garde-fous : n>=MIN_N, floor 30% médiane, MAD log, sanity Éd1 >= Unl.
// DRY-RUN par défaut, --commit pour écrire.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');
const MIN_N = 2;

const median = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const clean = arr => {
  if (arr.length < 2) return arr;
  const med = median(arr);
  let kept = arr.filter(p => p >= 0.30*med);       // floor : écarte les cassées/erreurs
  if (kept.length < 2) return kept;
  const logs = kept.map(Math.log);
  const lmed = median(logs);
  const mad = median(logs.map(l => Math.abs(l-lmed))) || 0.0001;
  return kept.filter((p,i) => Math.abs(logs[i]-lmed) <= 3*1.4826*mad);  // MAD : écarte extrêmes
};

// Agrège le staging par (kodo_card_id, edition)
const rows = await sql`
  SELECT kodo_card_id, edition, price, is_holo, card_number, set_total
  FROM ebay_fr_ed1_raw WHERE price > 0`;

// group: key = kodo_card_id|edition -> { prices:[], base1st, num, total }
const groups = new Map();
for (const r of rows) {
  const k = `${r.kodo_card_id}|${r.edition}`;
  if (!groups.has(k)) groups.set(k, { kid: r.kodo_card_id, edition: r.edition, prices: [], num: r.card_number, total: r.set_total });
  groups.get(k).prices.push(Number(r.price));
}

// Calcule médiane nettoyée par groupe
const results = new Map(); // kid -> { ed1:med|null, unl:med|null, nEd1, nUnl }
for (const g of groups.values()) {
  const kept = clean(g.prices);
  const med = kept.length >= 1 ? median(kept) : null;  // médiane dès n=1 ; n=1 filtré à l'écriture (ratio Éd1/Unl)
  const baseKid = g.edition === 'ed1' ? g.kid.replace('-1st-','-') : g.kid; // clé commune pour apparier
  if (!results.has(baseKid)) results.set(baseKid, { ed1:null, unl:null, nEd1:0, nUnl:0, id1st:null });
  const R = results.get(baseKid);
  if (g.edition === 'ed1') { R.ed1 = med; R.nEd1 = kept.length; R.id1st = g.kid; }
  else { R.unl = med; R.nUnl = kept.length; }
}

// Écriture + garde-fou sanity Éd1 >= Unl
let wEd1=0, wUnl=0, rejSanity=0;
const upsert = async (kid, variant, med, n) => {
  if (!COMMIT) return;
  const printId = kid.replace(/^fr-/, '');
  await sql.query(`INSERT INTO price_matrix
    (kodo_card_id, market, tier, source, variant, spot, avg30d, median30d, sale_count, currency, is_asking, as_of, print_id)
    VALUES ($1,'EU','AGGREGATED','ebay_fr',$2,$3,$3,$3,$4,'EUR',true,now(),$5)
    ON CONFLICT (kodo_card_id, market, tier, source, variant) DO UPDATE SET
      spot=EXCLUDED.spot, avg30d=EXCLUDED.avg30d, median30d=EXCLUDED.median30d,
      sale_count=EXCLUDED.sale_count, is_asking=true, as_of=now()`,
    [kid, variant, Math.round(med*100)/100, n, printId]);
};

for (const [baseKid, R] of results) {
  const id1st = R.id1st || baseKid.replace(/^(fr-[a-z0-9]+)-/, '$1-1st-');
  // Sanity Éd1 >= Unl : appliqué SEULEMENT aux faibles échantillons (n<4).
  // Avec n>=4, le MAD a déjà nettoyé les outliers -> un Éd1 < Unl est une réalité
  // de marché (certaines cartes Fossile/communes : Unlimited plus demandé que l'Éd1),
  // pas un mismatch. Tolérance 15% même à faible n (les prix se croisent souvent).
  let ed1ok = R.ed1 != null;
  if (R.ed1 != null) {
    if (R.nEd1 === 1) {
      // n=1 : accepté seulement si prix cohérent vs Unl (1x a 15x). Sur les cartes
      // 1st rares, une annonce fiable vaut mieux que pas de prix. Ratio hors bornes
      // = mismatch probable -> rejeté.
      if (R.unl == null || R.ed1 < R.unl || R.ed1 > R.unl * 15) { ed1ok = false; rejSanity++; }
    } else if (R.unl != null && R.nEd1 < 4 && R.ed1 < R.unl * 0.85) {
      // n=2-3 : sanity assoupli (tolérance 15%).
      ed1ok = false; rejSanity++;
    }
  }

  if (ed1ok && R.ed1 != null) { await upsert(id1st, 'ed1_raw', R.ed1, R.nEd1); wEd1++; }
  if (R.unl != null)          { await upsert(baseKid, 'unl_raw', R.unl, R.nUnl); wUnl++; }
}

console.log(`=== match Éd1/Unlimited -> price_matrix (${COMMIT?'COMMIT':'DRY-RUN'}) ===`);
console.log(`Éd1 écrits    : ${wEd1} cartes (variant ed1_raw, sur id -1st-)`);
console.log(`Unlimited     : ${wUnl} cartes (variant unl_raw, sur id normal)`);
console.log(`Rejets sanity : ${rejSanity} (Éd1 < Unl = match Éd1 douteux, Unl gardé seul)`);
if (!COMMIT) console.log('(DRY-RUN — rien écrit. --commit pour écrire dans price_matrix.)');

// Aperçu top valeur
console.log('\nAperçu (cartes avec Éd1 >= 100€) :');
const preview = [...results.entries()].filter(([,R])=>R.ed1>=100).sort((a,b)=>b[1].ed1-a[1].ed1).slice(0,15);
for (const [baseKid, R] of preview) {
  console.log(`  ${baseKid.padEnd(16)} Éd1=${Math.round(R.ed1)}€ (n${R.nEd1}) | Unl=${R.unl?Math.round(R.unl)+'€ (n'+R.nUnl+')':'—'}`);
}
