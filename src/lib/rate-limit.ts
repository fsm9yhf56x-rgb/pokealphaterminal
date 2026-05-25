/**
 * Rate limiting wrapper — Upstash Redis sliding window.
 *
 * Lazy-init Redis (build-safe pattern, same as auth/server.ts).
 *
 * Tiers de protection :
 *   - loginLimiter        : 5 tentatives / 15 min  (anti brute-force)
 *   - signupLimiter       : 3 créations / 1 heure  (anti spam compte)
 *   - passwordResetLimiter: 3 demandes / 1 heure   (anti spam Resend)
 *   - globalAuthLimiter   : 30 req / 1 min         (fallback DDoS)
 *
 * v0.9 Infrastructure Solide · Lot G
 */

import { NextResponse } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─────────────────────────────────────────────────────────────────────────
// Lazy-init Redis (build-safe sans env vars)
// ─────────────────────────────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (_redis) return _redis
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error('UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is not set')
  }
  _redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
  return _redis
}

// ─────────────────────────────────────────────────────────────────────────
// Limiters par catégorie (lazy-init via Proxy)
// ─────────────────────────────────────────────────────────────────────────

function makeLimiter(opts: {
  prefix: string
  requests: number
  window: `${number} s` | `${number} m` | `${number} h` | `${number} d`
}): Ratelimit {
  return new Ratelimit({
    redis: getRedis(),
    limiter: Ratelimit.slidingWindow(opts.requests, opts.window),
    prefix: `kc:${opts.prefix}`,
    analytics: true,
  })
}

// Lazy-init des limiters (créés à la première utilisation)
let _loginLimiter: Ratelimit | null = null
let _signupLimiter: Ratelimit | null = null
let _passwordResetLimiter: Ratelimit | null = null
let _globalAuthLimiter: Ratelimit | null = null

function loginLimiter() {
  if (!_loginLimiter) _loginLimiter = makeLimiter({ prefix: 'login', requests: 5, window: '15 m' })
  return _loginLimiter
}

function signupLimiter() {
  if (!_signupLimiter) _signupLimiter = makeLimiter({ prefix: 'signup', requests: 3, window: '1 h' })
  return _signupLimiter
}

function passwordResetLimiter() {
  if (!_passwordResetLimiter) _passwordResetLimiter = makeLimiter({ prefix: 'pwreset', requests: 3, window: '1 h' })
  return _passwordResetLimiter
}

function globalAuthLimiter() {
  if (!_globalAuthLimiter) _globalAuthLimiter = makeLimiter({ prefix: 'global', requests: 30, window: '1 m' })
  return _globalAuthLimiter
}

// ─────────────────────────────────────────────────────────────────────────
// Extraction IP client (Vercel + dev local)
// ─────────────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0].trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

// ─────────────────────────────────────────────────────────────────────────
// Détection endpoint Better Auth → limiter approprié
// ─────────────────────────────────────────────────────────────────────────

function pickLimiter(pathname: string): Ratelimit {
  if (pathname.includes('/sign-in')) return loginLimiter()
  if (pathname.includes('/sign-up')) return signupLimiter()
  if (pathname.includes('/request-password-reset')) return passwordResetLimiter()
  if (pathname.includes('/forget-password')) return passwordResetLimiter()
  // Fallback : limite globale pour tout autre endpoint auth
  return globalAuthLimiter()
}

// ─────────────────────────────────────────────────────────────────────────
// API publique : checkAuthRateLimit
// ─────────────────────────────────────────────────────────────────────────

/**
 * Vérifie le rate limit pour une requête auth.
 *
 * @returns null si OK (continuer), NextResponse 429 si limite atteinte
 */
export async function checkAuthRateLimit(req: Request): Promise<NextResponse | null> {
  // Skip rate limit si Upstash pas configuré (dev local sans Upstash, par exemple)
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[rate-limit] Upstash not configured, skipping rate limit (dev only)')
    }
    return null
  }

  try {
    const ip = getClientIp(req)
    const url = new URL(req.url)
    const limiter = pickLimiter(url.pathname)
    const identifier = `${ip}:${url.pathname}`

    const { success, limit, remaining, reset } = await limiter.limit(identifier)

    if (!success) {
      const retryAfterSeconds = Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      console.warn('[rate-limit] BLOCKED', {
        ip,
        pathname: url.pathname,
        limit,
        remaining,
        retryAfterSeconds,
      })
      return NextResponse.json(
        {
          message: 'Trop de tentatives. Réessaie dans quelques minutes.',
          code: 'RATE_LIMITED',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSeconds),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
            'X-RateLimit-Reset': String(Math.ceil(reset / 1000)),
          },
        }
      )
    }

    return null
  } catch (err) {
    // Fail-open : si Upstash est down, on laisse passer pour ne pas bloquer l'auth
    // Bedrock note : à monitorer en prod via Sentry
    console.error('[rate-limit] Upstash error, failing open', err)
    return null
  }
}
