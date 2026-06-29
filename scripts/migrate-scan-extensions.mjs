// Migration extensions pour le scan (resolveur nom+numero).
// Idempotent : sans effet si deja applique. Lancer avec :
//   DATABASE_URL=$(grep -m1 '^DATABASE_URL' .env.production.local | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//') node scripts/migrate-scan-extensions.mjs
import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)
await sql`CREATE EXTENSION IF NOT EXISTS unaccent`
await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`
// Index trigram pour la recherche floue de nom (sans unaccent : non-immutable).
await sql`CREATE INDEX IF NOT EXISTS idx_kcards_name_trgm ON k_cards USING gin (lower(name_localized) gin_trgm_ops)`
const ext = await sql`SELECT extname FROM pg_extension WHERE extname IN ('unaccent','pg_trgm') ORDER BY extname`
console.log('extensions : ' + ext.map(e => e.extname).join(', ') + ' + index idx_kcards_name_trgm OK')
process.exit(0)
