/**
 * Rattrapage des images JP manquantes (echecs de download pendant l'import).
 *
 * Cible: tcg_cards source='ppt' lang='JP' has_image=false AVEC image_url non-null.
 * Pour chaque: download image_url (TCGPlayer CDN) -> sharp coins arrondis webp
 * -> R2 jp/{slug}/{localId}.jpg -> UPDATE has_image=true.
 *
 * ZERO credit PPT (l'image_url est deja en base, TCGPlayer CDN gratuit).
 *
 * Usage:
 *   node scripts/repair-jp-images.js              (toutes les manquantes)
 *   node scripts/repair-jp-images.js --limit 500  (par lots, pour tester)
 *   node scripts/repair-jp-images.js --dry-run
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

const sql = neon(process.env.DATABASE_URL);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
const BUCKET = process.env.R2_BUCKET;

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : null; };
const has = (n) => args.includes('--' + n);
const LIMIT = parseInt(arg('limit') || '0', 10);
const DRY = has('dry-run');

// slug du set: jp-sv2a-pokemon-card-151 -> sv2a-pokemon-card-151
function slugFromSetId(setId) {
  return String(setId).replace(/^jp-/, '');
}

async function roundCorners(buf) {
  const { width: w, height: h } = await sharp(buf).metadata();
  const r = Math.round(Math.min(w, h) * 0.045);
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect x="0" y="0" width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  return sharp(buf).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 85 }).toBuffer();
}

async function uploadImage(imageUrl, slug, localId) {
  const resp = await fetch(imageUrl);
  if (!resp.ok) return false;
  const buf = Buffer.from(await resp.arrayBuffer());
  const rounded = await roundCorners(buf);
  const key = `jp/${slug}/${localId}.jpg`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: rounded, ContentType: 'image/webp', CacheControl: 'public, max-age=31536000' }));
  return true;
}

(async () => {
  let q = `SELECT id, set_id, local_id, name, image_url FROM tcg_cards
           WHERE source='ppt' AND lang='JP' AND has_image=false AND image_url IS NOT NULL
           ORDER BY set_id, local_id`;
  if (LIMIT > 0) q += ` LIMIT ${LIMIT}`;
  const cards = await sql.query(q);
  console.log(`${cards.length} cartes JP a reparer (image manquante mais image_url present)`);

  if (DRY) {
    for (const c of cards.slice(0, 5)) console.log(`  ${c.id} ${c.set_id}/${c.local_id} "${c.name}"`);
    console.log('DRY-RUN, aucune ecriture.');
    process.exit(0);
  }

  let ok = 0, fail = 0;
  for (let i = 0; i < cards.length; i++) {
    const c = cards[i];
    const slug = slugFromSetId(c.set_id);
    try {
      const done = await uploadImage(c.image_url, slug, c.local_id);
      if (done) {
        await sql`UPDATE tcg_cards SET has_image=true, image_synced_at=NOW() WHERE id=${c.id}`;
        ok++;
      } else {
        fail++;
      }
    } catch (e) {
      fail++;
      if (fail <= 5) console.error(`  KO ${c.id}: ${e.message}`);
    }
    if ((i + 1) % 100 === 0) console.log(`  ${i + 1}/${cards.length} traitees (${ok} OK, ${fail} echecs)`);
    // Petite pause anti-rate-limit CDN tous les 50
    if ((i + 1) % 50 === 0) await new Promise(res => setTimeout(res, 400));
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`Repare: ${ok} images | Echecs: ${fail}`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
