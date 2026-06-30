// Ingestion scellé EN (TCGplayer/US) + JP via PokemonPriceTracker — v4.
// PPT facture le `limit` (pas le count) -> on demande limit = nb de produits connu du set (cout = count).
// Prix = unopenedPrice (USD). Resumable, ecrit set par set, saute les sets frais ET deja price-es.
// Auto-heal : un set sans prix (ancien run) n'est PAS considere frais -> re-telecharge.
// Garde-fous : SEALED_DAILY_FLOOR (credits), SEALED_MAX_MINUTES (temps mur, pour le timeout Actions).
// Tables : k_sealed_products + sealed_prices + sealed_price_history (+ etat sealed_sync_state).
// FR (Cardmarket) = source separee, non couverte ici.
//
// Env : SEALED_DAILY_FLOOR(1000) | SEALED_REFRESH_HOURS(168=hebdo) | SEALED_SLEEP_MS(1200)
//       SEALED_MAX_MINUTES(50) | SEALED_DISCOVERY_LIMIT(40, limit des sets encore inconnus)
import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
const PPT_KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;
if (!DB_URL || !PPT_KEY) { console.error('Manque DATABASE_URL ou POKEMON_PRICE_TRACKER_API_KEY'); process.exit(1); }
const sql = neon(DB_URL);

const API = 'https://www.pokemonpricetracker.com/api/v2';
const LANGS = ['english', 'japanese'];
const SLEEP_MS = Number(process.env.SEALED_SLEEP_MS || 1200);
const FLOOR = Number(process.env.SEALED_DAILY_FLOOR || 1000);
const REFRESH_HOURS = Number(process.env.SEALED_REFRESH_HOURS || 168);
const DISCOVERY_LIMIT = Number(process.env.SEALED_DISCOVERY_LIMIT || 40);
const MAX_MS = Number(process.env.SEALED_MAX_MINUTES || 50) * 60000;
const TODAY = new Date().toISOString().slice(0, 10);
const START = Date.now();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : null; };
const eur = (usd, fx) => (usd != null ? Math.round(usd * fx * 100) / 100 : null);
const langCode = (l) => (l === 'japanese' ? 'jp' : 'en');
const langParam = (l) => (l === 'japanese' ? { language: 'japanese' } : {});
const chunk = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };

class StopRun extends Error {}
let lastDailyRemaining = Infinity;
let lastDailyReset = null;

function productType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('elite trainer')) return 'Elite Trainer Box';
  if (n.includes('booster box')) return 'Booster Box';
  if (n.includes('booster bundle')) return 'Booster Bundle';
  if (n.includes('build') && n.includes('battle')) return 'Build & Battle';
  if (n.includes('premium collection')) return 'Premium Collection';
  if (n.includes('collection')) return 'Collection';
  if (n.includes('blister')) return 'Blister';
  if (n.includes('tin')) return 'Tin';
  if (n.includes('booster') || n.includes('pack')) return 'Booster Pack';
  if (n.includes('deck')) return 'Deck';
  if (n.includes('case')) return 'Case';
  if (n.includes('box')) return 'Box';
  return null;
}

async function pptGet(path, params, tries = 0) {
  const url = `${API}/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${PPT_KEY}` } });
  const daily = Number(res.headers.get('x-ratelimit-daily-remaining'));
  if (Number.isFinite(daily)) lastDailyRemaining = daily;
  const dReset = Number(res.headers.get('x-ratelimit-daily-reset'));
  if (Number.isFinite(dReset)) lastDailyReset = dReset;

  if (res.status === 429) {
    if (daily === 0) { const e = new StopRun('quota journalier epuise'); e.reset = dReset; throw e; }
    if (tries < 6) {
      const mReset = Number(res.headers.get('x-ratelimit-minute-reset'));
      let wait = Number(res.headers.get('retry-after')) * 1000;
      if (!Number.isFinite(wait) || wait <= 0) wait = Number.isFinite(mReset) ? (mReset * 1000 - Date.now()) : 5000;
      wait = Math.min(Math.max(wait, 1000), 65000);
      console.warn(`429 minute -> attente ${Math.round(wait / 1000)}s`);
      await sleep(wait); return pptGet(path, params, tries + 1);
    }
  }
  if (!res.ok) { const e = new Error(`PPT ${res.status} (${url})`); e.status = res.status; throw e; }

  const mRem = Number(res.headers.get('x-ratelimit-minute-remaining'));
  const mReset = Number(res.headers.get('x-ratelimit-minute-reset'));
  if (Number.isFinite(mRem) && mRem <= 4 && Number.isFinite(mReset)) {
    const w = Math.min(Math.max(mReset * 1000 - Date.now() + 500, 0), 65000);
    if (w > 0) { console.warn(`minute pleine -> pause ${Math.round(w / 1000)}s`); await sleep(w); }
  }
  return res.json();
}

