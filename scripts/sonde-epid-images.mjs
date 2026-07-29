// scripts/sonde-epid-images.mjs
// Teste si la page produit publique eBay (ebay.fr/p/{epid}) expose une photo de CATALOGUE
// propre, par sa balise og:image — la meme balise que lit n'importe quel apercu de lien.
// N'ECRIT RIEN. Produit une planche contact pour jugement visuel.
//
//   node scripts/sonde-epid-images.mjs
//   -> /tmp/epid-images.jpg

import { neon } from '@neondatabase/serverless';
import sharp from 'sharp';
import { writeFile } from 'fs/promises';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const CELL = 190, COLS = 8;
const BG = { r: 245, g: 245, b: 247 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ogImage(html) {
  const pats = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /"image"\s*:\s*"(https:\/\/i\.ebayimg\.com[^"]+)"/i,
  ];
  for (const p of pats) { const m = p.exec(html); if (m) return m[1].replace(/&amp;/g, '&'); }
  return null;
}

/** monte la resolution : eBay encode la taille dans le nom (s-l225 -> s-l1600) */
function upscale(url) {
  return url.replace(/\/s-l\d+\./, '/s-l1600.');
}

async function edgeScore(buf) {
  const meta = await sharp(buf).metadata();
  const W = meta.width || 0, H = meta.height || 0;
  if (!W || !H) return null;
  const bw = Math.max(2, Math.round(W * 0.04)), bh = Math.max(2, Math.round(H * 0.04));
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
  mean /= 4; sd /= 4;
  const clarte = Math.max(0, Math.min(1, (mean - 170) / 80));
  const unif = Math.max(0, Math.min(1, 1 - sd / 45));
  return { mean: Math.round(mean), sd: Math.round(sd), score: Math.round(clarte * unif * 100), W, H };
}

const rows = await sql.query(
  `SELECT id, name, ebay_epid FROM k_sealed_products
    WHERE lang='fr' AND ebay_epid IS NOT NULL ORDER BY id`
);
console.log(rows.length + ' produits avec epid\n');

const vignettes = [], scores = [];
let sansOg = 0, bloque = 0;

for (let i = 0; i < rows.length; i++) {
  const r = rows[i];
  try {
    const page = await fetch('https://www.ebay.fr/p/' + r.ebay_epid, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'fr-FR,fr;q=0.9' },
      signal: AbortSignal.timeout(15000),
    });
    if (!page.ok) { bloque++; console.log('  ' + page.status + ' sur epid ' + r.ebay_epid); await sleep(600); continue; }
    const html = await page.text();
    const og = ogImage(html);
    if (!og) { sansOg++; await sleep(600); continue; }

    const img = await fetch(upscale(og), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(15000) });
    if (!img.ok) { sansOg++; await sleep(600); continue; }
    const buf = Buffer.from(await img.arrayBuffer());

    const sc = await edgeScore(buf);
    if (sc) scores.push({ id: r.id, name: r.name, url: upscale(og), ...sc });

    vignettes.push(await sharp(buf)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .resize(CELL - 12, CELL - 12, { fit: 'contain', background: BG })
      .extend({ top: 6, bottom: 6, left: 6, right: 6, background: BG })
      .toFormat('jpeg', { quality: 88 }).toBuffer());
  } catch (e) {
    bloque++;
  }
  if ((i + 1) % 15 === 0) console.log('  ' + (i + 1) + '/' + rows.length);
  await sleep(700);
}

if (vignettes.length) {
  const lignes = Math.ceil(vignettes.length / COLS);
  const png = await sharp({ create: { width: COLS * CELL, height: lignes * CELL, channels: 3, background: BG } })
    .composite(vignettes.map((input, i) => ({ input, left: (i % COLS) * CELL, top: Math.floor(i / COLS) * CELL })))
    .toFormat('jpeg', { quality: 86 }).toBuffer();
  await writeFile('/tmp/epid-images.jpg', png);
  console.log('\n  ecrit /tmp/epid-images.jpg  (' + vignettes.length + ' vignettes)');
}

scores.sort((a, b) => b.score - a.score);
console.log('\n================ CATALOGUE EBAY ================');
console.log('  images recuperees   : ' + scores.length + '/' + rows.length);
console.log('  sans og:image       : ' + sansOg);
console.log('  bloque / erreur     : ' + bloque);
console.log('  fond propre (>=70)  : ' + scores.filter((s) => s.score >= 70).length);
console.log('  moyen (40-69)       : ' + scores.filter((s) => s.score >= 40 && s.score < 70).length);
console.log('  fond charge (<40)   : ' + scores.filter((s) => s.score < 40).length);
console.log('\n  meilleures :');
for (const s of scores.slice(0, 8)) {
  console.log('   ' + String(s.score).padStart(3) + ' | ' + String(s.W) + 'x' + String(s.H) + ' | ' + s.id.padEnd(30) + ' ' + (s.name || '').slice(0, 34));
}
console.log('\n  pires :');
for (const s of scores.slice(-5)) {
  console.log('   ' + String(s.score).padStart(3) + ' | ' + s.id.padEnd(30) + ' ' + (s.name || '').slice(0, 34));
}
console.log('\nopen /tmp/epid-images.jpg');
