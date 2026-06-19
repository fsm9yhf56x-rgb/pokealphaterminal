/**
 * Pipeline de sync TCGdex → R2 + tcg_sets + tcg_cards
 * Migré Supabase → Neon (@neondatabase/serverless)
 *
 * OPTIM (autonomisation) :
 *   - skip HEAD R2 pour les cartes deja has_image=true (plus de re-check inutile du catalogue)
 *   - plus de sleep(30) systematique : pause uniquement apres un vrai upload reseau
 *   - timeout (AbortController) sur tous les fetch TCGdex/image (anti-hang)
 *   Logique d'ecriture tcg_* (INSERT/ON CONFLICT/canonicalisation) INCHANGEE.
 *
 * Usage:
 *   node scripts/sync-catalog.js                  → sync EN + FR
 *   node scripts/sync-catalog.js --dry            → dry run, zéro écriture
 *   node scripts/sync-catalog.js --lang=en        → une seule langue
 *   node scripts/sync-catalog.js --set=en-base1   → un seul set (préfixe lang inclus)
 *   node scripts/sync-catalog.js --only-fill-images → ne fait que combler les images manquantes
 *   node scripts/sync-catalog.js --trigger=cron   → marque le log triggered_by='cron'
 *   node scripts/sync-catalog.js --recheck-images → force le re-check R2 meme si has_image=true
 */

require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { startSyncLog, finishSyncLog } = require('./lib/sync-logger');

// ── Env ──
const DATABASE_URL = process.env.DATABASE_URL;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

for (const [k, v] of Object.entries({ DATABASE_URL, R2_ACCOUNT, R2_KEY, R2_SECRET, R2_BUCKET })) {
  if (!v) { console.error(`Env manquante: ${k}`); process.exit(1); }
}

// ── CLI args ──
const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const ONLY_IMAGES = args.includes('--only-fill-images');
const RECHECK_IMAGES = args.includes('--recheck-images');
const LANG_FILTER = args.find(a => a.startsWith('--lang='))?.split('=')[1];
const SET_FILTER = args.find(a => a.startsWith('--set='))?.split('=')[1];
const TRIGGER = args.find(a => a.startsWith('--trigger='))?.split('=')[1] || 'manual';
const LANGS = LANG_FILTER ? [LANG_FILTER] : ['en', 'fr'];

// ── Clients ──
const sql = neon(DATABASE_URL);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

