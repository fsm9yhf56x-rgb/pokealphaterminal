/**
 * Import du referentiel EN depuis PokemonPriceTracker (PPT) vers Neon + R2.
 * Clone de import-jp-ppt.js — language=english, id = en-{tcgPlayerId}, lang='EN'.
 *
 * Usage:
 *   node scripts/import-en-ppt.js --set "Obsidian Flames"   (1 set pilote)
 *   node scripts/import-en-ppt.js --all --resume            (~217 sets, ~50k credits)
 *   node scripts/import-en-ppt.js --set "..." --dry-run     (aucune ecriture)
 *   node scripts/import-en-ppt.js --set "..." --no-images   (skip R2)
 *
 * Credits: PPT /v2/cards = 2 cr/carte. Image (TCGPlayer CDN) = GRATUIT.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { neon } = require('@neondatabase/serverless');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
try {
  for (const l of fs.readFileSync(path.join(process.cwd(), '.env.production.local'), 'utf8').split('\n')) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      let v = m[2].trim();
      if ((v[0] === '"' && v.endsWith('"')) || (v[0] === "'" && v.endsWith("'"))) v = v.slice(1, -1);
      process.env[m[1]] = v;
    }
  }
} catch (e) {}
const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
if (!KEY) { console.error('Missing POKEMON_PRICE_TRACKER_API_KEY'); process.exit(1); }
if (!DATABASE_URL) { console.error('Missing DATABASE_URL'); process.exit(1); }
const sql = neon(DATABASE_URL);
const PPT_BASE = 'https://www.pokemonpricetracker.com/api/v2';
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = process.env.R2_BUCKET;
const args = process.argv.slice(2);
const arg = (name) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
const has = (name) => args.includes('--' + name);
const ONE_SET = arg('set');
const ALL = has('all');
const DRY = has('dry-run');
const NO_IMAGES = has('no-images');
const MAX_CREDITS = parseInt(arg('max-credits') || '16000', 10);
const RESUME = has('resume');
let creditsUsed = 0;
const MAX_SETS = parseInt(arg('max-sets') || '0', 10);
let setsImported = 0;
if (!ONE_SET && !ALL) {
  console.error('Usage: --set "Obsidian Flames"  OU  --all  [--dry-run] [--no-images]');
  process.exit(1);
}
function slugifySet(setName) {
  return setName.toLowerCase().replace(/[':,.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}
function localIdFrom(card) {
  const cn = card.cardNumber ? String(card.cardNumber).split('/')[0].trim() : '';
  if (cn) return cn.replace(/^([A-Za-z]*)0+(\d)/, '$1$2');
  return String(card.tcgPlayerId);
}
function cleanName(name) {
  return String(name || '').replace(/\s*-\s*\d+\/\d+\s*$/, '').trim();
}
async function roundCorners(buf) {
  const { width: w, height: h } = await sharp(buf).metadata();
  const r = Math.round(Math.min(w, h) * 0.045);
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  return sharp(buf).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 85 }).toBuffer();
}
async function fetchSetCards(setName) {
  let all = [], offset = 0;
  while (true) {
    const url = `${PPT_BASE}/cards?set=${encodeURIComponent(setName)}&language=english&fetchAllInSet=true&limit=200&offset=${offset}`;
    const r = await fetch(url, { headers: { Authorization: 'Bearer ' + KEY } });
    if (!r.ok) { console.error(`   PPT ${r.status} pour "${setName}"`); break; }
    const j = await r.json();
    const cards = j.data || [];
    all.push(...cards);
    const meta = j.metadata || {};
    if (!meta.hasMore || cards.length === 0) break;
    offset += cards.length;
    if (offset > 5000) break;
    await new Promise(res => setTimeout(res, 300));
  }
  creditsUsed += all.length * 2;
  return all;
}
async function uploadImage(imageCdnUrl, slug, localId) {
  if (!imageCdnUrl) return false;
  try {
    const resp = await fetch(imageCdnUrl);
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    const rounded = await roundCorners(buf);
    const key = `en/${slug}/${localId}.jpg`;
    await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: rounded, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' }));
    return true;
  } catch (e) {
    console.error(`     img KO ${localId}: ${e.message}`);
    return false;
  }
}
async function importSet(setName, setMeta) {
  const slug = slugifySet(setName);
  const setId = `en-${slug}`;
  console.log(`\n=== ${setName} -> ${setId} ===`);
  const cards = await fetchSetCards(setName);
  console.log(`   ${cards.length} cartes recuperees (PPT)`);
  if (cards.length === 0) return { set: setName, cards: 0, images: 0 };

  if (DRY) {
    console.log('   DRY-RUN, echantillon:');
    for (const c of cards.slice(0, 3)) {
      console.log(`     en-${c.tcgPlayerId} | local=${localIdFrom(c)} | "${cleanName(c.name)}" | img=${c.imageCdnUrl ? 'oui' : 'non'}`);
    }
    return { set: setName, cards: cards.length, images: 0 };
  }

  await sql`
    INSERT INTO tcg_sets (id, name, lang, total_cards, release_date, source, is_active)
    VALUES (${setId}, ${setName}, 'EN', ${setMeta?.cardCount || cards.length}, ${setMeta?.releaseDate || null}, 'ppt', true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, total_cards = EXCLUDED.total_cards, release_date = EXCLUDED.release_date, source = 'ppt', updated_at = NOW()
  `;

  let imgOk = 0;
  const BATCH = 100;
  for (let i = 0; i < cards.length; i += BATCH) {
    const chunk = cards.slice(i, i + BATCH);
    for (const c of chunk) {
      const cardId = `en-${c.tcgPlayerId}`;
      const localId = localIdFrom(c);
      let hasImage = false;
      if (!NO_IMAGES) hasImage = await uploadImage(c.imageCdnUrl || c.imageUrl, slug, localId);
      if (hasImage) imgOk++;
      await sql`
        INSERT INTO tcg_cards (id, set_id, local_id, name, lang, rarity, card_type, hp, has_image, is_active, source, image_url)
        VALUES (${cardId}, ${setId}, ${localId}, ${cleanName(c.name)}, 'EN', ${c.rarity || null}, ${c.cardType || null}, ${c.hp || null}, ${hasImage}, true, 'ppt', ${c.imageCdnUrl || null})
        ON CONFLICT (id) DO UPDATE SET set_id = EXCLUDED.set_id, local_id = EXCLUDED.local_id, name = EXCLUDED.name, rarity = EXCLUDED.rarity, has_image = EXCLUDED.has_image, source = 'ppt', image_url = EXCLUDED.image_url, synced_at = NOW()
      `;
    }
    console.log(`   ${Math.min(i + BATCH, cards.length)}/${cards.length} cartes inserees (${imgOk} images R2)`);
  }
  return { set: setName, cards: cards.length, images: imgOk };
}

(async () => {
  let setsToImport = [];
  if (ONE_SET) {
    setsToImport = [{ name: ONE_SET }];
  } else if (ALL) {
    let offset = 0;
    while (true) {
      const r = await fetch(`${PPT_BASE}/sets?language=english&limit=100&offset=${offset}`, { headers: { Authorization: 'Bearer ' + KEY } });
      const j = await r.json();
      const sets = (j.data || []).filter(s => s.cardCount > 0);
      setsToImport.push(...sets);
      if (!j.metadata?.hasMore) break;
      offset += 100;
      if (offset > 500) break;
    }
    console.log(`${setsToImport.length} sets EN a importer`);
  }
  let alreadyDone = new Set();
  if (RESUME) {
    const rows = await sql`SELECT DISTINCT set_id FROM tcg_cards WHERE source = 'ppt' AND lang = 'EN'`;
    alreadyDone = new Set(rows.map(r => r.set_id));
    console.log(`RESUME: ${alreadyDone.size} sets EN deja en base, seront skip`);
  }

  const results = [];
  for (const s of setsToImport) {
    if (creditsUsed >= MAX_CREDITS) {
      console.log(`\n⏸  PLAFOND CREDITS atteint (~${creditsUsed}/${MAX_CREDITS}). Arret propre.`);
      console.log(`   Relance demain avec --resume pour continuer.`);
      break;
    }
    const slug = slugifySet(s.name);
    if (RESUME && alreadyDone.has(`en-${slug}`)) {
      console.log(`   skip (deja fait): ${s.name}`);
      continue;
    }
    if (MAX_SETS > 0 && setsImported >= MAX_SETS) {
      console.log(`\n⏸  PLAFOND SETS atteint (${setsImported}/${MAX_SETS}). Arret propre. Relance --resume.`);
      break;
    }
    try { results.push(await importSet(s.name, s)); setsImported++; }
    catch (e) { console.error(`ECHEC "${s.name}": ${e.message}`); results.push({ set: s.name, cards: 0, images: 0, error: e.message }); }
    await new Promise(res => setTimeout(res, 1500));
  }
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const tc = results.reduce((a, r) => a + (r.cards || 0), 0);
  const ti = results.reduce((a, r) => a + (r.images || 0), 0);
  const errs = results.filter(r => r.error);
  console.log(`Sets: ${results.length} | Cartes: ${tc} | Images R2: ${ti} | Erreurs: ${errs.length} | Credits~${creditsUsed}`);
  if (errs.length) for (const e of errs.slice(0, 5)) console.log(`  ERR ${e.set}: ${e.error}`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
