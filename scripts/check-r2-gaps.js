require('dotenv').config({ path: '.env.local' });
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function check(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

(async () => {
  const set = process.argv[2] || 'ex1';
  const lang = process.argv[3] || 'en';
  console.log(`\n📦 Check ${lang}/${set}/\n`);
  
  const max = 200;
  let found = 0, missing = 0;
  const missingList = [];
  
  for (let i = 1; i <= max; i++) {
    const exists = await check(`${lang}/${set}/${i}.webp`);
    if (exists) found++;
    else { missing++; missingList.push(i); }
  }
  
  console.log(`✅ Présents sur R2 : ${found}`);
  console.log(`❌ Manquants       : ${missing}`);
  if (missingList.length && missingList.length < 50) {
    console.log(`   IDs manquants : ${missingList.join(', ')}`);
  } else if (missingList.length) {
    console.log(`   IDs manquants : ${missingList.slice(0, 20).join(', ')}... (+${missingList.length - 20} autres)`);
  }
})();
