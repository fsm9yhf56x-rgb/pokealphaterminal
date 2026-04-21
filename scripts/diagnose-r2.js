require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});

async function check(dbId, r2Key) {
  const { data } = await supa.from('tcg_cards').select('id, image_url').eq('id', dbId).maybeSingle();
  let r2Exists = false;
  try { await r2.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET, Key: r2Key })); r2Exists = true; } catch {}
  return { dbId, inDb: !!data, r2Exists, imageUrl: data?.image_url };
}

(async () => {
  const samples = [
    'en/base1/1.webp',
    'en/base1/100.webp',
    'en/mep/1.webp',
    'fr/me/me03/1.webp',
    'fr/mep/1.webp',
  ];
  for (const key of samples) {
    const [lang, ...rest] = key.split('/');
    const setAndCard = rest.join('/').replace('.webp', '');
    const dbId = `${lang}-${setAndCard.replace(/\//g, '-')}`;
    const r = await check(dbId, key);
    console.log(`${key.padEnd(30)} → DB: ${r.inDb ? '✅' : '❌'}  R2: ${r.r2Exists ? '✅' : '❌'}  url: ${r.imageUrl?.slice(0,80) || '-'}`);
  }
})();
