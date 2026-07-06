// scripts/ebay-fr-ingest-ed1-graded.mjs
// Capture les annonces GRADÉES Éd1 ET Unlimited FR (PSA/CCC/CGC/BGS/SGC/PCA)
// sur eBay FR -> staging ebay_fr_ed1_graded. Tri chirurgical (Éd1 vs Éd2, numéro
// exact, rejet junk/JP). Parse société + note. DRY-RUN par défaut, --commit.
// Usage: node scripts/ebay-fr-ingest-ed1-graded.mjs [--commit] [--set=base1] [--limit=N]
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');
const LIMIT = Number((process.argv.find(a=>a.startsWith('--limit='))||'').split('=')[1]) || 0;
const SET = (process.argv.find(a=>a.startsWith('--set='))||'').split('=')[1] || null;

const SET_TOTAL = { base1:'102', base2:'64', base3:'62', base5:'82', neo1:'111', neo2:'75', neo3:'64', neo4:'105' };
const SET_NAME = { base1:'set de base', base2:'jungle', base3:'fossile', base5:'team rocket',
  neo1:'neo genesis', neo2:'neo discovery', neo3:'neo revelation', neo4:'neo destiny' };

const tok = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
  method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded',
    Authorization:'Basic '+Buffer.from(`${process.env.EBAY_APP_ID}:${process.env.EBAY_CERT_ID}`).toString('base64')},
  body:'grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope',
}).then(r=>r.json());
if(!tok.access_token){ console.log('Token échec'); process.exit(1); }

await sql`
  CREATE TABLE IF NOT EXISTS ebay_fr_ed1_graded (
    item_id text PRIMARY KEY,
    kodo_card_id text NOT NULL,
    edition text NOT NULL,          -- 'ed1' | 'unl'
    company text NOT NULL,          -- PSA|CCC|CGC|BGS|SGC|PCA
    grade numeric NOT NULL,
    tier text NOT NULL,             -- ex PSA_9, CCC_9_5
    title text NOT NULL,
    price numeric, currency text,
    card_number text, set_total text,
    url text,
    fetched_at timestamptz NOT NULL DEFAULT now(), first_seen timestamptz, last_seen timestamptz
  )`;

const isEd2=t=>/(\b[ée]d(ition)?\.?\s*2\b|\bed2\b|wizards?\s*2|base\s*set\s*2|\bbs2\b|unlimited|illimit)/i.test(t);
const isEd1=t=>/(\b[ée]d(ition)?\.?\s*1\b|\bed1\b|1[èe]re?\s*[ée]d|1st\s*ed|premi[èe]re\s*[ée]d)/i.test(t);
const isJunk=t=>/(booster|display|coffret|scell[ée]|sealed|empty|vide|wrapper|lot|playset|bundle|\d+\s*cartes|complet|full\s*set|proxy|fake|custom|orica|jumbo)/i.test(t);
const isJP=t=>/\b(jp|jpn|japon|japanese|japonais)\b/i.test(t);
const hasNum=(t,num,total)=>new RegExp(`\\b0*${num}\\s*/\\s*0*${total}\\b`).test(t);
// Parse société + note. Gère "PSA 9", "9 PSA", "CCC 9.5", "PCA 8"
function parseGrade(raw){
  const t=raw.replace(/(\d),(\d)/g,'$1.$2'), low=t.toLowerCase();
  let m=low.match(/\b(psa|cgc|bgs|sgc|ccc|pca)\s*(10|[1-9](?:\.5)?)\b/)
     || low.match(/\b(10|[1-9](?:\.5)?)\s*(psa|cgc|bgs|sgc|ccc|pca)\b/);
  if(!m) return null;
  const comp=(/[a-z]/.test(m[1])?m[1]:m[2]).toUpperCase();
  const grade=parseFloat(/[a-z]/.test(m[1])?m[2]:m[1]);
  if(!comp||!(grade>0)) return null;
  return { company:comp, grade, tier:`${comp}_${String(grade).replace('.','_')}` };
}

const norm=s=>(s||'').toLowerCase().replace(/[àâä]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ûü]/g,'u').replace(/ç/g,'c');
const searchName=nom=>norm(nom).replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const setOf=id=>(id.match(/fr-([a-z0-9]+)-1st-/)||[])[1];

