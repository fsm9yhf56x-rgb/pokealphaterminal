'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { DealHunter } from '@/components/features/alpha/DealHunter'
import { ProGate }    from '@/components/features/alpha/ProGate'

export default function DealsPage() {
  const { isPro } = useAuth()
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get('preview') === '1')
  }, [])

  const unlocked = isPro || preview
  if (!unlocked) return <ProGate page="deals"><DealHunter isPro={false} /></ProGate>
  return <DealHunter isPro={true} />
}