function mapItem(it, lang) {
  const tpid = String(it.tcgPlayerId ?? it.tcgplayerId ?? it.id ?? '');
  if (!tpid) return null;
  const lc = langCode(lang);
  return {
    id: `${lc}-${tpid}`, tcgplayer_id: tpid, lang: lc,
    name: it.name ?? '(sans nom)',
    set_name: it.setName ?? null,
    set_id: it.setId != null ? String(it.setId) : null,
    product_type: productType(it.name),
    image_url: it.imageCdnUrl400 ?? it.imageUrl ?? it.imageCdnUrl ?? it.imageCdnUrl200 ?? null,
    market_usd: num(it.unopenedPrice ?? it.marketPrice ?? it.price),
    low_usd: null,
    sellers: null,
    as_of: it.lastScrapedAt ?? it.updatedAt ?? null,
  };
}

async function fetchSets(lang) {
  const sets = [];
  for (let page = 0, offset = 0; page < 100; page++, offset += 100) {
    const data = await pptGet('sets', { ...langParam(lang), limit: '100', offset: String(offset) });
    const items = Array.isArray(data?.data) ? data.data : [];
    for (const s of items) {
      const id = s.id ?? s.setId ?? s.code ?? s.slug;
      const slug = s.slug ?? s.id ?? s.code;
      if (id) sets.push({ id: String(id), slug: String(slug) });
    }
    const hasMore = data?.metadata?.hasMore ?? (items.length === 100);
    if (!hasMore || items.length === 0) break;
    await sleep(SLEEP_MS);
  }
  return sets;
}

let SEALED_PARAM = 'setId';
async function fetchSealedForSet(set, lang, knownCount) {
  const lim = knownCount && knownCount > 0 ? Math.min(knownCount + 5, 100) : DISCOVERY_LIMIT;
  const out = [];
  for (let page = 0, offset = 0; page < 50; page++, offset += lim) {
    const val = SEALED_PARAM === 'setId' ? set.id : set.slug;
    let data;
    try {
      data = await pptGet('sealed-products', { [SEALED_PARAM]: val, ...langParam(lang), limit: String(lim), offset: String(offset) });
    } catch (e) {
      if (SEALED_PARAM === 'setId' && e.status === 400) {
        SEALED_PARAM = 'set'; console.warn("setId rejete -> 'set'");
        data = await pptGet('sealed-products', { set: set.slug, ...langParam(lang), limit: String(lim), offset: String(offset) });
      } else { throw e; }
    }
    const items = Array.isArray(data?.data) ? data.data : [];
    for (const it of items) { const m = mapItem(it, lang); if (m) out.push(m); }
    const hasMore = data?.metadata?.hasMore ?? (items.length === lim);
    if (!hasMore || items.length === 0) break;
    await sleep(SLEEP_MS);
  }
  return out;
}

async function getFx() {
  const r = await sql.query(`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1`);
  const rate = num(r?.[0]?.rate);
  if (!rate) throw new Error('Taux USD->EUR introuvable (fx_rates)');
  return rate;
}