let where=`kc.lang='fr' AND kc.id LIKE 'fr-%-1st-%' AND SUBSTRING(kc.id FROM 'fr-[a-z0-9]+-1st-([0-9]+)$') ~ '^[0-9]+$'`;
if(SET) where+=` AND kc.id LIKE 'fr-${SET}-1st-%'`;
const cards=await sql.query(`
  SELECT kc.id AS id_1st, kc.name_localized AS nom,
    SUBSTRING(kc.id FROM 'fr-[a-z0-9]+-1st-([0-9]+)$') AS num
  FROM k_cards kc WHERE ${where} ORDER BY kc.id ${LIMIT?`LIMIT ${LIMIT}`:''}`);

const ebayFetch=async q=>{
  const url=`https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(q)}&limit=100&filter=deliveryCountry:FR`;
  try{ const r=await fetch(url,{headers:{Authorization:`Bearer ${tok.access_token}`,'X-EBAY-C-MARKETPLACE-ID':'EBAY_FR','X-EBAY-C-ENDUSERCTX':'contextualLocation=country=FR,zip=75001'}}).then(x=>x.json()); return r.itemSummaries||[]; }
  catch(e){ return null; }
};

let processed=0, capEd1=0, capUnl=0, cardsEd1=new Set(), cardsUnl=new Set();
for(const c of cards){
  const set=setOf(c.id_1st), total=SET_TOTAL[set], num=c.num;
  if(!num||!total) continue;
  const idUnl=c.id_1st.replace('-1st-','-');
  const setLabel=SET_NAME[set]||set;
  const seen=new Set();
  const ed1=[], unl=[];

  // Requête gradé Éd1
  const iEd1=await ebayFetch(`${searchName(c.nom)} ${setLabel} edition 1 gradée ${num}/${total}`);
  if(iEd1===null){ console.log(`  ! ${c.id_1st} err`); continue; }
  for(const it of iEd1){
    const t=it.title||'', p=it.price?Number(it.price.value):0;
    if(!p||seen.has(it.itemId)||isJunk(t)||isJP(t)||!hasNum(t,num,total)) continue;
    if(isEd2(t)||!isEd1(t)) continue;
    const g=parseGrade(t); if(!g) continue;
    ed1.push({it,p,g}); seen.add(it.itemId);
  }
  await new Promise(r=>setTimeout(r,250));

  // Requête gradé Unlimited (sans "edition 1", rejette Éd1)
  const iUnl=await ebayFetch(`${searchName(c.nom)} ${setLabel} gradée ${num}/${total}`);
  if(iUnl!==null){
    for(const it of iUnl){
      const t=it.title||'', p=it.price?Number(it.price.value):0;
      if(!p||seen.has(it.itemId)||isJunk(t)||isJP(t)||!hasNum(t,num,total)) continue;
      if(isEd1(t)) continue;
      const g=parseGrade(t); if(!g) continue;
      unl.push({it,p,g}); seen.add(it.itemId);
    }
    await new Promise(r=>setTimeout(r,250));
  }
  processed++;

  if(COMMIT){
    for(const [rows,edition,kid] of [[ed1,'ed1',c.id_1st],[unl,'unl',idUnl]]){
      for(const {it,p,g} of rows){
        await sql.query(`INSERT INTO ebay_fr_ed1_graded
          (item_id,kodo_card_id,edition,company,grade,tier,title,price,currency,card_number,set_total,url,fetched_at,first_seen,last_seen)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,now(),now(),now())
          ON CONFLICT (item_id) DO UPDATE SET price=EXCLUDED.price,title=EXCLUDED.title,
            kodo_card_id=EXCLUDED.kodo_card_id,edition=EXCLUDED.edition,tier=EXCLUDED.tier,fetched_at=now(),last_seen=now()`,
          [it.itemId,kid,edition,g.company,g.grade,g.tier,it.title,p,it.price?.currency||'EUR',num,total,it.itemWebUrl||null]);
      }
    }
  }
  if(ed1.length){ capEd1+=ed1.length; cardsEd1.add(c.id_1st); }
  if(unl.length){ capUnl+=unl.length; cardsUnl.add(idUnl); }
  if(ed1.length>=1||unl.length>=1){
    const notes=[...new Set(ed1.map(x=>x.g.tier))].slice(0,4).join(',');
    console.log(`  ${c.id_1st.padEnd(18)} ${(c.nom||'').slice(0,14).padEnd(14)} Éd1_gradé=${ed1.length} (${notes}) | Unl_gradé=${unl.length}`);
  }
}
console.log(`\n=== ebay_fr_ed1_graded (${COMMIT?'COMMIT':'DRY-RUN'}) ===`);
console.log(`Traité: ${processed} | Éd1 gradé: ${cardsEd1.size} cartes (${capEd1} annonces) | Unl gradé: ${cardsUnl.size} cartes (${capUnl} annonces)`);
if(!COMMIT) console.log('(DRY-RUN — rien écrit)');
