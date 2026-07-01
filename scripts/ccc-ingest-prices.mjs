// scripts/ccc-ingest-prices.mjs
// Capture les annonces CCC sur eBay FR -> staging immuable ccc_price_raw.
// Parse robuste (virgule FR 9,5 -> 9.5, Black/Gold, lots, JP, exclusions).
// N'ECRIT RIEN dans price_matrix : c'est du staging. Le matcher viendra apres.
import fs from 'fs';
import { neon } from '@neondatabase/serverless';

function envFromFile(p){const o={};try{for(const l of fs.readFileSync(p,'utf8').split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/);if(m)o[m[1]]=m[2].replace(/^"/,'').replace(/"$/,'');}}catch{}return o;}
const env = envFromFile('.env.production.local');
const ID = env.EBAY_APP_ID || process.env.EBAY_APP_ID, SEC = env.EBAY_CERT_ID || process.env.EBAY_CERT_ID;
const sql = neon(env.DATABASE_URL || process.env.DATABASE_URL);

if(!ID || !SEC){ console.log('EBAY_APP_ID / EBAY_CERT_ID introuvables.'); process.exit(1); }

const basic = Buffer.from(`${ID}:${SEC}`).toString('base64');
const tok = await fetch('https://api.ebay.com/identity/v1/oauth2/token',{
  method:'POST',
  headers:{ Authorization:`Basic ${basic}`, 'Content-Type':'application/x-www-form-urlencoded' },
  body:'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
}).then(r=>r.json());
if(!tok.access_token){ console.log('Token eBay echec :', JSON.stringify(tok).slice(0,200)); process.exit(1); }

await sql.query(`CREATE TABLE IF NOT EXISTS ccc_price_raw (
  item_id text PRIMARY KEY, title text NOT NULL, price numeric, currency text,
  grade_num numeric, grade_label text, tier text,
  card_number text, set_total text, lang text DEFAULT 'FR',
  variant_hint text, edition_hint text,
  is_lot boolean DEFAULT false, excluded boolean DEFAULT false, exclude_reason text,
  url text, fetched_at timestamptz NOT NULL DEFAULT now())`);
// Colonnes de cycle de vie d'annonce (pour la fenetre glissante future) :
// first_seen = gravee a la 1ere capture (jamais modifiee) ; last_seen = MAJ a chaque vue.
await sql.query(`ALTER TABLE ccc_price_raw ADD COLUMN IF NOT EXISTS first_seen timestamptz`);
await sql.query(`ALTER TABLE ccc_price_raw ADD COLUMN IF NOT EXISTS last_seen timestamptz`);
// Backfill unique : les lignes pre-existantes prennent fetched_at comme reference de depart.
await sql.query(`UPDATE ccc_price_raw SET first_seen=fetched_at WHERE first_seen IS NULL`);
await sql.query(`UPDATE ccc_price_raw SET last_seen=fetched_at WHERE last_seen IS NULL`);

// ── Parseurs ──────────────────────────────────────────────────────────────────
const norm = (t) => t.replace(/(\d),(\d)/g, '$1.$2');               // 9,5 -> 9.5

function parseGrade(raw){
  const t = norm(raw), low = t.toLowerCase();
  const isBlack = /black\s*label|label\s*black|10\s*black|black\s*10|ccc\s*black|black\s*ccc/i.test(t);
  const isGold  = /gold\s*label|label\s*gold|10\s*gold|gold\s*10|ccc\s*gold|gold\s*ccc/i.test(t);
  let m = low.match(/ccc[^0-9a-z]{0,16}(10|[1-9](?:\.5)?)\b/)
       || low.match(/\b(10|[1-9](?:\.5)?)[^0-9a-z]{0,10}ccc\b/)
       || low.match(/grad[eé]+e?[^0-9]{0,16}(10|[1-9](?:\.5)?)\b/)
       || low.match(/\bnote\b[^0-9]{0,12}(?:de\s+)?(10|[1-9](?:\.5)?)\b/);
  let num = m ? parseFloat(m[1]) : null;
  if((isBlack || isGold) && (num == null || num === 10)) num = 10;
  if(num == null) return { num:null, label:null, tier:null };
  let label = String(num), suffix = '';
  if(num === 10 && isBlack){ label = '10_BLACK'; suffix = '_BLACK'; }
  else if(num === 10 && isGold){ label = '10_GOLD'; suffix = '_GOLD'; }
  return { num, label, tier:`CCC_${String(num).replace('.', '_')}${suffix}` };
}
function parseNumber(raw){
  const m = raw.match(/(\d{1,3})\s*\/\s*([A-Za-z]{0,3}\d{1,3}|\d{1,3})/);
  if(m) return { num:String(parseInt(m[1],10)), total:String(m[2]).toUpperCase() };
  const p = raw.match(/\b(MEP|SVP|SWSHP?|SMP?|XYP?|HGSS|BWP?|DPP?|SV-?P)\s*0*(\d{1,3})\b/i);
  if(p) return { num:String(parseInt(p[2],10)), total:p[1].toUpperCase() };
  return { num:null, total:null };
}
function variantHint(raw){
  const h=[];
  if(/reverse/i.test(raw)) h.push('reverse');
  if(/\bSAR\b/i.test(raw)) h.push('SAR'); else if(/\bAR\b/i.test(raw)) h.push('AR');
  if(/\bCHR\b/i.test(raw)) h.push('CHR');
  if(/full\s*art|\bFA\b/i.test(raw)) h.push('FA');
  if(/\balt\b|alternative/i.test(raw)) h.push('alt');
  return h.join(',') || null;
}
function parseListing(it){
  const raw = it.title || '';
  const g = parseGrade(raw), n = parseNumber(raw);
  const lang = /\b(jp|jpn|japon|japanese)\b/i.test(raw) ? 'JP' : 'FR';
  const edition_hint = /(édition\s*1|edition\s*1|1[èe]?re?\s*[ée]d|1st|wizards)/i.test(raw) ? '1st' : null;
  const is_lot = /\b(lot|playset|bundle|\d+\s*cartes|jeu\s*de\s*\d)\b/i.test(raw) || /\bx\s*[2-9]\b/i.test(raw);
  let excluded = false, reason = null;
  if(/myst[èe]re|mystery|pack\s*surprise/i.test(raw)){ excluded = true; reason = 'mystery'; }
  else if(g.num == null){ excluded = true; reason = 'no_grade'; }
  else if(n.num == null){ excluded = true; reason = 'no_number'; }
  return {
    item_id: it.itemId, title: raw,
    price: it.price ? Number(it.price.value) : null,
    currency: it.price ? it.price.currency : null,
    grade_num: g.num, grade_label: g.label, tier: g.tier,
    card_number: n.num, set_total: n.total, lang,
    variant_hint: variantHint(raw), edition_hint,
    is_lot, excluded, exclude_reason: reason,
    url: it.itemWebUrl || null,
  };
}

