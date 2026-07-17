import { neon } from '@neondatabase/serverless'

const dsn = process.env.DATABASE_URL
if (!dsn) {
  console.error('DATABASE_URL manquante')
  process.exit(1)
}
const sql = neon(dsn)

const main = async () => {
  const before = await sql`SELECT count(*)::int AS n FROM news_cache`
  console.log('lignes en cache avant :', before[0].n)

  await sql`ALTER TABLE news_cache ADD COLUMN IF NOT EXISTS url text`
  console.log('colonne url : ok')

  // Les lignes existantes ont ete ecrites sans URL : elles ne peuvent pas etre
  // reparees (l'article est peut-etre deja sorti des flux). On purge, la route
  // regenere tout au 1er chargement, cette fois avec le lien source.
  await sql`DELETE FROM news_cache`
  console.log('cache purge, il se regenere au prochain chargement du Daily Hub')

  const cols = await sql`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'news_cache'
    ORDER BY ordinal_position`
  console.log('schema news_cache :')
  for (const c of cols) console.log('  -', c.column_name, ':', c.data_type)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
