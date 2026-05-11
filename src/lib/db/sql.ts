/**
 * Low-level Neon SQL client (lazy-init, build-safe).
 * 
 * The neon() client is created on first use, not at module load,
 * so build-time evaluation doesn't crash if DATABASE_URL is missing.
 */
import { neon, type NeonQueryFunction } from '@neondatabase/serverless'

let _sql: NeonQueryFunction<false, false> | null = null

function getSql(): NeonQueryFunction<false, false> {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set')
    }
    _sql = neon(process.env.DATABASE_URL)
  }
  return _sql
}

// Proxy that supports both call syntax (sql`...` template literal)
// and property access (sql.query(...)).
export const sql = new Proxy(
  function placeholder() {} as unknown as NeonQueryFunction<false, false>,
  {
    apply(_target, _thisArg, args) {
      return (getSql() as any).apply(null, args)
    },
    get(_target, prop) {
      const s = getSql()
      const val = (s as any)[prop]
      return typeof val === 'function' ? val.bind(s) : val
    },
  },
)
