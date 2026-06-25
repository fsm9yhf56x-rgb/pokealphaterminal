/**
 * Next.js 16 proxy (renamed from middleware.ts in Next 16+).
 *
 * For Better Auth: session ops handled by /api/auth/* catch-all.
 * Purpose here: lightweight route protection (cookie presence check).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

const PROTECTED_PATHS = [
  '/admin',
  '/parametres',
  '/dev-ui',
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const needsAuth = PROTECTED_PATHS.some((p) => pathname.startsWith(p))
  if (!needsAuth) return NextResponse.next()

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    const loginUrl = new URL('/', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
