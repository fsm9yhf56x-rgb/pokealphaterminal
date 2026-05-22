import { neon } from '@neondatabase/serverless'
import { readFileSync } from 'fs'
import { config } from 'dotenv'

config({ path: '.env.production.local' })

const sql = neon(process.env.DATABASE_URL)
const migration = readFileSync('migrations/2026-05-22-psa-jp-set-mappings.sql', 'utf-8')

// Strip commentaires
const clean = migration
  .split('\n')
  .filter(l => !l.trim().startsWith('--'))
  .join('\n')

// Split sur ; seulement quand la ligne se termine par ; suivi d'un newline
// (ne split pas les ; à l'intérieur des parenthèses)
const statements = []
let current = ''
let parenDepth = 0

for (const char of clean) {
  current += char
  if (char === '(') parenDepth++
  if (char === ')') parenDepth--
  if (char === ';' && parenDepth === 0) {
    const stmt = current.trim().replace(/;$/, '')
    if (stmt) statements.push(stmt)
    current = ''
  }
}

console.log(`Found ${statements.length} statements\n`)

for (const stmt of statements) {
  const preview = stmt.split('\n')[0].slice(0, 70)
  try {
    await sql.unsafe(stmt)
    console.log('  OK', preview)
  } catch (e) {
    console.error('  KO', preview)
    console.error('     ', e.message)
  }
}

try {
  const r = await sql`SELECT COUNT(*) as n FROM psa_set_mappings`
  console.log(`\nTable psa_set_mappings ready. Rows: ${r[0].n}`)
} catch (e) {
  console.error('\nKO Verification failed:', e.message)
}
