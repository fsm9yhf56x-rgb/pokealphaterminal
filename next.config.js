/**
 * Next.js configuration — Kodo Cards
 *
 * Security headers applied on every route via headers() function.
 * Reference: https://nextjs.org/docs/app/api-reference/next-config-js/headers
 *
 * v0.9 Infrastructure Solide · Lot H
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Tous les paths sauf les assets statiques
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Security Headers
// ─────────────────────────────────────────────────────────────────────────
//
// Strict mode for headers that have zero risk of breaking anything :
//   - HSTS (force HTTPS for 2 years)
//   - X-Frame-Options DENY (anti-clickjacking)
//   - X-Content-Type-Options nosniff (anti MIME sniffing)
//   - Referrer-Policy (limite fuite referer)
//   - Permissions-Policy (désactive camera/mic/geo inutiles)
//
// Content-Security-Policy in REPORT-ONLY mode for v0.9 :
//   logge les violations sans bloquer. Permet de découvrir
//   ce qui poserait souci avant d'activer le strict mode (v1.0 Phase B).
// ─────────────────────────────────────────────────────────────────────────

const isDev = process.env.NODE_ENV === 'development'

// CSP en report-only — relaxe pour ne rien casser, juste logger
const cspReportOnly = [
  "default-src 'self'",
  // Scripts: self + Vercel analytics + inline (Next.js needs it) + eval pour HMR dev
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  // Styles: self + inline (Snow+ utilise styles inline)
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts: self + Google Fonts (Sora, DM Sans, Space Mono via next/font)
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: self + R2 (catalogue cartes) + Resend tracking + Vercel
  "img-src 'self' data: blob: https://pub-1aade8805ea544358d85a303c1feef41.r2.dev https://*.r2.dev https://*.vercel.app https://*.kodocards.com",
  // Connect: self + Better Auth + Neon + Resend + R2
  "connect-src 'self' https://*.neon.tech https://api.resend.com https://*.r2.dev https://va.vercel-scripts.com",
  // Frames: deny (anti-clickjacking)
  "frame-ancestors 'none'",
  // Forms: self only (anti-CSRF)
  "form-action 'self'",
  // Base URI: self only
  "base-uri 'self'",
  // Object: deny (anti-Flash/PDF embed)
  "object-src 'none'",
  // Mixed content: upgrade HTTP → HTTPS
  "upgrade-insecure-requests",
].filter(Boolean).join('; ')

const securityHeaders = [
  // HSTS : force HTTPS pour 2 ans + sous-domaines + preload list
  // Bedrock : 0 risque, Vercel force déjà HTTPS
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Anti-clickjacking : interdit l'embed en iframe
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // Anti MIME sniffing : force respect du Content-Type déclaré
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer policy : envoie origin seule en cross-origin (anti leak)
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // Désactive APIs sensibles qu'on n'utilise pas
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(self)',
  },
  // CSP en REPORT-ONLY pour v0.9 — détection sans blocage
  // Sera passé en strict mode en v1.0 Phase B après audit logs Sentry
  {
    key: 'Content-Security-Policy-Report-Only',
    value: cspReportOnly,
  },
  // X-DNS-Prefetch-Control : autorise DNS prefetch (perf)
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
]

module.exports = nextConfig
