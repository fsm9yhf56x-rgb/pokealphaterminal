// AUDIT : mémoire du scan + derniers échecs (corpus scan_misses)
import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const a = await sql`SELECT count(*)::int AS n, count(*) FILTER (WHERE confirmations > 1)::int AS renforces FROM scan_aliases`
const m = await sql`SELECT count(*)::int AS n FROM scan_misses`
console.log(`aliases: ${a[0].n} (${a[0].renforces} renforcés par l'usage) · misses: ${m[0].n}`)
const last = await sql`SELECT id, raw_read->'lines' AS lines FROM scan_misses ORDER BY id DESC LIMIT 8`
for (const x of last) console.log(' miss', x.id, JSON.stringify(x.lines).slice(0, 110))
