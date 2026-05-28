/**
 * Rapatriement images JP : artofpkm.com → R2, avec coins arrondis.
 * Pipeline : download → sharp (masque coins 4.5% → webp q85 alpha) → upload R2.
 * Cle R2 = jp/{normalizeSetId(set_id)}/{local_id}.jpg (ContentType image/webp).
 * (cle = replique EXACTE de src/lib/images.ts getCardImageUrl, verifie 28/05/26)
 *
 * Reprise : r2-jp-progress.json (ids traites). Relancable.
 * ECRASE toujours sur R2 (pas de skip HeadObject) → applique le nouveau rendu partout.
 * Pas d'UPDATE Neon (fallback helper lit la cle directement).
 */
require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const sharp = require('sharp');
const { Pool } = require('@neondatabase/serverless');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const r2 = new S3Client({ region:'auto', endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});

const BUCKET = process.env.R2_BUCKET;
const PROGRESS = 'r2-jp-progress.json';
const ERRORS = 'r2-jp-errors.json';
const DELAY_MS = 250;
const RADIUS_PCT = 0.045;

function normalizeSetId(s){ if(!s) return s; return s.replace(/^(en|fr|jp)-/i,'').replace(/-shadowless(-ns)?$/i,'').replace(/-1st(-ed|-edition)?$/i,'').replace(/-unlimited$/i,''); }
function r2Key(setId, localId){ return `jp/${normalizeSetId(setId)}/${localId}.jpg`; }
const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
function loadJson(p,d){ try{ return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return d; } }
function saveJson(p,d){ fs.writeFileSync(p, JSON.stringify(d)); }

async function roundCorners(buf){
  const { width:w, height:h } = await sharp(buf).metadata();
  const r = Math.round(w * RADIUS_PCT);
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  return sharp(buf).ensureAlpha().composite([{ input: mask, blend: 'dest-in' }]).webp({ quality: 85 }).toBuffer();
}

(async () => {
  const done = new Set(loadJson(PROGRESS, []));
  const errors = loadJson(ERRORS, []);
  console.log('Reprise : ' + done.size + ' deja traites');

  const rows = (await pool.query(`
    SELECT id, set_id, local_id, image_url FROM tcg_cards
    WHERE image_url LIKE '%artofpkm%' AND set_id IS NOT NULL AND local_id IS NOT NULL
    ORDER BY id`)).rows;
  console.log('Total a traiter : ' + rows.length);
  const t0 = Date.now();

  let ok=0, skip=0, fail=0, i=0;
  for (const c of rows) {
    i++;
    if (done.has(c.id)) { skip++; continue; }
    const key = r2Key(c.set_id, c.local_id);
    try {
      const res = await fetch(c.image_url, { redirect:'follow', signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const raw = Buffer.from(await res.arrayBuffer());
      if (raw.length < 1000) throw new Error('fichier trop petit');
      const rounded = await roundCorners(raw);
      await r2.send(new PutObjectCommand({ Bucket:BUCKET, Key:key, Body:rounded, ContentType:'image/webp', CacheControl:'public, max-age=31536000' }));
      done.add(c.id); ok++;
      await sleep(DELAY_MS);
    } catch (e) {
      fail++; errors.push({ id:c.id, key, err:String(e.message).slice(0,100) });
    }
    if (i % 200 === 0) {
      saveJson(PROGRESS, [...done]); saveJson(ERRORS, errors);
      const rate = ok / ((Date.now()-t0)/1000);
      const eta = rate>0 ? Math.round((rows.length - i)/rate/60) : '?';
      process.stdout.write('\r  ' + i + '/' + rows.length + ' · ok=' + ok + ' skip=' + skip + ' fail=' + fail + ' · ETA ~' + eta + 'min   ');
    }
  }
  saveJson(PROGRESS, [...done]); saveJson(ERRORS, errors);
  console.log('\n✅ Termine : ok=' + ok + ' skip=' + skip + ' fail=' + fail);
  if (fail) console.log('   ' + fail + ' erreurs dans ' + ERRORS + ' — relancer le script les retentera');
  pool.end();
})();
