import { neon } from '@neondatabase/serverless'
import fs from 'node:fs'
const env = fs.readFileSync('.env.local','utf8')
const sql = neon(env.match(/^DATABASE_URL=(.+)$/m)[1].trim().replace(/^["']|["']$/g,''))
const r = await sql`SELECT source, tier, count(*) AS n
  FROM price_matrix
  WHERE tier NOT LIKE 'PSA/_%' ESCAPE '/' AND tier NOT LIKE 'BGS/_%' ESCAPE '/'
    AND tier NOT LIKE 'CGC/_%' ESCAPE '/' AND tier NOT LIKE 'SGC/_%' ESCAPE '/'
    AND tier NOT LIKE 'CCC/_%' ESCAPE '/' AND tier NOT LIKE 'PCA/_%' ESCAPE '/'
    AND tier NOT LIKE 'ACE/_%' ESCAPE '/' AND tier NOT LIKE 'TAG/_%' ESCAPE '/'
  GROUP BY 1,2 ORDER BY 1, 3 DESC`
for (const x of r) console.log(String(x.source).padEnd(22), String(x.tier).padEnd(20), x.n)