async function batchUpsert(table, cols, rows, onConflict) {
  for (const c of chunk(rows, 500)) {
    const params = [];
    const tuples = c.map((row) => '(' + cols.map((col) => '$' + params.push(row[col])).join(',') + ')').join(',');
    await sql.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${tuples} ${onConflict}`, params);
  }
}

async function writeRows(rows, fx) {
  const catalog = rows.map((x) => ({ id: x.id, tcgplayer_id: x.tcgplayer_id, lang: x.lang, name: x.name, set_name: x.set_name, set_id: x.set_id, product_type: x.product_type, image_url: x.image_url }));
  const prices = rows.map((x) => ({ sealed_id: x.id, market_eur: eur(x.market_usd, fx), low_eur: eur(x.low_usd, fx), market_usd: x.market_usd, low_usd: x.low_usd, currency_src: 'USD', sellers: x.sellers, as_of: x.as_of }));
  const history = rows.map((x) => ({ sealed_id: x.id, snapshot_date: TODAY, market_eur: eur(x.market_usd, fx), low_eur: eur(x.low_usd, fx), market_usd: x.market_usd, sellers: x.sellers }));
  await batchUpsert('k_sealed_products',
    ['id', 'tcgplayer_id', 'lang', 'name', 'set_name', 'set_id', 'product_type', 'image_url'], catalog,
    `ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, set_name=EXCLUDED.set_name, set_id=EXCLUDED.set_id, product_type=EXCLUDED.product_type, image_url=COALESCE(EXCLUDED.image_url, k_sealed_products.image_url), updated_at=now()`);
  await batchUpsert('sealed_prices',
    ['sealed_id', 'market_eur', 'low_eur', 'market_usd', 'low_usd', 'currency_src', 'sellers', 'as_of'], prices,
    `ON CONFLICT (sealed_id) DO UPDATE SET market_eur=EXCLUDED.market_eur, low_eur=EXCLUDED.low_eur, market_usd=EXCLUDED.market_usd, low_usd=EXCLUDED.low_usd, currency_src=EXCLUDED.currency_src, sellers=EXCLUDED.sellers, as_of=EXCLUDED.as_of, computed_at=now()`);
  await batchUpsert('sealed_price_history',
    ['sealed_id', 'snapshot_date', 'market_eur', 'low_eur', 'market_usd', 'sellers'], history,
    `ON CONFLICT (sealed_id, snapshot_date) DO UPDATE SET market_eur=EXCLUDED.market_eur, low_eur=EXCLUDED.low_eur, market_usd=EXCLUDED.market_usd, sellers=EXCLUDED.sellers`);
}

async function ensureState() {
  await sql.query(`CREATE TABLE IF NOT EXISTS sealed_sync_state (set_id text NOT NULL, lang text NOT NULL, synced_at timestamptz NOT NULL DEFAULT now(), product_count integer NOT NULL DEFAULT 0, priced boolean NOT NULL DEFAULT false, PRIMARY KEY (set_id, lang))`);
  await sql.query(`ALTER TABLE sealed_sync_state ADD COLUMN IF NOT EXISTS priced boolean NOT NULL DEFAULT false`);
}
async function loadState(lang) {
  const r = await sql.query(`SELECT set_id, synced_at, product_count, priced FROM sealed_sync_state WHERE lang=$1`, [langCode(lang)]);
  return new Map((r || []).map((x) => [x.set_id, { ts: new Date(x.synced_at).getTime(), count: Number(x.product_count) || 0, priced: x.priced === true }]));
}
async function markSynced(setId, lc, n, priced) {
  await sql.query(`INSERT INTO sealed_sync_state (set_id, lang, synced_at, product_count, priced) VALUES ($1,$2,now(),$3,$4) ON CONFLICT (set_id, lang) DO UPDATE SET synced_at=now(), product_count=EXCLUDED.product_count, priced=EXCLUDED.priced`, [setId, lc, n, priced]);
}

(async () => {
  await ensureState();
  const fx = await getFx();
  console.log(`FX USD->EUR = ${fx} | floor=${FLOOR} | refresh=${REFRESH_HOURS}h | maxMin=${MAX_MS / 60000}`);
  let done = 0, skipped = 0, prod = 0;
  try {
    for (const lang of LANGS) {
      const sets = await fetchSets(lang);
      const state = await loadState(lang);
      console.log(`[${lang}] ${sets.length} sets (${state.size} en base)`);
      let i = 0;
      for (const set of sets) {
        i++;
        if (lastDailyRemaining <= FLOOR) throw new StopRun('floor');
        if (Date.now() - START > MAX_MS) throw new StopRun('temps max');
        const st = state.get(set.id);
        if (st && (Date.now() - st.ts) / 3600000 < REFRESH_HOURS && (st.count === 0 || st.priced)) { skipped++; continue; }
        const rows = await fetchSealedForSet(set, lang, st ? st.count : 0);
        if (rows.length) await writeRows(rows, fx);
        const priced = rows.some((r) => r.market_usd != null);
        await markSynced(set.id, langCode(lang), rows.length, priced);
        done++; prod += rows.length;
        if (rows.length) console.log(`[${lang}] ${i}/${sets.length} ${set.id} +${rows.length} (credits ~${lastDailyRemaining})`);
      }
    }
    console.log(`\nTermine ce run. Sets traites: ${done}, sautes: ${skipped}, produits: ${prod}.`);
  } catch (e) {
    if (e instanceof StopRun) {
      const ts = e.reset ?? lastDailyReset;
      const reset = ts ? new Date(ts * 1000).toISOString() : '(prochain reset UTC)';
      console.warn(`\n[STOP: ${e.message}] Donnees ecrites set par set. Ce run: ${done} sets, ${prod} produits. Reset quota: ${reset}. Le prochain run reprend ou ca s'est arrete.`);
    } else { throw e; }
  }
  const tot = await sql.query(`SELECT count(*)::int AS n, count(sp.market_eur)::int AS withp FROM k_sealed_products kp LEFT JOIN sealed_prices sp ON sp.sealed_id = kp.id`);
  console.log(`Base scellé totale: ${tot?.[0]?.n ?? 0} produits, ${tot?.[0]?.withp ?? 0} avec prix.`);
})().catch((e) => { console.error(e); process.exit(1); });
