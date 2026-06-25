import { NextResponse, type NextRequest } from 'next/server'

/**
 * Middleware - filet pour les pages purement perso (reglages, admin, dev).
 *
 * On NE redirige PAS /home ni /portfolio : ces pages ont un mur de conversion
 * (GuestWall) qui TEASE l'invite plutot que de le renvoyer. /market et /alpha
 * sont geres par PersonaGuard (et /market garde son mode ?preview=1).
 *
 * Detection LARGE du cookie de session Better Auth : on verifie seulement sa
 * presence (pas de verif crypto en edge - la page/API revalide derriere). Le
 * sens d'echec est sur : au pire un invite passe (la page revalide), jamais un
 * utilisateur connecte bloque (son cookie contient toujours "session_token").
 */
export function middleware(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.includes('session_token') || c.name.startsWith('better-auth'))

  if (!hasSession) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', request.nextUrl.pathname + request.nextUrl.search)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/parametres/:path*', '/admin/:path*', '/dev-ui/:path*'],
}
