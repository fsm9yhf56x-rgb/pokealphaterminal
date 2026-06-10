'use client'

/**
 * PlanLockPanel — etat verrouille elegant pour les features gatees par plan.
 * Affiche a la place du contenu quand l'API renvoie 403 plan_required.
 * Fond decoratif flou (faux chart, illisible, purement evocateur), cadenas,
 * titre/description par variante, CTA vers /abonnement.
 */
import { SNOW, FONT } from '@/lib/design/snow'

type Variant = 'graded' | 'gradedHistory' | 'pop'

const COPY: Record<Variant, { title: string; desc: string }> = {
  graded: {
    title: 'Prix gradés détaillés',
    desc: 'Toutes cartes, toutes notes — PSA, CGC, BGS, PCA…',
  },
  gradedHistory: {
    title: 'Historique des prix gradés',
    desc: 'Évolution par société et par note, sur toute la profondeur disponible.',
  },
  pop: {
    title: 'PSA Pop Reports',
    desc: 'Rareté réelle de chaque carte : population certifiée par note.',
  },
}

// Plan requis par variante (le CTA s'adapte)
const NEED: Record<Variant, { plan: string; cta: string }> = {
  graded: { plan: 'premium', cta: 'Découvrir Premium' },
  gradedHistory: { plan: 'premium', cta: 'Découvrir Premium' },
  pop: { plan: 'pro', cta: 'Découvrir Pro' },
}

export function PlanLockPanel({ variant, compact = false }: { variant: Variant; compact?: boolean }) {
  const c = COPY[variant]
  // Faux mini-chart decoratif (barres aleatoires fixes, illisible derriere le blur)
  const bars = [42, 68, 35, 80, 55, 72, 48, 90, 60, 75]
  return (
    <div style={{
      position: 'relative', overflow: 'hidden',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.5)',
      border: '1px solid rgba(0,0,0,0.05)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.85)',
      padding: compact ? '28px 20px' : '44px 24px',
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center', gap: 10,
      textAlign: 'center' as const,
      minHeight: compact ? 160 : 240,
    }}>
      {/* Fond decoratif floute */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'flex-end', gap: 8,
        padding: '20px 24px',
        filter: 'blur(14px)', opacity: 0.35,
        pointerEvents: 'none' as const,
      }}>
        {bars.map((h, i) => (
          <div key={i} style={{
            flex: 1, height: `${h}%`, borderRadius: 6,
            background: i % 3 === 0 ? 'rgba(224,48,32,0.5)' : 'rgba(29,29,31,0.35)',
          }} />
        ))}
      </div>

      {/* Contenu */}
      <div style={{
        position: 'relative',
        width: 44, height: 44, borderRadius: 14,
        background: '#1D1D1F',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 6px 18px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#FFD60A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div style={{
        position: 'relative',
        fontSize: compact ? 14 : 16, fontWeight: 800, color: SNOW.ink,
        fontFamily: FONT.display, letterSpacing: '-0.01em', marginTop: 4,
      }}>{c.title}</div>
      <p style={{
        position: 'relative',
        fontSize: 12.5, color: SNOW.muted, fontFamily: FONT.body,
        lineHeight: 1.5, maxWidth: 300, margin: 0,
      }}>{c.desc}</p>
      <a href="/abonnement" style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 7,
        marginTop: 8, padding: '10px 20px', borderRadius: 12,
        background: SNOW.ink, color: '#fff',
        fontSize: 12.5, fontWeight: 700, fontFamily: FONT.display,
        textDecoration: 'none', letterSpacing: '0.02em',
        boxShadow: '0 4px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
      }}>
        {NEED[variant].cta}
        <span style={{ color: '#FF7A6E' }}>→</span>
      </a>
    </div>
  )
}
