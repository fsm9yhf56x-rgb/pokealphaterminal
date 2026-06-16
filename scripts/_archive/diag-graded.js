require('dotenv').config({ path: '.env.production.local', quiet: true })

async function getQ() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL manquant dans .env.production.local')
  try {
    const { neon } = require('@neondatabase/serverless')
    const sql = neon(url)
    return async (text) => await sql.query(text)
  } catch (e) {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: url })
    return async (text) => (await pool.query(text)).rows
  }
}

async function main() {
  const q = await getQ()

  const cols = await q(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'prices_snapshots'
    ORDER BY ordinal_position
  `)
  console.log('\n===== COLONNES prices_snapshots =====')
  for (const c of cols) console.log('  ' + String(c.column_name).padEnd(22) + c.data_type)

  const sv = await q(`
    SELECT source, variant, COUNT(*)::int AS n,
           MIN(fetched_at)::date AS first_day,
           MAX(fetched_at)::date AS last_day
    FROM prices_snapshots
    GROUP BY source, variant
    ORDER BY n DESC
    LIMIT 80
  `)
  console.log('\n===== source x variant (top 80) =====')
  for (const r of sv) {
    console.log('  ' + String(r.source).padEnd(14) + String(r.variant).padEnd(18) + 'n=' + String(r.n).padEnd(9) + r.first_day + ' -> ' + r.last_day)
  }

  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
