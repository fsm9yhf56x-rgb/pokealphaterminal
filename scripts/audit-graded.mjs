import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.existsSync('.env.local') ? fs.readFileSync('.env.local','utf8') : ''
const url = process.env.DATABASE_URL || env.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g,'')
const sql = neon(url)
const rows = await sql`
  SELECT pc.name, pc.condition,
    (SELECT count(*) FROM price_matrix pm WHERE pm.kodo_card_id = pc.k_card_id) AS lignes,
    (SELECT string_agg(DISTINCT pm.tier || '/' || pm.source || (CASE WHEN pm.is_asking THEN '(ask)' ELSE '' END), ', ')
       FROM price_matrix pm WHERE pm.kodo_card_id = pc.k_card_id
        AND pm.tier ~ '^(PSA|BGS|CGC|SGC|CCC|PCA|ACE|TAG)_') AS grades
  FROM portfolio_cards pc
  WHERE pc.graded = true AND pc.card_number <> 'SEALED' ORDER BY pc.name`
for (const r of rows)
  console.log(`${String(r.name).padEnd(22).slice(0,22)} ${String(r.condition).padEnd(10)} lignes=${String(r.lignes).padStart(3)}  gradés: ${r.grades ?? '—'}`)
