// REPLAY AUTONOME : rejoue les échecs passés contre le résolveur actuel.
// Chaque miss converti en match s'auto-inscrit dans scan_aliases (le serveur
// apprend sur match exact) puis disparaît du corpus. Les ratés d'hier
// deviennent les alias de demain — sans humain. À chaque amélioration du
// résolveur, relancer ; le cron peut aussi le faire.
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const BASE = process.env.KODO_BASE || 'https://kodocards.com'
const misses = await sql`SELECT id, raw_read FROM scan_misses ORDER BY id ASC LIMIT 200`
let hit = 0, amb = 0, still = 0
for (const m of misses) {
  const body = { lines: m.raw_read?.lines ?? [], lang: m.raw_read?.lang ?? null }
  if (!body.lines.length) { await sql`DELETE FROM scan_misses WHERE id = ${m.id}`; continue }
  try {
    const r = await fetch(`${BASE}/api/v1/scan/resolve-lines`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const j = await r.json().catch(() => null)
    if (j?.status === 'match') { hit++; await sql`DELETE FROM scan_misses WHERE id = ${m.id}` }
    else if (j?.status === 'ambiguous') amb++
    else still++
  } catch { still++ }
  await new Promise((r) => setTimeout(r, 400)) // respecte le rate-limit public
}
console.log(`replay : ${misses.length} rejoués · ${hit} convertis (→ alias auto) · ${amb} ambigus · ${still} toujours ratés`)
