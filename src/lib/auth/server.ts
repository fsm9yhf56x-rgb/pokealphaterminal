/**
 * Better Auth — server-side configuration (lazy-init, build-safe).
 *
 * The auth instance is created on first ACTUAL USE (function call),
 * not on the first property access. This prevents Next.js page-data
 * collection from crashing when env vars are missing at build time.
 */
import { betterAuth, type Auth, type BetterAuthOptions } from 'better-auth'
import { bearer } from 'better-auth/plugins'
import { Pool } from '@neondatabase/serverless'
import { sendEmail } from '@/lib/email/resend'
import ResetPasswordEmail from '@/emails/ResetPasswordEmail'

let _auth: Auth<BetterAuthOptions> | null = null

function buildAuth(): Auth<BetterAuthOptions> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
  }

  // Build dynamic trustedOrigins list:
  // - localhost (dev)
  // - canonical prod domains
  // - any *.vercel.app URL (covers all preview deployments)
  // - VERCEL_URL injected at runtime (current deployment URL)
  const trustedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://kodocards.com',
    'https://www.kodocards.com',
    'https://kodocards.fr',
    'https://www.kodocards.fr',
    'https://pokealphaterminal.vercel.app',
    'https://pokealphaterminal.io',
  ]

  // Auto-add current Vercel deployment URL (always set on Vercel)
  if (process.env.VERCEL_URL) {
    trustedOrigins.push(`https://${process.env.VERCEL_URL}`)
  }

  // Optional: allow any Vercel preview via wildcard (Better Auth supports glob)
  trustedOrigins.push('https://*.vercel.app')

  const options: BetterAuthOptions = {
    database: new Pool({ connectionString: process.env.DATABASE_URL }),

    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
      sendResetPassword: async ({ user, url }) => {
        try {
          await sendEmail({
            to: user.email,
            subject: 'Réinitialise ton mot de passe Kodo Cards',
            react: ResetPasswordEmail({
              userName: user.name ?? undefined,
              resetUrl: url,
            }),
          })
        } catch (err) {
          console.error('[Better Auth] sendResetPassword failed', { email: user.email, error: err })
          throw err
        }
      },
    },

    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? {
      socialProviders: {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      },
    } : {}),

    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },

    trustedOrigins,

    // Bearer : permet l'auth par header Authorization (app mobile Expo).
    // Le web continue en cookies, strictement inchange.
    plugins: [bearer()],

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
export const auth = new Proxy({} as Auth<BetterAuthOptions>, {
  get(_target, prop) {
    if (prop === 'handler') {
      return (request: Request) => getAuth().handler(request)
    }
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
    return (getAuth() as any)[prop]
  },
})
