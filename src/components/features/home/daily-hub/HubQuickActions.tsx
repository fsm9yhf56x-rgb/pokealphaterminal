'use client'

import { useRouter } from 'next/navigation'
import { GlassButton } from '@/components/ui/GlassButton'

/**
 * HubQuickActions — rangée de pills glass v7 d'accès rapide.
 * Référence visuelle du site : tous les boutons s'alignent sur GlassButton.
 */
const ACTIONS = [
  { label: 'Ajouter une carte', href: '/portfolio?add=1',      icon: 'plus' as const },
  { label: 'Pokédesk',          href: '/cartes',               icon: 'book' as const },
  { label: 'Marché',            href: '/market',               icon: 'chart' as const },
  { label: 'Mes objectifs',     href: '/portfolio/objectifs',  icon: 'target' as const },
]

export function HubQuickActions() {
  const router = useRouter()
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {ACTIONS.map((a) => (
        <GlassButton key={a.href} onClick={() => router.push(a.href)} icon={<Icon name={a.icon} />}>
          {a.label}
        </GlassButton>
      ))}
    </div>
  )
}

function Icon({ name }: { name: 'plus' | 'book' | 'chart' | 'target' }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'plus')  return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'book')  return <svg {...common}><path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2zM17 3h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6" /></svg>
  if (name === 'chart') return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  return <svg {...common}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="5" /></svg>
}
