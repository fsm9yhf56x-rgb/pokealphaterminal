'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'
import AuthForm from '@/components/auth/AuthForm'

export default function SignupClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading } = useAuth()
  const redirectTo = searchParams.get('redirect') || '/home'

  useEffect(() => {
    if (!loading && user) {
      router.replace(redirectTo)
    }
  }, [user, loading, redirectTo, router])

  if (loading || user) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{
          fontSize: '13px', color: 'var(--ink-muted)',
          fontFamily: 'var(--font-dm, system-ui)',
        }}>
          Chargement…
        </p>
      </div>
    )
  }

  return <AuthForm mode="signup" variant="page" redirectTo={redirectTo} />
}
