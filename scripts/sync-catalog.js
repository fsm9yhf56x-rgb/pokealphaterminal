/**
 * Pipeline de sync TCGdex → R2 + tcg_sets + tcg_cards
 *
 * Usage:
 *   node scripts/sync-catalog.js                  → sync EN + FR
 *   node scripts/sync-catalog.js --dry            → dry run, zéro écriture
 *   node scripts/sync-catalog.js --lang=en        → une seule langue
 *   node scripts/sync-catalog.js --set=base1      → un seul set (précédé du préfixe lang)
 *   node scripts/sync-catalog.js --only-fill-images → ne fait que combler les images manquantes
 *   node scripts/sync-catalog.js --trigger=cron   → marque le log comme triggered_by='cron'
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { startSyncLog, finishSyncLog } = require('./lib/sync-logger');

// ── Env ──
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

for (const [k, v] of Object.entries({ SUPA_URL, SUPA_SERVICE, R2_ACCOUNT, R2_KEY, R2_SECRET, R2_BUCKET })) {
  if (!v) { console.error(`❌ Env manquante: ${k}`); process.exit(1); }
}

// ── CLI args ──
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY_IMAGES = args.includes('--only-fill-images');
const LANG_FILTER = args.find(a => a.startsWith('--lang='))?.split('=')[1];
const SET_FILTER = args.find(a => a.startsWith('--set='))?.split('=')[1];
const TRIGGER = args.find(a => a.startsWith('--trigger='))?.split('=')[1] || 'manual';
const LANGS = LANG_FILTER ? [LANG_FILTER] : ['en', 'fr'];

// ── Clients ──
const supa = createClient(SUPA_URL, SUPA_SERVICE);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

const TCGDEX = 'https://api.tcgdex.net/v2';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── R2 helpers ──
async function r2Exists(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

async function r2Upload(key, buffer, contentType = 'image/webp') {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer, ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

// ── TCGdex helpers ──
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

// ── DB helpers ──
async function getExistingCardIds(langPrefix) {
  const ids = new Set();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await supa
      .from('tcg_cards')
      .select('id')
      .ilike('id', `${langPrefix}-%`)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    data.forEach(r => ids.add(r.id));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

async function getCardsWithoutImage(langPrefix, setFilter = null) {
  const ids = [];
  const PAGE = 1000;
  let from = 0;
  while (true) {
    let q = supa
      .from('tcg_cards')
      .select('id, set_id, local_id, lang')
      .ilike('id', `${langPrefix}-%`)
      .eq('has_image', false)
      .order('id', { ascending: true });
    if (setFilter) q = q.eq('set_id', setFilter);
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    ids.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return ids;
}

// ── Image sync pour une carte ──
async function syncCardImage(lang, setId, localId, tcgdexImage) {
  // setId est "en-base1" → sur R2 c'est "en/base1/..."
  const r2SetId = setId.replace(new RegExp(`^${lang}-`), ''); // strip préfixe lang
  const r2Key = lang === 'jp'
    ? `${lang}/${r2SetId}/${localId}.jpg`
    : `${lang}/${r2SetId}/${localId}.webp`;

  // Déjà sur R2 ? (soit on l'ignore, soit on note true)
  if (await r2Exists(r2Key)) return { status: 'already_on_r2', key: r2Key };

  // Sinon, download depuis TCGdex
  if (!tcgdexImage) return { status: 'no_source', key: r2Key };

  try {
    const imgUrl = tcgdexImage.includes('/high') ? tcgdexImage : `${tcgdexImage}/high.webp`;
    const buf = await fetchImage(imgUrl);
    if (!DRY) await r2Upload(r2Key, buf, 'image/webp');
    return { status: 'uploaded', key: r2Key };
  } catch (e) {
    return { status: 'failed', key: r2Key, error: e.message };
  }
}

// ── Sync pour une langue ──
async function syncLang(lang) {
  console.log(`\n🌐 === ${lang.toUpperCase()} ===`);
  const stats = { new_cards: 0, new_sets: 0, images_uploaded: 0, images_skipped: 0, images_failed: 0, errors: [] };

  // Mode 1: ONLY_IMAGES = on ne s'occupe que des cartes has_image=false
  if (ONLY_IMAGES) {
    console.log('📸 Mode: comblement images uniquement');
    const cards = await getCardsWithoutImage(lang, SET_FILTER);
    console.log(`🎯 ${cards.length} cartes sans image R2`);
    for (const c of cards) {
      // Récupère l'URL TCGdex via fetch set/cards
      // (on skip pour l'instant, on y reviendra si besoin — pour l'instant mode full)
      // → recommande mode full pour run initial
    }
    return stats;
  }

  // Mode 2: full sync
  const existingIds = await getExistingCardIds(lang);
  console.log(`📚 ${existingIds.size} cartes déjà en DB`);

  const sets = await fetchJson(`${TCGDEX}/${lang}/sets`);
  if (!sets) { console.log('⚠️  Aucun set TCGdex'); return stats; }
  console.log(`📦 ${sets.length} sets sur TCGdex`);

  for (const setMeta of sets) {
    // Filtre éventuel sur un seul set
    const dbSetId = `${lang}-${setMeta.id}`;
    if (SET_FILTER && dbSetId !== SET_FILTER) continue;

    // Upsert du set dans tcg_sets (nouvelle ou mise à jour metadata)
    const setRow = {
      id: dbSetId,
      name: setMeta.name,
      lang: lang.toUpperCase(),
      total_cards: setMeta.cardCount?.total || setMeta.cardCount?.official || 0,
      release_date: setMeta.releaseDate || null,
      logo_url: setMeta.logo ? `${setMeta.logo}.webp` : null,
      series: setMeta.serie?.name || null,
      is_active: true,
    };
    if (!DRY) {
      const { error } = await supa.from('tcg_sets').upsert(setRow, { onConflict: 'id' });
      if (error) stats.errors.push(`set ${dbSetId}: ${error.message}`);
    }

    const setData = await fetchJson(`${TCGDEX}/${lang}/sets/${setMeta.id}`);
    if (!setData?.cards) continue;

    let setNewCards = 0, setImagesUploaded = 0;
    for (const card of setData.cards) {
      const dbId = `${lang}-${setMeta.id}-${card.localId}`;
      const cardInDb = existingIds.has(dbId);

      // Insert la carte si absente
      if (!cardInDb) {
        if (!DRY) {
          const { error } = await supa.from('tcg_cards').insert({
            id: dbId,
            set_id: dbSetId,
            local_id: card.localId,
            name: card.name || '',
            lang: lang.toUpperCase(),
            rarity: card.rarity || null,
            has_image: false,
            is_active: true,
            synced_at: new Date().toISOString(),
          });
          if (error) { stats.errors.push(`card ${dbId}: ${error.message}`); continue; }
        }
        stats.new_cards++;
        setNewCards++;
      }

      // Sync image
      const imgResult = await syncCardImage(lang, dbSetId, card.localId, card.image);

      if (imgResult.status === 'uploaded') {
        stats.images_uploaded++;
        setImagesUploaded++;
        if (!DRY) {
          await supa.from('tcg_cards')
            .update({ has_image: true, image_synced_at: new Date().toISOString() })
            .eq('id', dbId);
        }
      } else if (imgResult.status === 'already_on_r2') {
        stats.images_skipped++;
        if (!DRY && !cardInDb) {
          // carte nouvellement créée, mais image déjà là (rare, mais possible)
          await supa.from('tcg_cards')
            .update({ has_image: true, image_synced_at: new Date().toISOString() })
            .eq('id', dbId);
        }
      } else if (imgResult.status === 'failed') {
        stats.images_failed++;
        stats.errors.push(`img ${dbId}: ${imgResult.error}`);
      }
      // 'no_source' = pas d'image TCGdex, on ignore

      await sleep(30); // throttle léger
    }

    if (setNewCards > 0 || setImagesUploaded > 0) {
      console.log(`  📦 ${setMeta.id}: +${setNewCards} cartes, +${setImagesUploaded} images`);
    }
  }

  return stats;
}

// ── Main ──
(async () => {
  if (DRY) console.log('🧪 DRY RUN — aucune écriture\n');
  const jobName = `sync-catalog${LANG_FILTER ? '-' + LANG_FILTER : ''}`;
  const log = await startSyncLog(jobName, TRIGGER);
  const start = Date.now();

  const allStats = { new_cards: 0, new_sets: 0, images_uploaded: 0, images_skipped: 0, images_failed: 0, errors: [] };
  let status = 'success';
  let errorMsg = null;

  try {
    for (const lang of LANGS) {
      const s = await syncLang(lang);
      allStats.new_cards += s.new_cards;
      allStats.new_sets += s.new_sets;
      allStats.images_uploaded += s.images_uploaded;
      allStats.images_skipped += s.images_skipped;
      allStats.images_failed += s.images_failed;
      allStats.errors.push(...s.errors);
    }
  } catch (e) {
    status = 'failed';
    errorMsg = e.message;
    console.error('❌', e);
  }

  allStats.duration_ms = Date.now() - start;
  allStats.dry = DRY;

  console.log(`\n📊 TOTAL`);
  console.log(`   Nouvelles cartes     : +${allStats.new_cards}`);
  console.log(`   Images uploadées     : +${allStats.images_uploaded}`);
  console.log(`   Images déjà présentes: ${allStats.images_skipped}`);
  console.log(`   Images échouées      : ${allStats.images_failed}`);
  if (allStats.errors.length) {
    console.log(`   Erreurs              : ${allStats.errors.length}`);
    console.log('   Exemples :', allStats.errors.slice(0, 5).join(' | '));
  }
  console.log(`   Durée                : ${(allStats.duration_ms / 1000).toFixed(1)}s`);

  await finishSyncLog(log.id, status, allStats, errorMsg);
  if (status === 'failed') process.exit(1);
})();
