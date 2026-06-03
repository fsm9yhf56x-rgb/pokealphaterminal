'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { Whales }  from '@/components/features/alpha/Whales'
import { ProGate } from '@/components/features/alpha/ProGate'

export default function WhalesPage() {
  const { isPro } = useAuth()
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get('preview') === '1')
  }, [])

  const unlocked = isPro || preview
  if (!unlocked) return <ProGate page="whales"><Whales isPro={false} /></ProGate>
  return <Whales isPro={true} />
}
