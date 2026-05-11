/**
 * Better Auth — server-side configuration (lazy-init, build-safe).
 *
 * The auth instance is created on first ACTUAL USE (function call or
 * property-after-property access), not on the first property access.
 *
 * This is necessary because Next.js evaluates `auth.handler` at module
 * load time (in the catch-all route), and we don't want that to throw
 * when DATABASE_URL is missing at build time.
 */
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth'
import { Pool } from '@neondatabase/serverless'

let _auth: Auth<BetterAuthOptions> | null = null

function buildAuth(): Auth<BetterAuthOptions> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  const options: BetterAuthOptions = {
    database: new Pool({ connectionString: process.env.DATABASE_URL }),

    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },

    socialProviders: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },

    trustedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://pokealphaterminal.vercel.app',
      'https://pokealphaterminal.io',
    ],

    baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3001',
    secret: process.env.BETTER_AUTH_SECRET,
  }

  return betterAuth(options) as Auth<BetterAuthOptions>
}

function getAuth(): Auth<BetterAuthOptions> {
  if (!_auth) _auth = buildAuth()
  return _auth
}

// Lazy-init proxy.
// Property access returns a wrapper that defers actual init until
// the wrapper is itself called or its properties are accessed.
// This way, `auth.handler` at module load doesn't trigger buildAuth().
export const auth = new Proxy({} as Auth<BetterAuthOptions>, {
  get(_target, prop) {
    // 'handler' is special: Next.js wraps it with toNextJsHandler at
    // module load. We return a function that lazy-resolves at call time.
    if (prop === 'handler') {
      return (request: Request) => {
        return getAuth().handler(request)
      }
    }

    // For 'api' (used by getCurrentUser, etc.), return a nested proxy
    // that lazy-resolves on method call.
    if (prop === 'api') {
      return new Proxy({} as Auth<BetterAuthOptions>['api'], {
        get(_t, method) {
          return (...args: any[]) => {
            const a = getAuth()
            return (a.api as any)[method](...args)
          }
        },
      })
    }

    // Other properties: evaluate eagerly (this WILL call buildAuth)
    return (getAuth() as any)[prop]
  },
})
