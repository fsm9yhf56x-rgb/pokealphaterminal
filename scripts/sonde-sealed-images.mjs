// scripts/sonde-sealed-images.mjs
// Mesure la qualite des illustrations scelle FR et produit DEUX planches contact
// pour jugement visuel. N'ECRIT RIEN en base, ne touche pas a R2.
//
//   node scripts/sonde-sealed-images.mjs
//   -> /tmp/sealed-avant.jpg  (les images telles que recues des annonces)
//   -> /tmp/sealed-apres.jpg  (apres trim + fond neutre + ratio unique)
//
// Le score de FOND mesure si les bords de l'image sont clairs et uniformes :
// une photo studio sur fond blanc obtient un score haut, une photo posee sur
// un tapis obtient un score bas. C'est ce qui decide si un simple recadrage
// suffit ou s'il faut un vrai detourage.

import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { writeFile } from 'fs/promises';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const CELL = 190;        // taille d'une vignette dans la planche
const COLS = 10;
const BG = { r: 245, g: 245, b: 247 }; // surface Snow+

async function edgeScore(buf) {
  const img = sharp(buf);
  const meta = await img.metadata();
  const W = meta.width || 0, H = meta.height || 0;
  if (!W || !H) return null;
  const bw = Math.max(2, Math.round(W * 0.04));
  const bh = Math.max(2, Math.round(H * 0.04));
  const zones = [
    { left: 0, top: 0, width: W, height: bh },
    { left: 0, top: H - bh, width: W, height: bh },
    { left: 0, top: 0, width: bw, height: H },
    { left: W - bw, top: 0, width: bw, height: H },
  ];
  let mean = 0, sd = 0;
  for (const z of zones) {
    const st = await sharp(buf).extract(z).stats();
    const ch = st.channels.slice(0, 3);
    mean += ch.reduce((a, c) => a + c.mean, 0) / ch.length;
    sd += ch.reduce((a, c) => a + c.stdev, 0) / ch.length;
  }
  mean /= zones.length; sd /= zones.length;
  // clair ET uniforme = fond exploitable
  const clarte = Math.max(0, Math.min(1, (mean - 170) / 80));
  const uniformite = Math.max(0, Math.min(1, 1 - sd / 45));
  return { mean: Math.round(mean), sd: Math.round(sd), score: Math.round(clarte * uniformite * 100), W, H };
}

/** trim des bords uniformes -> contient dans un carre -> fond Snow+ */
async function normalize(buf) {
  let base = sharp(buf).flatten({ background: { r: 255, g: 255, b: 255 } });
  try { base = base.trim({ threshold: 18 }); } catch { /* trim peut echouer sur fond charge */ }
  return base
    .resize(CELL - 16, CELL - 16, { fit: 'contain', background: BG })
    .extend({ top: 8, bottom: 8, left: 8, right: 8, background: BG })
    .toFormat('jpeg', { quality: 88 })
    .toBuffer();
}

const rows = await sql.query(
  `SELECT id, name, image_url FROM k_sealed_products
    WHERE lang='fr' AND image_url IS NOT NULL ORDER BY id`
);
console.log(rows.length + ' illustrations a analyser\n');

const avant = [], apres = [], scores = [];
let ko = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  try {
    const res = await fetch(r.image_url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) { ko++; continue; }
    const buf = Buffer.from(await res.arrayBuffer());

    const sc = await edgeScore(buf);
    if (sc) scores.push({ id: r.id, name: r.name, ...sc });

    const raw = await sharp(buf)
      .resize(CELL, CELL, { fit: 'contain', background: { r: 20, g: 20, b: 24 } })
      .toFormat('jpeg', { quality: 85 }).toBuffer();
    avant.push(raw);
    apres.push(await normalize(buf));
  } catch (e) {
    ko++;
  }
  if ((i + 1) % 20 === 0) console.log('  ' + (i + 1) + '/' + rows.length);
}

async function planche(bufs, out, bg) {
  if (!bufs.length) return;
  const lignes = Math.ceil(bufs.length / COLS);
  const composite = bufs.map((input, i) => ({
    input,
    left: (i % COLS) * CELL,
    top: Math.floor(i / COLS) * CELL,
  }));
  const png = await sharp({
    create: { width: COLS * CELL, height: lignes * CELL, channels: 3, background: bg },
  }).composite(composite).toFormat('jpeg', { quality: 86 }).toBuffer();
  await writeFile(out, png);
  console.log('  ecrit ' + out + '  (' + bufs.length + ' vignettes)');
}

console.log('\nplanches :');
await planche(avant, '/tmp/sealed-avant.jpg', { r: 20, g: 20, b: 24 });
await planche(apres, '/tmp/sealed-apres.jpg', BG);

scores.sort((a, b) => a.score - b.score);
const seuils = [
  ['fond propre (>=70)', scores.filter((s) => s.score >= 70).length],
  ['moyen (40-69)', scores.filter((s) => s.score >= 40 && s.score < 70).length],
  ['fond charge (<40)', scores.filter((s) => s.score < 40).length],
];
console.log('\n================ QUALITE DES FONDS ================');
for (const [k, v] of seuils) console.log('  ' + String(v).padStart(4) + '  ' + k);
console.log('  ' + String(ko).padStart(4) + '  images inaccessibles');
console.log('\nles 12 pires (celles qui exigeraient un detourage) :');
for (const s of scores.slice(0, 12)) {
  console.log('  score ' + String(s.score).padStart(3) + ' | lum ' + String(s.mean).padStart(3) + ' | bruit ' + String(s.sd).padStart(3) + ' | ' + s.id.padEnd(28) + ' ' + (s.name || '').slice(0, 40));
}
console.log('\nles 6 meilleures :');
for (const s of scores.slice(-6).reverse()) {
  console.log('  score ' + String(s.score).padStart(3) + ' | ' + s.id.padEnd(28) + ' ' + (s.name || '').slice(0, 40));
}
console.log('\nOuvre les 2 planches et juge : open /tmp/sealed-avant.jpg /tmp/sealed-apres.jpg');
