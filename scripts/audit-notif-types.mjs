import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const r = await sql`SELECT type, title, dedup_key, data FROM notifications ORDER BY created_at DESC LIMIT 8`
for (const x of r) console.log(String(x.type).padEnd(18), String(x.title).slice(0,40).padEnd(42), 'dedup=', String(x.dedup_key ?? '—').slice(0,40), JSON.stringify(x.data ?? {}).slice(0,60))