const TCGDEX = 'https://api.tcgdex.net/v2';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// fetch avec timeout (anti-hang reseau)
async function fetchT(url, opts = {}, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

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
      const res = await fetchT(url);
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
  const res = await fetchT(url, {}, 30000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

// ── DB helpers (Neon) ──
async function getExistingCardIds(langPrefix) {
  const ids = new Set();
  const rows = await sql`SELECT id FROM tcg_cards WHERE id LIKE ${langPrefix + '-%'}`;
  rows.forEach(r => ids.add(r.id));
  return ids;
}

// NEW: set des cartes deja imagees -> permet de skip le HEAD R2
async function getImagedCardIds(langPrefix) {
  const ids = new Set();
  const rows = await sql`SELECT id FROM tcg_cards WHERE id LIKE ${langPrefix + '-%'} AND has_image = true`;
  rows.forEach(r => ids.add(r.id));
  return ids;
}

async function getCardsWithoutImage(langPrefix, setFilter = null) {
  if (setFilter) {
    return await sql`
      SELECT id, set_id, local_id, lang FROM tcg_cards
      WHERE id LIKE ${langPrefix + '-%'} AND has_image = false AND set_id = ${setFilter}
      ORDER BY id ASC
    `;
  }
  return await sql`
    SELECT id, set_id, local_id, lang FROM tcg_cards
    WHERE id LIKE ${langPrefix + '-%'} AND has_image = false
    ORDER BY id ASC
  `;
}

// ── Image sync pour une carte ──
async function syncCardImage(lang, setId, localId, tcgdexImage) {
  const r2SetId = setId.replace(new RegExp(`^${lang}-`), '');
  const r2Key = lang === 'jp'
    ? `${lang}/${r2SetId}/${localId}.jpg`
    : `${lang}/${r2SetId}/${localId}.webp`;

  if (await r2Exists(r2Key)) return { status: 'already_on_r2', key: r2Key };
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
  console.log(`\n=== ${lang.toUpperCase()} ===`);
  const stats = { new_cards: 0, new_sets: 0, images_uploaded: 0, images_skipped: 0, images_failed: 0, errors: [] };

  if (ONLY_IMAGES) {
    console.log('Mode: comblement images uniquement');
    const cards = await getCardsWithoutImage(lang, SET_FILTER);
    console.log(`${cards.length} cartes sans image R2`);
    return stats;
  }

  const existingIds = await getExistingCardIds(lang);
  console.log(`${existingIds.size} cartes deja en DB`);

  // NEW: cartes deja imagees (pour skip le HEAD R2). Ignore si --recheck-images.
  const imagedIds = RECHECK_IMAGES ? new Set() : await getImagedCardIds(lang);
  if (!RECHECK_IMAGES) console.log(`${imagedIds.size} cartes deja imagees (HEAD R2 skip)`);

  const sets = await fetchJson(`${TCGDEX}/${lang}/sets`);
  if (!sets) { console.log('Aucun set TCGdex'); return stats; }
  console.log(`${sets.length} sets sur TCGdex`);

  for (const setMeta of sets) {
    const dbSetId = `${lang}-${setMeta.id}`;
    if (SET_FILTER && dbSetId !== SET_FILTER) continue;

    const setRow = {
      id: dbSetId,
      name: setMeta.name,
      lang: lang.toUpperCase(),
      total_cards: setMeta.cardCount?.total || setMeta.cardCount?.official || 0,
      release_date: setMeta.releaseDate || null,
      logo_url: setMeta.logo ? `${setMeta.logo}.webp` : null,
      series: setMeta.serie?.name || null,
    };
    if (!DRY) {
      try {
        await sql`
          INSERT INTO tcg_sets (id, name, lang, total_cards, release_date, logo_url, series, is_active, source, updated_at)
          VALUES (${setRow.id}, ${setRow.name}, ${setRow.lang}, ${setRow.total_cards}, ${setRow.release_date}, ${setRow.logo_url}, ${setRow.series}, true, 'tcgdex', NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            total_cards = EXCLUDED.total_cards,
            release_date = EXCLUDED.release_date,
            logo_url = EXCLUDED.logo_url,
            series = EXCLUDED.series,
            is_active = true,
            updated_at = NOW()
        `;
      } catch (e) { stats.errors.push(`set ${dbSetId}: ${e.message}`); }
    }

    // OPTIM: si le set est deja connu ET toutes ses cartes sont imagees, on saute
    // l'appel detaille TCGdex (le plus couteux). On ne le fait que s'il peut y avoir
    // du travail (set nouveau, ou cartes non imagees dans ce set).
    if (!RECHECK_IMAGES && !SET_FILTER) {
      const setPrefix = `${dbSetId}-`;
      let allKnownAndImaged = true;
      let anyKnown = false;
      for (const id of existingIds) {
        if (id.startsWith(setPrefix)) {
          anyKnown = true;
          if (!imagedIds.has(id)) { allKnownAndImaged = false; break; }
        }
      }
      // total attendu vs connu : si le set TCGdex a plus de cartes que ce qu'on connait,
      // il y a potentiellement des nouveautes -> on ne saute pas.
      const expected = setRow.total_cards || 0;
      let knownCount = 0;
      for (const id of existingIds) if (id.startsWith(setPrefix)) knownCount++;
      const fullyKnown = expected > 0 ? knownCount >= expected : anyKnown;

      if (anyKnown && allKnownAndImaged && fullyKnown) {
        continue; // rien a faire pour ce set, zero appel reseau detaille
      }
    }

    const setData = await fetchJson(`${TCGDEX}/${lang}/sets/${setMeta.id}`);
    if (!setData?.cards) continue;

    let setNewCards = 0, setImagesUploaded = 0;
    for (const card of setData.cards) {
      const dbId = `${lang}-${setMeta.id}-${card.localId}`;
      const cardInDb = existingIds.has(dbId);

      if (!cardInDb) {
        if (!DRY) {
          try {
            await sql`
              INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, has_image, is_active, source, synced_at)
              VALUES (${dbId}, ${dbSetId}, ${card.localId}, ${card.name || ''}, ${lang.toUpperCase()}, ${card.rarity || null}, false, true, 'tcgdex', NOW())
              ON CONFLICT (id) DO NOTHING
            `;
          } catch (e) { stats.errors.push(`card ${dbId}: ${e.message}`); continue; }
        }
        stats.new_cards++;
        setNewCards++;
      }

      // OPTIM: carte deja connue ET deja imagee -> aucun appel reseau (skip HEAD R2)
      if (cardInDb && imagedIds.has(dbId)) {
        stats.images_skipped++;
        continue;
      }

      const imgResult = await syncCardImage(lang, dbSetId, card.localId, card.image);

      if (imgResult.status === 'uploaded') {
        stats.images_uploaded++;
        setImagesUploaded++;
        if (!DRY) {
          await sql`UPDATE tcg_cards SET has_image = true, image_synced_at = NOW() WHERE id = ${dbId}`;
        }
        await sleep(30); // pause uniquement apres un vrai upload
      } else if (imgResult.status === 'already_on_r2') {
        stats.images_skipped++;
        if (!DRY) {
          await sql`UPDATE tcg_cards SET has_image = true, image_synced_at = NOW() WHERE id = ${dbId}`;
        }
      } else if (imgResult.status === 'failed') {
        stats.images_failed++;
        stats.errors.push(`img ${dbId}: ${imgResult.error}`);
      }
    }

    if (setNewCards > 0 || setImagesUploaded > 0) {
      console.log(`  ${setMeta.id}: +${setNewCards} cartes, +${setImagesUploaded} images`);
    }
  }

  return stats;
}

// ── Main ──
(async () => {
  if (DRY) console.log('DRY RUN — aucune ecriture\n');
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
    console.error('ERR', e);
  }

  allStats.duration_ms = Date.now() - start;
  allStats.dry = DRY;

  console.log(`\nTOTAL`);
  console.log(`   Nouvelles cartes     : +${allStats.new_cards}`);
  console.log(`   Images uploadees     : +${allStats.images_uploaded}`);
  console.log(`   Images deja presentes: ${allStats.images_skipped}`);
  console.log(`   Images echouees      : ${allStats.images_failed}`);
  if (allStats.errors.length) {
    console.log(`   Erreurs              : ${allStats.errors.length}`);
    console.log('   Exemples :', allStats.errors.slice(0, 5).join(' | '));
  }
  console.log(`   Duree                : ${(allStats.duration_ms / 1000).toFixed(1)}s`);

  await finishSyncLog(log.id, status, allStats, errorMsg);
  if (status === 'failed') process.exit(1);
})();
