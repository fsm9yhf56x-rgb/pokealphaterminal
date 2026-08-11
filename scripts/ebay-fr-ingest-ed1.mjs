// scripts/ebay-fr-ingest-ed1.mjs
// Capture les annonces RAW Édition 1 ET Unlimited FR (cartes Wizards multi-édition)
// sur eBay FR -> staging ebay_fr_ed1_raw. Tri chirurgical validé (Éd1 vs Éd2, rejet
// gradé/junk/JP/mauvais numéro). DRY-RUN par défaut, --commit pour écrire.
// Usage: node scripts/ebay-fr-ingest-ed1.mjs [--commit] [--limit=N] [--set=base1]
import { neon } from '@neondatabase/serverless';
import { extractConditionTier } from './lib/ebay-condition.mjs';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');
const LIMIT = Number((process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1]) || 0;
const SET = (process.argv.find(a=>a.startsWith('--set='))||'').split('=')[1] || null;

// Totaux réels par set (lus du catalogue, num max)
const SET_TOTAL = { base1:'102', base2:'64', base3:'62', base5:'82', neo1:'111', neo2:'75', neo3:'64', neo4:'105' };
// Nom commercial du set tel que les vendeurs eBay FR le titrent (le code base2/neo1
// ne veut rien dire pour eux -> il faut "jungle", "neo genesis"...).
const SET_NAME = {
  base1: 'set de base', base2: 'jungle', base3: 'fossile',
  base5: 'team rocket', neo1: 'neo genesis', neo2: 'neo discovery',
  neo3: 'neo revelation', neo4: 'neo destiny',
};

// ── OAuth eBay ──
const tok = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: 'Basic ' + Buffer.from(`${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`).toString('base64') },
  body: 'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
}).then(r => r.json());
if (!tok.access_token) { console.log('Token eBay échec:', JSON.stringify(tok).slice(0,200)); process.exit(1); }

// ── Staging immuable ──
await sql`
  CREATE TABLE IF NOT EXISTS ebay_fr_ed1_raw (
    item_id text PRIMARY KEY,
    kodo_card_id text NOT NULL,
    edition text NOT NULL,            -- 'ed1' | 'unl'
    title text NOT NULL,
    price numeric, currency text,
    card_number text, set_total text,
    is_holo boolean,
    url text,
    fetched_at timestamptz NOT NULL DEFAULT now(),
    first_seen timestamptz, last_seen timestamptz
  )`;

// ── Classificateurs chirurgicaux (validés au test) ──
// \b est defini sur [A-Za-z0-9_] : devant un "e" accentue il n'y a PAS de
// frontiere de mot (espace et "e" sont tous deux non-mot), donc "\b[ee]d" ne
// matchait jamais "edition 1" accentue. Mesure du 11/08 : 1 490 annonces sur
// 28 666 portaient "Edition 1" en clair et partaient dans le bucket Unlimited
// (contre 6 453 correctement classees) -> medianes Unl gonflees par des prix
// Ed1, et Ed1 privees du volume qui leur donne une cote.
// Remplace par (?:^|[^a-z0-9]) en entree et (?![0-9]) en sortie (evite 105, 12...).
const isEd2 = t => /((?:^|[^a-z0-9])[ée]d(?:ition)?\.?\s*2(?![0-9])|(?:^|[^a-z0-9])ed2(?![0-9])|wizards?\s*2|base\s*set\s*2|(?:^|[^a-z0-9])bs2(?![0-9])|unlimited|illimit)/i.test(t);
const isEd1 = t => /((?:^|[^a-z0-9])[ée]d(?:ition)?\.?\s*1(?![0-9])|(?:^|[^a-z0-9])ed1(?![0-9])|1[èe]re?\s*[ée]d|1st\s*ed|premi[èe]re\s*[ée]d)/i.test(t);
const isGraded = t => /\b(psa|cgc|bgs|sgc|ccc|pca|arkeo|grad(é|ée|ed)|slab)\b/i.test(t);
const isJunk = t => /(booster|display|coffret|scell[ée]|sealed|empty|vide|wrapper|lot|playset|bundle|\d+\s*cartes|complet|full\s*set|100%|proxy|fake|custom|orica|jumbo|topps)/i.test(t);
const isJP = t => /\b(jp|jpn|japon|japanese|japonais)\b/i.test(t);
// Cartes ANGLAISES vendues sur eBay FR : meme carte, autre marche, autre prix.
// Il n'existait aucun filtre EN (seul isJP existait) -> 284 annonces anglaises
// dans le staging FR au 11/08, dont une Lugia Ed1 anglaise a 3 800 EUR entree
// dans la mediane de la Lugia FR (n=3). "Chaque prix sur son marche".
// "anglaise(s)" couvre "Carte Pokemon Anglaise", "english"/"eng" les titres
// bilingues. Frontiere en (?:^|[^a-z0-9]) : \b echoue devant un accent.
const isEN = t => /((?:^|[^a-z0-9])(english|anglais|anglaise|anglaises)(?![a-z]))/i.test(t);
const isHolo = t => /(holo|brillant|reverse)/i.test(t);
const hasNum = (t, num, total) => new RegExp(`\\b0*${num}\\s*/\\s*0*${total}\\b`).test(t);
// Version souple : le bon numero (avec un / suivi de chiffres, total quelconque).
const hasNumLoose = (t, num) => new RegExp(`\\b0*${num}\\s*/\\s*\\d`).test(t);

