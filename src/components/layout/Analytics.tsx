'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import { getCookieConsent } from './CookieConsent'

/**
 * Analytics first-party. Monté une fois dans le layout racine.
 *  - page_view automatique à chaque changement de route.
 *  - track(event, props) appelable depuis n'importe quel composant client.
 *
 * Gating base légale (le SERVEUR reste l'arbitre : il résout user_id via la session) :
 *  - connecté             -> intérêt légitime.
 *  - anonyme + consent     -> consentement statistiques (avec anon_id).
 *  - anonyme sans consent  -> ignoré, une fois l'auth confirmée.
 *  - auth pas encore prête -> on envoie quand même, le serveur tranchera.
 */

const ctx: { userId: string | null; authReady: boolean; anonId: string | null; sessionId: string | null } = {
  userId: null, authReady: false, anonId: null, sessionId: null,
}

function uuid(): string {
  try { return crypto.randomUUID() } catch { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
}

function statsConsent(): boolean {
  return !!getCookieConsent()?.statistics
}

function ensureSession(): string | null {
  if (!ctx.userId && !statsConsent()) return null
  if (ctx.sessionId) return ctx.sessionId
  try {
    let sid = sessionStorage.getItem('kodo_sid')
    if (!sid) { sid = uuid(); sessionStorage.setItem('kodo_sid', sid) }
    ctx.sessionId = sid
    return sid
  } catch { ctx.sessionId = uuid(); return ctx.sessionId }
}

function ensureAnon(): string | null {
  if (ctx.userId) return null
  if (!statsConsent()) return null
  if (ctx.anonId) return ctx.anonId
  try {
    let aid = localStorage.getItem('kodo_anon')
    if (!aid) { aid = uuid(); localStorage.setItem('kodo_anon', aid) }
    ctx.anonId = aid
    return aid
  } catch { ctx.anonId = uuid(); return ctx.anonId }
}

function readUtm(): Record<string, string> | null {
  try {
    const p = new URLSearchParams(window.location.search)
    const utm: Record<string, string> = {}
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      const v = p.get(k)
      if (v) utm[k.replace('utm_', '')] = v
    }
    return Object.keys(utm).length ? utm : null
  } catch { return null }
}

export function track(event: string, props?: Record<string, any>) {
  if (typeof window === 'undefined') return
  const loggedIn = !!ctx.userId
  const stats = statsConsent()
  // Sûr que c'est un anonyme sans consentement (auth confirmée) -> on n'envoie pas.
  if (!loggedIn && !stats && ctx.authReady) return
  const consent = loggedIn ? 'legitimate' : (stats ? 'statistics' : 'legitimate')
  const payload = {
    event,
    props: props || null,
    path: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    anon_id: ensureAnon(),
    session_id: ensureSession(),
    consent,
    utm: readUtm(),
  }
  try {
    const body = JSON.stringify(payload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', new Blob([body], { type: 'application/json' }))
    } else {
      fetch('/api/analytics/track', { method: 'POST', body, keepalive: true, headers: { 'Content-Type': 'application/json' } })
    }
  } catch { /* silencieux */ }
}

export default function Analytics() {
  const { user, loading } = useAuth()
  const pathname = usePathname()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    ctx.userId = user?.id || null
    ctx.authReady = !loading
  }, [user?.id, loading])

  useEffect(() => {
    if (!pathname) return
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    const t = setTimeout(() => track('page_view'), 60)
    return () => clearTimeout(t)
  }, [pathname])

  return null
}
