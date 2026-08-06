// PRÉ-ENTRAÎNEMENT AUTONOME v2 — batch unnest : ~30 s au lieu de 30 min.
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const idx = JSON.parse(fs.readFileSync('src/lib/scan/set-index.json','utf8'))
const totalOf = new Map(idx.map(e => [String(e.id).toLowerCase().replace(/[^a-z0-9]/g,''), e.printedTotal]))
const rows = await sql`
  SELECT kc.id, kp.set_id, kp.number, lower(unaccent(coalesce(kc.name_localized, kp.name_en, ''))) AS nm
  FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id`
const uniq = new Map()
for (const r of rows) {
  const t = totalOf.get(String(r.set_id).toLowerCase().replace(/[^a-z0-9]/g,''))
  const n = String(r.number).replace(/^0+(?=\d)/,'')
  if (t) { const k = `nt:${n}/${t}`; uniq.set(k, uniq.has(k) ? null : r.id) }
  if (r.nm) { const k = `name:${r.nm}#${n}`; uniq.set(k, uniq.has(k) ? null : r.id) }
}
const keys = [], ids = []
for (const [k, id] of uniq) if (id) { keys.push(k); ids.push(id) }
console.log(`${keys.length} alias déterministes à écrire…`)
for (let i = 0; i < keys.length; i += 5000) {
  await sql`
    INSERT INTO scan_aliases (read_key, k_card_id)
    SELECT * FROM unnest(${keys.slice(i, i+5000)}::text[], ${ids.slice(i, i+5000)}::text[])
    ON CONFLICT (read_key, k_card_id) DO NOTHING`
  console.log(`  ${Math.min(i+5000, keys.length)}/${keys.length}`)
}
console.log('pré-entraînement terminé.')
