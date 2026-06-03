'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { DexyChat } from '@/components/features/alpha/DexyChat'
import { ProGate }  from '@/components/features/alpha/ProGate'

export default function DexyPage() {
  const { isPro } = useAuth()
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get('preview') === '1')
  }, [])

  const unlocked = isPro || preview
  if (!unlocked) return <ProGate page="dexy"><DexyChat isPro={false} /></ProGate>
  return <DexyChat isPro={true} />
}
