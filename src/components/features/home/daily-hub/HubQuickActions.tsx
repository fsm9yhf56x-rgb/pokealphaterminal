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
    <>
      <style>{`
        .hub-quick-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        /* Desktop : rangee compacte. On neutralise le fullWidth (width:100% inline)
           pour que les pills gardent la largeur de leur contenu, alignees a gauche. */
        @media (min-width: 641px) {
          .hub-quick-actions > button { width: auto !important; }
        }
        /* Mobile : grille 2x2 a colonnes egales, bords alignes (fullWidth actif) */
        @media (max-width: 640px) {
          .hub-quick-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .hub-quick-actions > button { justify-content: flex-start; }
        }
      `}</style>
      <div className="hub-quick-actions">
        {ACTIONS.map((a) => (
          <GlassButton
            key={a.href}
            onClick={() => router.push(a.href)}
            icon={<Icon name={a.icon} />}
            fullWidth
          >
            {a.label}
          </GlassButton>
        ))}
      </div>
    </>
  )
}

function Icon({ name }: { name: 'plus' | 'book' | 'chart' | 'target' }) {
  const common = { width: 15, height: 15, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (name === 'plus')  return <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
  if (name === 'book')  return <svg {...common}><path d="M4 5a2 2 0 0 1 2-2h11v16H6a2 2 0 0 0-2 2zM17 3h1a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6" /></svg>
  if (name === 'chart') return <svg {...common}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>
  return <svg {...common}><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="5" /></svg>
}
