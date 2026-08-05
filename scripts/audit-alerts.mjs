import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const t = await sql`SELECT table_name FROM information_schema.tables
  WHERE table_schema='public' AND (table_name ILIKE '%alert%' OR table_name ILIKE '%notif%'
     OR table_name ILIKE '%watch%' OR table_name ILIKE '%push%' OR table_name ILIKE '%device%')
  ORDER BY 1`
console.log('Tables:', t.map(x => x.table_name).join(', ') || '(aucune)')
for (const x of t) {
  const c = await sql.query(
    `SELECT column_name, data_type FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`, [x.table_name])
  const n = await sql.query(`SELECT count(*)::int AS n FROM "${x.table_name}"`)
  console.log(`\n── ${x.table_name} (${n[0].n} lignes)`)
  for (const col of c) console.log('   ', col.column_name.padEnd(24), col.data_type)
}