const median = a => { if(!a.length) return null; const s=[...a].sort((x,y)=>x-y); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
const clean = arr => {
  if (arr.length < 2) return arr;
  const med = median(arr);
  let kept = arr.filter(p => p >= 0.30*med);
  if (kept.length < 2) return kept;
  const logs = kept.map(Math.log);
  const lmed = median(logs);
  const mad = median(logs.map(l => Math.abs(l-lmed))) || 0.0001;
  return kept.filter((p,i) => Math.abs(logs[i]-lmed) <= 3*1.4826*mad);
};
const norm = s => (s||'').toLowerCase().replace(/[àâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ûü]/g,'u').replace(/ç/g,'c');
const searchName = nom => norm(nom).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const setOf = id => (id.match(/fr-([a-z0-9]+)-1st-/)||[])[1];

// ── Cartes cibles ──
let where = `kc.lang='fr' AND kc.id LIKE 'fr-%-1st-%' AND SUBSTRING(kc.id FROM 'fr-[a-z0-9]+-1st-([0-9]+)$') ~ '^[0-9]+$'`;
if (SET) where += ` AND kc.id LIKE 'fr-${SET}-1st-%'`;
const cards = await sql.query(`
  SELECT kc.id AS id_1st, kc.name_localized AS nom,
    SUBSTRING(kc.id FROM 'fr-[a-z0-9]+-1st-([0-9]+)$') AS num
  FROM k_cards kc WHERE ${where} ORDER BY kc.id ${LIMIT?`LIMIT ${LIMIT}`:''}`);

let processed=0, capEd1=0, capUnl=0, cardsEd1=0, cardsUnl=0;
for (const c of cards) {
  const set = setOf(c.id_1st);
  const total = SET_TOTAL[set];
  const num = c.num;
  if (!num || !total) continue;
  const idUnl = c.id_1st.replace('-1st-', '-');
  const setLabel = SET_NAME[set] || set;
  const ebayFetch = async (q) => {
    const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=100&filter=deliveryCountry:FR`;
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${tok.access_token}`,
        'X-EBAY-C-MARKETPLACE-ID': 'EBAY_FR', 'X-EBAY-C-ENDUSERCTX': 'contextualLocation=country=FR,zip=75001' } }).then(x=>x.json());
      return r.itemSummaries || [];
    } catch(e) { return null; }
  };

  const ed1=[], unl=[];
  const seen = new Set();

  // Requête 1 : Édition 1 explicite avec numéro/total exact (haute précision)
  const itemsEd1 = await ebayFetch(`${searchName(c.nom)} ${setLabel} edition 1 ${num}/${total}`);
  if (itemsEd1 === null) { console.log(`  ! ${c.id_1st} fetch err (ed1)`); continue; }
  for (const it of itemsEd1) {
    const t = it.title||'', p = it.price ? Number(it.price.value) : 0;
    if (!p || seen.has(it.itemId)) continue;
    if (isGraded(t) || isJunk(t) || isJP(t) || !hasNum(t, num, total)) continue;
    if (isEN(t)) continue;                // carte anglaise = autre marche
    if (isEd1(t) && !isEd2(t)) { ed1.push({it,p}); seen.add(it.itemId); }
  }
  await new Promise(r=>setTimeout(r,250));

  // Requête 1bis : Édition 1 SANS total (élargit) -> beaucoup de vendeurs ne mettent
  // pas le total. hasNumLoose accepte le bon numéro avec total quelconque.
  const itemsEd1b = await ebayFetch(`${searchName(c.nom)} ${setLabel} edition 1`);
  if (itemsEd1b !== null) {
    for (const it of itemsEd1b) {
      const t = it.title||'', p = it.price ? Number(it.price.value) : 0;
      if (!p || seen.has(it.itemId)) continue;
      if (isGraded(t) || isJunk(t) || isJP(t) || !hasNumLoose(t, num)) continue;
      if (isEN(t)) continue;                // carte anglaise = autre marche
    if (isEd1(t) && !isEd2(t)) { ed1.push({it,p}); seen.add(it.itemId); }
    }
    await new Promise(r=>setTimeout(r,250));
  }

  // Requête 2 : Unlimited — recherche sans "edition 1", on garde Éd2 OU sans mention (rejet Éd1)
  const itemsUnl = await ebayFetch(`${searchName(c.nom)} ${setLabel} ${num}/${total}`);
  if (itemsUnl !== null) {
    for (const it of itemsUnl) {
      const t = it.title||'', p = it.price ? Number(it.price.value) : 0;
      if (!p || seen.has(it.itemId)) continue;
      if (isGraded(t) || isJunk(t) || isJP(t) || !hasNum(t, num, total)) continue;
      if (isEN(t)) continue;                // carte anglaise = autre marche
      if (isEd1(t)) continue;               // pas d'Éd1 dans le bucket Unlimited
      // Unlimited = Éd2 explicite OU aucune mention d'édition (version par défaut)
      unl.push({it,p}); seen.add(it.itemId);
    }
  }
  processed++;

  if (COMMIT) {
    // INSERT GROUPE : 1 requete pour toutes les annonces de la carte (avant :
    // 1 INSERT par annonce = des milliers d'allers-retours Neon par run, cause
    // des timeouts a 45/40/50 min trois nuits de suite).
    const b = { item: [], kid: [], ed: [], title: [], price: [], cur: [], num: [], tot: [], holo: [], url: [], cond: [], tier: [], csrc: [] }
    for (const [rows, edition, kid] of [[ed1,'ed1',c.id_1st],[unl,'unl',idUnl]]) {
      for (const {it,p} of rows) {
        b.item.push(it.itemId); b.kid.push(kid); b.ed.push(edition)
        b.title.push(it.title); b.price.push(p); b.cur.push(it.price?.currency||'EUR')
        b.num.push(num); b.tot.push(total); b.holo.push(isHolo(it.title)); b.url.push(it.itemWebUrl||null)
        const cx = extractConditionTier(it.title, it.condition || null)
        b.cond.push(it.condition || null); b.tier.push(cx.tier); b.csrc.push(cx.source ?? 'none')
      }
    }
    if (b.item.length) {
      await sql.query(`INSERT INTO ebay_fr_ed1_raw
        (item_id, kodo_card_id, edition, title, price, currency, card_number, set_total, is_holo, url, condition_raw, condition_tier, condition_source, fetched_at, first_seen, last_seen)
        SELECT x.item, x.kid, x.ed, x.title, x.price, x.cur, x.num, x.tot, x.holo, x.url, x.cond, x.tier, x.csrc, now(), now(), now()
        FROM unnest($1::text[], $2::text[], $3::text[], $4::text[], $5::numeric[],
                    $6::text[], $7::text[], $8::text[], $9::boolean[], $10::text[],
                    $11::text[], $12::text[], $13::text[])
          AS x(item, kid, ed, title, price, cur, num, tot, holo, url, cond, tier, csrc)
        ON CONFLICT (item_id) DO UPDATE SET price=EXCLUDED.price, title=EXCLUDED.title,
          kodo_card_id=EXCLUDED.kodo_card_id, edition=EXCLUDED.edition,
          condition_raw=EXCLUDED.condition_raw, condition_tier=EXCLUDED.condition_tier,
          condition_source=EXCLUDED.condition_source, fetched_at=now(), last_seen=now()`,
        [b.item, b.kid, b.ed, b.title, b.price, b.cur, b.num, b.tot, b.holo, b.url, b.cond, b.tier, b.csrc]);
    }
  }
  if (ed1.length) { capEd1+=ed1.length; cardsEd1++; }
  if (unl.length) { capUnl+=unl.length; cardsUnl++; }
  const medEd1 = median(clean(ed1.map(x=>x.p)));
  const medUnl = median(clean(unl.map(x=>x.p)));
  if (ed1.length>=2 || unl.length>=2) console.log(`  ${c.id_1st.padEnd(18)} ${(c.nom||'').slice(0,16).padEnd(16)} Éd1 n=${ed1.length} med=${medEd1?Math.round(medEd1):'-'}€ | Unl n=${unl.length} med=${medUnl?Math.round(medUnl):'-'}€`);
  await new Promise(r=>setTimeout(r,200));
}

console.log(`\n=== ebay_fr_ed1_raw (${COMMIT?'COMMIT':'DRY-RUN'}) ===`);
console.log(`Cartes traitées : ${processed}`);
console.log(`Éd1 : ${cardsEd1} cartes ont ≥1 annonce (${capEd1} annonces au total)`);
console.log(`Unl : ${cardsUnl} cartes ont ≥1 annonce (${capUnl} annonces au total)`);
if (!COMMIT) console.log('(DRY-RUN — rien écrit. --commit pour peupler.)');
