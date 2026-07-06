// scripts/ebay-fr-match-ed1-graded.mjs
// Lit ebay_fr_ed1_graded -> médiane par (carte, édition, note) + garde-fous -> price_matrix.
// Éd1 gradé -> fr-{set}-1st-N (tier PSA_9...) | Unl gradé -> fr-{set}-N.
// Garde-fous : n>=MIN_N par note, floor 30%, MAD log (écarte 149000€), monotonie/société.
// NE SUPPRIME RIEN : les prix cardmarket pollués restent en base mais seront masqués
// à l'affichage (préférence ebay_fr, gérée dans l'Engine/spotlight).
// DRY-RUN par défaut, --commit.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');
const MIN_N = 2;

const median=a=>{if(!a.length)return null;const s=[...a].sort((x,y)=>x-y);const m=s.length>>1;return s.length%2?s[m]:(s[m-1]+s[m])/2;};
const clean=arr=>{
  if(arr.length<2)return arr;
  const med=median(arr);
  let kept=arr.filter(p=>p>=0.30*med);
  if(kept.length<2)return kept;
  const logs=kept.map(Math.log), lmed=median(logs);
  const mad=median(logs.map(l=>Math.abs(l-lmed)))||0.0001;
  return kept.filter((p,i)=>Math.abs(logs[i]-lmed)<=3*1.4826*mad);
};
const gradeOf=tier=>{const m=String(tier).match(/_(\d+)(?:_(\d))?$/);return m?Number(m[1])+(m[2]?Number(m[2])/10:0):0;};

const rows=await sql`SELECT kodo_card_id, edition, company, tier, price FROM ebay_fr_ed1_graded WHERE price>0`;

const groups=new Map();
for(const r of rows){
  const k=`${r.kodo_card_id}|${r.edition}|${r.tier}`;
  if(!groups.has(k)) groups.set(k,{kid:r.kodo_card_id,edition:r.edition,tier:r.tier,company:r.company,prices:[]});
  groups.get(k).prices.push(Number(r.price));
}

const perCard=new Map();
for(const g of groups.values()){
  const kept=clean(g.prices);
  if(kept.length<MIN_N) continue;
  const med=median(kept);
  const ck=`${g.kid}|${g.edition}`;
  if(!perCard.has(ck)) perCard.set(ck,[]);
  perCard.get(ck).push({tier:g.tier,company:g.company,grade:gradeOf(g.tier),med,n:kept.length});
}

let removedMono=0;
for(const list of perCard.values()){
  const byComp={};
  for(const e of list){ (byComp[e.company]=byComp[e.company]||[]).push(e); }
  for(const comp in byComp){
    const arr=byComp[comp].sort((a,b)=>a.grade-b.grade);
    for(let i=1;i<arr.length;i++){
      if(arr[i].med < arr[i-1].med*0.9){ arr[i]._drop=true; removedMono++; }
    }
  }
}

let wEd1=0,wUnl=0;
const upsert=async(kid,tier,med,n)=>{
  if(!COMMIT)return;
  const printId=kid.replace(/^fr-/,'');
  await sql.query(`INSERT INTO price_matrix
    (kodo_card_id,market,tier,source,variant,spot,avg30d,median30d,sale_count,currency,is_asking,as_of,print_id)
    VALUES ($1,'EU',$2,'ebay_fr',$3,$4,$4,$4,$5,'EUR',true,now(),$6)
    ON CONFLICT (kodo_card_id,market,tier,source,variant) DO UPDATE SET
      spot=EXCLUDED.spot,avg30d=EXCLUDED.avg30d,median30d=EXCLUDED.median30d,sale_count=EXCLUDED.sale_count,is_asking=true,as_of=now()`,
    [kid,tier,tier.toLowerCase(),Math.round(med*100)/100,n,printId]);
};

for(const [ck,list] of perCard){
  const [kid,edition]=ck.split('|');
  for(const e of list){
    if(e._drop) continue;
    await upsert(kid,e.tier,e.med,e.n);
    if(edition==='ed1') wEd1++; else wUnl++;
  }
}

console.log(`=== match gradé Éd1/Unl -> price_matrix (${COMMIT?'COMMIT':'DRY-RUN'}) ===`);
console.log(`Éd1 gradé écrits : ${wEd1} notes | Unl gradé : ${wUnl} notes`);
console.log(`Monotonie: ${removedMono} notes aberrantes retirées`);

console.log('\nAperçu Dracaufeu Éd1 gradé :');
const prev=[...perCard.entries()].filter(([k])=>k.startsWith('fr-base1-1st-4|ed1'));
for(const [ck,list] of prev){
  list.sort((a,b)=>a.grade-b.grade).forEach(e=>console.log(`  ${e.tier.padEnd(10)} ${Math.round(e.med)}€ (n${e.n})${e._drop?' [DROP mono]':''}`));
}
console.log('\nAperçu Dracaufeu Unlimited gradé :');
const prevU=[...perCard.entries()].filter(([k])=>k.startsWith('fr-base1-4|unl'));
for(const [ck,list] of prevU){
  list.sort((a,b)=>a.grade-b.grade).forEach(e=>console.log(`  ${e.tier.padEnd(10)} ${Math.round(e.med)}€ (n${e.n})`));
}
if(!COMMIT) console.log('\n(DRY-RUN — rien écrit)');