// ── Capture paginee ───────────────────────────────────────────────────────────
const Q = 'CCC pokemon gradée';
let captured = 0;
for(const off of [0,200,400,600,800,1000]){
  const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(Q)}&limit=200&offset=${off}`;
  const r = await fetch(url,{ headers:{ Authorization:`Bearer ${tok.access_token}`, 'X-EBAY-C-MARKETPLACE-ID':'EBAY_FR' }}).then(x=>x.json());
  const items = r.itemSummaries || [];
  if(!items.length) break;
  for(const it of items){
    if(!it.itemId) continue;
    const row = parseListing(it);
    await sql.query(`INSERT INTO ccc_price_raw
      (item_id,title,price,currency,grade_num,grade_label,tier,card_number,set_total,lang,variant_hint,edition_hint,is_lot,excluded,exclude_reason,url,fetched_at,first_seen,last_seen)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now(),now(),now())
      ON CONFLICT (item_id) DO UPDATE SET
        price=EXCLUDED.price, currency=EXCLUDED.currency, grade_num=EXCLUDED.grade_num,
        grade_label=EXCLUDED.grade_label, tier=EXCLUDED.tier, card_number=EXCLUDED.card_number,
        set_total=EXCLUDED.set_total, lang=EXCLUDED.lang, variant_hint=EXCLUDED.variant_hint,
        edition_hint=EXCLUDED.edition_hint, is_lot=EXCLUDED.is_lot, excluded=EXCLUDED.excluded,
        exclude_reason=EXCLUDED.exclude_reason, url=EXCLUDED.url, fetched_at=now(), last_seen=now()`,
      [row.item_id,row.title,row.price,row.currency,row.grade_num,row.grade_label,row.tier,
       row.card_number,row.set_total,row.lang,row.variant_hint,row.edition_hint,
       row.is_lot,row.excluded,row.exclude_reason,row.url]);
    captured++;
  }
}

// ── Stats ─────────────────────────────────────────────────────────────────────
const q = async (t) => { const r = await sql.query(t); return Array.isArray(r) ? r : (r.rows || []); };
const s = (await q(`SELECT
  COUNT(*)::int total,
  COUNT(*) FILTER (WHERE grade_num IS NOT NULL)::int with_grade,
  COUNT(*) FILTER (WHERE card_number IS NOT NULL)::int with_number,
  COUNT(*) FILTER (WHERE lang='FR')::int fr,
  COUNT(*) FILTER (WHERE lang='JP')::int jp,
  COUNT(*) FILTER (WHERE is_lot)::int lots,
  COUNT(*) FILTER (WHERE excluded)::int excluded,
  COUNT(*) FILTER (WHERE NOT excluded AND NOT is_lot AND lang='FR')::int matchable
  FROM ccc_price_raw`))[0];
console.log(`\n=== ccc_price_raw (capture: ${captured}) ===`);
console.log(s);
console.log('\n=== Repartition par grade (FR, matchable) ===');
for(const r of await q(`SELECT tier, COUNT(*)::int n, ROUND(AVG(price))::int prix_moy_ask
  FROM ccc_price_raw WHERE NOT excluded AND NOT is_lot AND lang='FR'
  GROUP BY tier ORDER BY n DESC`)) console.log(` ${String(r.tier).padEnd(14)} ${String(r.n).padStart(4)}  ~${r.prix_moy_ask} EUR (ask)`);
console.log("\n=== Motifs d exclusion ===");
for(const r of await q(`SELECT exclude_reason, COUNT(*)::int n FROM ccc_price_raw WHERE excluded GROUP BY exclude_reason ORDER BY n DESC`)) console.log(` ${String(r.exclude_reason).padEnd(12)} ${r.n}`);
