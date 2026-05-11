/**
 * Low-level Neon SQL client.
 * For typed queries with template literals.
 */
import { neon, neonConfig } from '@neondatabase/serverless'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

neonConfig.fetchConnectionCache = true

export const sql = neon(process.env.DATABASE_URL)
