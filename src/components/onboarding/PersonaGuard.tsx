'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePersona } from '@/lib/usePersona'
import { useAuth } from '@/lib/useAuth'
/**
 * Garde de route persona : empeche un collector d acceder par URL directe
 * aux pages reservees a l investisseur (Market, Alpha, Performance).
 *
 * IMPORTANT : on ne redirige QUE lorsque le profil est reellement charge
 * (profileReady), pas seulement quand `loading` est false. Sinon, pendant le
 * court instant ou le profil n a pas encore tranche, usePersona retourne
 * isCollector=true par defaut => un investisseur serait redirige a tort.
 */
export function PersonaGuard({
  redirectTo = '/home',
  children,
}: {
  redirectTo?: string
  children: React.ReactNode
}) {
  const { isCollector } = usePersona()
  const { profileReady } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (profileReady && isCollector) router.replace(redirectTo)
  }, [profileReady, isCollector, redirectTo, router])

  // Tant que le profil n est pas pret : on n affiche rien (ni la page, ni une
  // redirection). Une fois pret : collector => rien (le temps de la redirection),
  // investor => la page.
  if (!profileReady) return null
  if (isCollector) return null
  return <>{children}</>
}
