'use client'

import { useEffect, useState } from 'react'

/**
 * Bandeau de consentement cookies (CMP léger, conforme CNIL/RGPD).
 *
 * - Première visite : bandeau bas avec Tout accepter / Tout refuser / Personnaliser.
 * - Personnaliser : panneau avec les 5 catégories (nécessaires verrouillées ON).
 * - Choix stockés dans le cookie `kodo_cookie_consent` (6 mois).
 * - Réouvrable partout via l'événement 'kodo:open-cookie-settings'
 *   (déclenché par le lien « Gestion des cookies » du footer).
 * - Rien de non-essentiel n'est chargé sans consentement : les scripts futurs
 *   (analytics, etc.) devront lire getCookieConsent() avant de se charger.
 *
 * Aujourd'hui le site ne pose que des cookies strictement nécessaires
 * (session Better Auth) : les autres catégories sont donc sans effet tant
 * qu'aucun outil correspondant n'est ajouté.
 */

export type CookieCategory = 'necessary' | 'statistics' | 'marketing' | 'functional' | 'social'
export interface CookieConsentValue {
  v: number
  ts: number
  necessary: true
  statistics: boolean
  marketing: boolean
  functional: boolean
  social: boolean
}

const CONSENT_COOKIE = 'kodo_cookie_consent'
const CONSENT_VERSION = 1
const MAX_AGE = 60 * 60 * 24 * 182 // ~6 mois

const OPTIONAL: { key: Exclude<CookieCategory, 'necessary'>; label: string; desc: string }[] = [
  { key: 'statistics', label: 'Statistiques', desc: 'Comprendre comment les visiteurs interagissent avec le site (nombre de visiteurs, source de trafic, etc.).' },
  { key: 'marketing', label: 'Marketing', desc: 'Vous proposer des publicités personnalisées.' },
  { key: 'functional', label: 'Fonctionnels', desc: 'Améliorer et personnaliser votre expérience en mémorisant vos préférences.' },
  { key: 'social', label: 'Réseaux sociaux', desc: 'Permettre le partage de contenus du site sur d’autres plateformes.' },
]

export function getCookieConsent(): CookieConsentValue | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/(?:^|;\s*)kodo_cookie_consent=([^;]+)/)
  if (!m) return null
  try {
    const c = JSON.parse(decodeURIComponent(m[1]))
    return c && c.v === CONSENT_VERSION ? c : null
  } catch {
    return null
  }
}

function writeConsent(c: CookieConsentValue) {
  const val = encodeURIComponent(JSON.stringify(c))
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${val}; Max-Age=${MAX_AGE}; Path=/; SameSite=Lax${secure}`
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)
  const [prefs, setPrefs] = useState({ statistics: false, marketing: false, functional: false, social: false })

  useEffect(() => {
    const existing = getCookieConsent()
    if (!existing) {
      setOpen(true)
    } else {
      setPrefs({
        statistics: !!existing.statistics,
        marketing: !!existing.marketing,
        functional: !!existing.functional,
        social: !!existing.social,
      })
    }
    const reopen = () => { setShowPrefs(true); setOpen(true) }
    window.addEventListener('kodo:open-cookie-settings', reopen)
    return () => window.removeEventListener('kodo:open-cookie-settings', reopen)
  }, [])

  function persist(values: { statistics: boolean; marketing: boolean; functional: boolean; social: boolean }) {
    writeConsent({ v: CONSENT_VERSION, ts: Date.now(), necessary: true, ...values })
    setPrefs(values)
    setOpen(false)
    setShowPrefs(false)
  }

  const acceptAll = () => persist({ statistics: true, marketing: true, functional: true, social: true })
  const refuseAll = () => persist({ statistics: false, marketing: false, functional: false, social: false })
  const saveChoices = () => persist(prefs)

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-label="Gestion des cookies"
      style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        zIndex: 2147483000,
        display: 'flex', justifyContent: 'center',
        padding: 16,
        pointerEvents: 'none',
      }}
    >
      <div style={{
        pointerEvents: 'auto',
        width: '100%', maxWidth: 720,
        background: 'rgba(255,255,255,0.98)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid #E5E5EA',
        borderRadius: 18,
        boxShadow: '0 24px 64px rgba(0,0,0,0.20), 0 4px 12px rgba(0,0,0,0.08)',
        padding: '22px 24px',
        fontFamily: "var(--font-dm, 'DM Sans', system-ui, sans-serif)",
        color: '#1D1D1F',
      }}>
        <div style={{
          fontFamily: "var(--font-sora, 'Sora', sans-serif)",
          fontWeight: 700, fontSize: 16, letterSpacing: '-0.02em', marginBottom: 8,
        }}>Vos préférences de cookies</div>

        <p style={{ fontSize: 13.5, lineHeight: 1.55, color: '#3A3A3C', margin: '0 0 16px' }}>
          Nous utilisons des cookies strictement nécessaires au fonctionnement du site. Avec votre accord, nous
          pourrions aussi utiliser des cookies optionnels (statistiques, etc.). Vous pouvez accepter, refuser ou
          personnaliser vos choix. Plus d’informations dans notre{' '}
          <a href="/legal/cookies" style={{ color: '#E03020', textDecoration: 'underline' }}>politique de cookies</a>.
        </p>

        {showPrefs && (
          <div style={{ margin: '0 0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Nécessaires : verrouillé */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#F5F5F7', border: '1px solid #E5E5EA' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Nécessaires <span style={{ color: '#6E6E73', fontWeight: 500 }}>· toujours actifs</span></div>
                <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2, lineHeight: 1.45 }}>Indispensables au fonctionnement du site (session de connexion, mémorisation de vos choix de cookies).</div>
              </div>
              <input type="checkbox" checked disabled style={{ marginTop: 3, width: 16, height: 16, accentColor: '#86868B' }} />
            </div>

            {OPTIONAL.map(cat => (
              <label key={cat.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 10, background: '#fff', border: '1px solid #E5E5EA', cursor: 'pointer' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: '#6E6E73', marginTop: 2, lineHeight: 1.45 }}>{cat.desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={prefs[cat.key]}
                  onChange={e => setPrefs(prev => ({ ...prev, [cat.key]: e.target.checked }))}
                  style={{ marginTop: 3, width: 16, height: 16, accentColor: '#E03020', cursor: 'pointer', flexShrink: 0 }}
                />
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
          {!showPrefs && (
            <button onClick={() => setShowPrefs(true)} style={linkBtn}>Personnaliser</button>
          )}
          {showPrefs && (
            <button onClick={saveChoices} style={linkBtn}>Enregistrer mes choix</button>
          )}
          <button onClick={refuseAll} style={secondaryBtn}>Tout refuser</button>
          <button onClick={acceptAll} style={primaryBtn}>Tout accepter</button>
        </div>
      </div>
    </div>
  )
}

const baseBtn: React.CSSProperties = {
  fontFamily: "var(--font-sora, 'Sora', sans-serif)",
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  padding: '10px 18px', borderRadius: 999, transition: 'all .15s',
}
const primaryBtn: React.CSSProperties = { ...baseBtn, background: '#E03020', color: '#fff', border: '1px solid #E03020' }
const secondaryBtn: React.CSSProperties = { ...baseBtn, background: '#fff', color: '#1D1D1F', border: '1px solid #C7C7CC' }
const linkBtn: React.CSSProperties = { ...baseBtn, background: 'transparent', color: '#6E6E73', border: 'none', padding: '10px 8px', textDecoration: 'underline' }
