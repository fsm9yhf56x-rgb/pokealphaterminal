// INDEXATION VISUELLE AUTONOME : dHash 256 bits de chaque image du catalogue.
// Reprise possible (saute l'existant) → cron-compatible. Encore un
// apprentissage sans humain : le catalogue s'auto-indexe.
import { neon } from '@neondatabase/serverless'
import sharp from 'sharp'
import fs from 'node:fs'
// DATABASE_URL depuis l'environnement d'abord (runner GitHub : pas de
// .env.local, les secrets arrivent en variables). Repli fichier en local.
const dbUrl = process.env.DATABASE_URL
  || fs.readFileSync('.env.local','utf8').match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,'')
const sql = neon(dbUrl)

export async function dhash256(buf) {
  const { data } = await sharp(buf).grayscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const h = [0n, 0n, 0n, 0n]
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const bit = data[y * 17 + x] > data[y * 17 + x + 1] ? 1n : 0n
    const i = y >> 2 // 4 rangées par bigint
    h[i] = (h[i] << 1n) | bit
  }
  // bigint signé 64 bits pour PG
  return h.map((v) => BigInt.asIntN(64, v))
}

const rows = await sql`
  SELECT kc.id, kc.image_url FROM k_cards kc
  LEFT JOIN card_phash cp ON cp.k_card_id = kc.id
  WHERE kc.has_image = true AND kc.image_url IS NOT NULL AND cp.k_card_id IS NULL
  ORDER BY kc.id LIMIT ${Number(process.env.BATCH || 2000)}`
console.log(`${rows.length} images à indexer…`)
let ok = 0, ko = 0
for (const r of rows) {
  try {
    const res = await fetch(r.image_url)
    if (!res.ok) throw new Error(String(res.status))
    const h = await dhash256(Buffer.from(await res.arrayBuffer()))
    await sql`INSERT INTO card_phash (k_card_id, h0, h1, h2, h3)
              VALUES (${r.id}, ${h[0]}, ${h[1]}, ${h[2]}, ${h[3]})
              ON CONFLICT (k_card_id) DO NOTHING`
    if (++ok % 200 === 0) console.log(`  ${ok}/${rows.length}`)
  } catch {
    ko++
    // SENTINELLE : l'échec est MARQUÉ (0,0,0,0) pour ne plus jamais être
    // re-tenté — les URLs cassées ne bouchent plus la fenêtre.
    await sql`INSERT INTO card_phash (k_card_id, h0, h1, h2, h3)
              VALUES (${r.id}, 0, 0, 0, 0) ON CONFLICT (k_card_id) DO NOTHING`
  }
}
const rest = await sql`
  SELECT count(*)::int AS n FROM k_cards kc
  LEFT JOIN card_phash cp ON cp.k_card_id = kc.id
  WHERE kc.has_image = true AND kc.image_url IS NOT NULL AND cp.k_card_id IS NULL`
console.log(`indexé: ${ok} · échecs marqués: ${ko} · RESTANT: ${rest[0].n}`)
