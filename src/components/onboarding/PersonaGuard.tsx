'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePersona } from '@/lib/usePersona'

/**
 * Garde de route persona : empêche un collector d'accéder par URL directe
 * aux pages réservées à l'investisseur (Market, Alpha, Performance).
 * Rendu seulement après chargement du profil pour éviter une redirection
 * pendant que `persona` est encore au défaut.
 */
export function PersonaGuard({
  redirectTo = '/home',
  children,
}: {
  redirectTo?: string
  children: React.ReactNode
}) {
  const { isCollector, loading } = usePersona()
  const router = useRouter()

  useEffect(() => {
    if (!loading && isCollector) router.replace(redirectTo)
  }, [loading, isCollector, redirectTo, router])

  // Pendant le chargement ou si collector (le temps de la redirection) : rien.
  if (loading || isCollector) return null
  return <>{children}</>
}
