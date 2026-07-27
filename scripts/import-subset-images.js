/**
 * import-subset-images.js
 *
 * Rapatrie les visuels des sous-sets SWSH (Trainer Gallery, Galarian Gallery,
 * Shiny Vault) que TCGdex n'a pas : chez eux les images sont contribuees par
 * la communaute, et ces 312 cartes n'ont jamais ete soumises.
 *
 * Source : pokemontcg.io (PNG haute resolution, couverture verifiee 312/312).
 * ATTENTION : ces visuels sont ANGLAIS. L'artwork est identique a la version
 * FR mais le texte de la carte ne l'est pas -> on marque img_lang='EN' quand
 * la colonne existe, pour ne pas faire passer une image EN pour une image FR.
 *
 *   node scripts/import-subset-images.js            # dry-run
 *   node scripts/import-subset-images.js --commit   # telecharge + upload + BDD
 *   node scripts/import-subset-images.js --commit --only=swsh12.5tg
 */

const { neon } = require('@neondatabase/serverless');
const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const sharp = require('sharp');

const COMMIT = process.argv.includes('--commit');
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1];

const DATABASE_URL = process.env.DATABASE_URL;
const R2_ACCOUNT = process.env.R2_ACCOUNT_ID;
const R2_KEY = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET;

for (const [k, v] of Object.entries({ DATABASE_URL, R2_ACCOUNT, R2_KEY, R2_SECRET, R2_BUCKET })) {
  if (!v) { console.error('Variable manquante : ' + k); process.exit(1); }
}

const sql = neon(DATABASE_URL);
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

/** Correspondance identifiants Kodo/TCGdex -> pokemontcg.io (verifiee par sonde). */
const MAP = {
  'swsh9.5tg':  'swsh9tg',
  'swsh10.5tg': 'swsh10tg',
  'swsh11.5tg': 'swsh11tg',
  'swsh12.5tg': 'swsh12tg',
  'swsh12.5gg': 'swsh12pt5gg',
  'swsh4.5sv':  'swsh45sv',
};

const UA = { 'User-Agent': 'Mozilla/5.0 (KodoCards catalog sync)' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function exists(key) {
  try { await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key })); return true; }
  catch { return false; }
}

async function upload(key, buffer) {
  await r2.send(new PutObjectCommand({
    Bucket: R2_BUCKET, Key: key, Body: buffer,
    ContentType: 'image/webp', CacheControl: 'public, max-age=31536000, immutable',
  }));
}

/** La colonne img_lang n'existe pas forcement : on ne l ecrit que si elle est la. */
async function hasImgLangColumn() {
  const r = await sql`SELECT 1 FROM information_schema.columns
    WHERE table_name='k_cards' AND column_name='img_lang' LIMIT 1`;
  return r.length > 0;
}

(async () => {
  const withImgLang = await hasImgLangColumn();
  console.log((COMMIT ? '=== IMPORT' : '=== DRY-RUN') + ' images sous-sets SWSH');
  console.log('colonne img_lang : ' + (withImgLang ? 'presente' : 'absente (ignoree)') + '\n');

  const sets = ONLY ? { [ONLY]: MAP[ONLY] } : MAP;
  if (ONLY && !MAP[ONLY]) { console.error('Set inconnu : ' + ONLY); process.exit(1); }

  let done = 0, skipped = 0, failed = [];

  for (const [kodoSet, ptcgSet] of Object.entries(sets)) {
    const cards = await sql`
      SELECT id, print_id FROM k_cards
      WHERE lower(lang)='fr' AND regexp_replace(print_id,'-[^-]+$','') = ${kodoSet}
      ORDER BY print_id`;
    console.log('--- ' + kodoSet + ' (' + cards.length + ' cartes) -> ' + ptcgSet);

    for (const c of cards) {
      const num = c.print_id.split('-').pop();
      const key = `fr/${kodoSet}/${num}.webp`;

      if (await exists(key)) { skipped++; continue; }

      if (!COMMIT) { done++; if (done <= 3) console.log('    -> ' + key); continue; }

      try {
        const url = `https://images.pokemontcg.io/${ptcgSet}/${num}_hires.png`;
        const res = await fetch(url, { headers: UA });
        if (!res.ok) { failed.push(num + ' (HTTP ' + res.status + ')'); continue; }

        const png = Buffer.from(await res.arrayBuffer());
        // 734px de large = la taille servie par TCGdex en "high", coherent avec le reste du catalogue
        const webp = await sharp(png).resize({ width: 734, withoutEnlargement: true })
          .webp({ quality: 88 }).toBuffer();

        await upload(key, webp);
        await sql`UPDATE k_cards SET has_image = true WHERE id = ${c.id}`;
        if (withImgLang) await sql`UPDATE k_cards SET img_lang = 'EN' WHERE id = ${c.id}`;

        done++;
        if (done % 25 === 0) console.log('    ' + done + ' images importees...');
        await sleep(120); // on reste poli avec la source
      } catch (e) {
        failed.push(num + ' (' + e.message.slice(0, 40) + ')');
      }
    }
  }

  console.log('\n=== ' + (COMMIT ? 'IMPORTEES' : 'A IMPORTER') + ' : ' + done);
  console.log('deja presentes sur R2 : ' + skipped);
  if (failed.length) console.log('ECHECS (' + failed.length + ') : ' + failed.slice(0, 15).join(', '));
  if (!COMMIT) console.log('\n-> relancer avec --commit');
  else console.log('\n-> penser a relancer rebuild-static-data pour que le front les voie');
})();
