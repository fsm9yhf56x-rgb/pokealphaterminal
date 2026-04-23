// Lit tous les objets du bucket R2, marque has_image=true
// pour les cartes correspondantes dans tcg_cards.
// Idempotent : relançable à l'infini.

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;
const DRY = process.argv.includes('--dry');

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Convertit une clé R2 en id tcg_cards
 *   'en/base1/4.webp'       → 'en-base1-4'
 *   'jp/20th/31651.jpg'     → 'jp-20th-31651'
 *   'en/tk-bw-e/22.webp'    → 'en-tk-bw-e-22'
 */
function r2KeyToCardId(key) {
  const noExt = key.replace(/\.(webp|jpg|png)$/, '');
  return noExt.replace(/\//g, '-');
}

async function listAllR2Keys() {
  const keys = [];
  let token;
  let batch = 0;
  do {
    const res = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET,
      ContinuationToken: token,
      MaxKeys: 1000,
    }));
    (res.Contents || []).forEach(o => keys.push(o.Key));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
    batch++;
    if (batch % 10 === 0) process.stdout.write(`\r  📦 listé ${keys.length} objets R2...`);
  } while (token);
  console.log(`\r  📦 Total R2: ${keys.length} objets               `);
  return keys;
}

/**
 * Récupère TOUS les ids via pagination.
 * ATTENTION : Supabase limite à 1000 par range par défaut — on loop jusqu'à épuiser.
 */
async function getAllCardIds() {
  const ids = new Set();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supa
      .from('tcg_cards')
      .select('id')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    data.forEach(r => ids.add(r.id));
    process.stdout.write(`\r  🗄  lu ${ids.size} cards depuis DB...`);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`\r  🗄  Total DB: ${ids.size} cards                 `);
  return ids;
}

(async () => {
  if (DRY) console.log('🧪 DRY RUN — aucune écriture\n');
  console.log('🚀 Backfill has_image\n');

  const [r2Keys, dbIds] = await Promise.all([listAllR2Keys(), getAllCardIds()]);

  const toMark = [];
  const orphanKeys = [];
  for (const key of r2Keys) {
    const cardId = r2KeyToCardId(key);
    if (dbIds.has(cardId)) toMark.push(cardId);
    else orphanKeys.push(key);
  }

  console.log(`\n🎯 Cartes DB avec image R2 correspondante : ${toMark.length}`);
  console.log(`⚠️  Clés R2 orphelines (pas en DB) : ${orphanKeys.length}`);
  if (orphanKeys.length) {
    console.log('   Exemples (10 max):', orphanKeys.slice(0, 10).join(', '));
  }

  // Aussi : combien de cartes DB sans image R2 ?
  const matchedIds = new Set(toMark);
  let dbWithoutImage = 0;
  for (const id of dbIds) if (!matchedIds.has(id)) dbWithoutImage++;
  console.log(`📭 Cartes DB sans image R2 : ${dbWithoutImage}`);

  if (DRY) {
    console.log('\n✅ DRY RUN terminé, aucun UPDATE effectué.');
    process.exit(0);
  }

  console.log('\n🔄 UPDATE en cours...');
  const CHUNK = 500;
  let updated = 0;
  for (let i = 0; i < toMark.length; i += CHUNK) {
    const chunk = toMark.slice(i, i + CHUNK);
    const { error } = await supa
      .from('tcg_cards')
      .update({ has_image: true, image_synced_at: new Date().toISOString() })
      .in('id', chunk);
    if (error) console.error(`\n  ✗ batch ${i}: ${error.message}`);
    else updated += chunk.length;
    process.stdout.write(`\r  ✅ ${updated}/${toMark.length} cards mises à jour`);
    await sleep(50);
  }

  console.log(`\n\n🎉 Backfill terminé.`);
  console.log(`   ${updated} cartes marquées has_image=true`);

  const { count: trueCount } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('has_image', true);
  const { count: falseCount } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).eq('has_image', false);
  console.log(`\n📊 DB post-backfill:`);
  console.log(`   has_image = true  : ${trueCount}`);
  console.log(`   has_image = false : ${falseCount}   ← cartes sans image sur R2`);
})().catch(e => { console.error('❌', e); process.exit(1); });
