require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'card-images';
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPA_URL || !SUPA_SERVICE) {
  console.error('❌ Env manquantes (NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supa = createClient(SUPA_URL, SUPA_SERVICE);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function listAll(prefix = '', acc = []) {
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supa.storage.from(BUCKET).list(prefix, {
      limit, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw error;
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) await listAll(full, acc);
      else acc.push(full);
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return acc;
}

async function main() {
  console.log(`🗑️  Purge du bucket "${BUCKET}"...`);
  console.log('📋 Listing...');
  const files = await listAll('');
  console.log(`→ ${files.length} fichiers trouvés`);

  if (files.length === 0) {
    console.log('Bucket déjà vide.');
  } else {
    const CHUNK = 1000;
    let removed = 0, failed = 0;
    for (let i = 0; i < files.length; i += CHUNK) {
      const chunk = files.slice(i, i + CHUNK);
      const { data, error } = await supa.storage.from(BUCKET).remove(chunk);
      if (error) { console.error(`\n  ✗ batch ${i}: ${error.message}`); failed += chunk.length; }
      else { removed += (data?.length ?? chunk.length); process.stdout.write(`\r  supprimés: ${removed}/${files.length}`); }
      await sleep(100);
    }
    console.log(`\n✅ ${removed} fichiers supprimés (${failed} échecs)`);
  }

  console.log(`\n🪣  Suppression du bucket "${BUCKET}"...`);
  const { error: delErr } = await supa.storage.deleteBucket(BUCKET);
  if (delErr) console.error(`⚠️  ${delErr.message}`);
  else console.log('✅ Bucket supprimé.');

  console.log('\n🎉 Terminé. Storage usage va redescendre dans ~1h.');
}

main().catch((e) => { console.error(e); process.exit(1); });
