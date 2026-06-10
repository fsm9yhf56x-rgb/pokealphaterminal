/**
 * Rattrapage des images JP manquantes.
 *
 * Constat (audit 10/06/26): les image_url TCGPlayer CDN renvoient 403/404
 * PERMANENT (variants paralleles + decks sans image dediee). Re-download impossible.
 * MAIS la cle R2 jp/{slug}/{localId}.jpg existe deja pour une partie des cartes
 * (uploadee pour la carte normale partageant le meme set/local_id).
 *
 * Methode: ListObjectsV2 par prefixe de set via l'API S3 (PAS le domaine
 * public r2.dev qui est rate-limite par Cloudflare et renvoie des 429),
 * match en memoire, puis UPDATE has_image=true par lots.
 *
 * Les restantes necessitent un mapping TCGdex (phase 2, script separe).
 *
 * Usage:
 *   node scripts/repair-jp-images.js
 *   node scripts/repair-jp-images.js --dry-run
 */

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

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

const DRY = process.argv.includes('--dry-run');

async function listSetKeys(slug) {
  const keys = new Set();
  let token;
  do {
    const resp = await r2.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: `jp/${slug}/`, ContinuationToken: token,
    }));
    for (const o of resp.Contents || []) keys.add(o.Key);
    token = resp.IsTruncated ? resp.NextContinuationToken : undefined;
  } while (token);
  return keys;
}

(async () => {
  const cards = await sql.query(`
    SELECT id, set_id, local_id FROM tcg_cards
    WHERE source='ppt' AND lang='JP' AND has_image=false AND image_url IS NOT NULL
    ORDER BY set_id, local_id`);
  console.log(`${cards.length} cartes JP a verifier contre R2`);

  // Grouper par set
  const bySet = new Map();
  for (const c of cards) {
    const slug = String(c.set_id).replace(/^jp-/, '');
    if (!bySet.has(slug)) bySet.set(slug, []);
    bySet.get(slug).push(c);
  }
  console.log(`${bySet.size} sets a lister`);

  let found = 0, missing = 0;
  const toFlip = [];
  let done = 0;

  for (const [slug, setCards] of bySet) {
    const keys = await listSetKeys(slug);
    for (const c of setCards) {
      if (keys.has(`jp/${slug}/${c.local_id}.jpg`)) { found++; toFlip.push(c.id); }
      else missing++;
    }
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${bySet.size} sets (${found} trouvees, ${missing} absentes)`);
  }

  console.log(`\nCles R2 existantes: ${found} | Absentes (phase 2 TCGdex): ${missing}`);

  if (DRY) {
    console.log('DRY-RUN, aucune ecriture. Exemples:', toFlip.slice(0, 10).join(', '));
    process.exit(0);
  }

  for (let i = 0; i < toFlip.length; i += 200) {
    const chunk = toFlip.slice(i, i + 200);
    await sql.query(
      `UPDATE tcg_cards SET has_image=true, image_synced_at=NOW() WHERE id = ANY($1)`,
      [chunk]
    );
  }
  console.log(`UPDATE applique: ${toFlip.length} cartes flippees has_image=true`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
