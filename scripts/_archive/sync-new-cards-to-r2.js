// Sync incrémental TCGdex → R2 + tcg_cards (EN + FR)
// Usage:
//   node scripts/sync-new-cards-to-r2.js           → lance le sync
//   node scripts/sync-new-cards-to-r2.js --dry     → simulation, aucune écriture
//   node scripts/sync-new-cards-to-r2.js --lang=fr → une seule langue

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'pokealphaterminal-images';
const R2_PUBLIC = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL || 'https://pub-1aade8805ea544358d85a303c1feef41.r2.dev';

for (const [k, v] of Object.entries({ SUPA_URL, SUPA_SERVICE, R2_ACCOUNT, R2_KEY, R2_SECRET })) {
  if (!v) { console.error(`❌ Env manquante: ${k}`); process.exit(1); }
}

const args = process.argv.slice(2);
const LANGS = (args.find(a => a.startsWith('--lang='))?.split('=')[1] || 'en,fr').split(',');
const DRY = args.includes('--dry');

const supa = createClient(SUPA_URL, SUPA_SERVICE);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

const TCGDEX = 'https://api.tcgdex.net/v2';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function existsOnR2(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

async function uploadToR2(key, buffer, contentType = 'image/webp') {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
      if (res.status === 404) return null;
      throw new Error(`HTTP ${res.status}`);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
}

async function fetchImage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function getExistingCardIds(lang) {
  const ids = new Set();
  const prefix = `${lang}-`;
  let from = 0, batch = 1000;
  while (true) {
    const { data, error } = await supa
      .from('tcg_cards')
      .select('id')
      .ilike('id', `${prefix}%`)
      .range(from, from + batch - 1);
    if (error) throw error;
    if (!data.length) break;
    data.forEach(r => ids.add(r.id));
    if (data.length < batch) break;
    from += batch;
  }
  return ids;
}

async function syncLang(lang) {
  console.log(`\n🌐 === ${lang.toUpperCase()} ===`);
  const existingIds = await getExistingCardIds(lang);
  console.log(`📚 ${existingIds.size} cartes déjà en DB`);

  const sets = await fetchJson(`${TCGDEX}/${lang}/sets`);
  if (!sets) { console.log('Aucun set'); return; }
  console.log(`📦 ${sets.length} sets sur TCGdex`);

  let newCards = 0, newImages = 0, failed = 0;

  for (const setMeta of sets) {
    const setData = await fetchJson(`${TCGDEX}/${lang}/sets/${setMeta.id}`);
    if (!setData?.cards) continue;

    let setNewCards = 0;
    for (const card of setData.cards) {
      const dbId = `${lang}-${setMeta.id}-${card.localId}`;
      const r2Key = `${lang}/${setMeta.id}/${card.localId}.webp`;

      const cardInDb = existingIds.has(dbId);
      if (cardInDb && await existsOnR2(r2Key)) continue;

      // Image (upload seulement si manquante)
      if (!(await existsOnR2(r2Key))) {
        if (!card.image) { failed++; continue; }
        try {
          if (!DRY) {
            const buf = await fetchImage(`${card.image}/high.webp`);
            await uploadToR2(r2Key, buf);
          }
          newImages++;
        } catch (e) {
          console.error(`  ✗ img ${dbId}: ${e.message}`);
          failed++;
          continue;
        }
      }

      // DB
      if (!cardInDb) {
        if (!DRY) {
          const { error } = await supa.from('tcg_cards').upsert({
            id: dbId,
            image_url: `${R2_PUBLIC}/${r2Key}`,
          }, { onConflict: 'id' });
          if (error) { console.error(`  ✗ db ${dbId}: ${error.message}`); failed++; continue; }
        }
        newCards++;
        setNewCards++;
      }
      await sleep(40);
    }

    if (setNewCards > 0) console.log(`  ✅ ${setMeta.id}: +${setNewCards} cartes`);
  }

  console.log(`\n📊 ${lang.toUpperCase()}: +${newCards} cartes, +${newImages} images, ${failed} échecs`);
}

async function main() {
  if (DRY) console.log('🧪 DRY RUN — aucune écriture\n');
  console.log(`🚀 Langues: ${LANGS.join(', ')}`);
  for (const lang of LANGS) await syncLang(lang);
  console.log('\n🎉 Sync terminé');
}

main().catch(e => { console.error(e); process.exit(1); });
