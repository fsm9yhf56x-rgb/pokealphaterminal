'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/useAuth'
import { MarketTerminal } from '@/components/features/market/terminal/MarketTerminal'

export default function MarketPage() {
  const { isPro } = useAuth()
  const [preview, setPreview] = useState(false)
  useEffect(() => {
    setPreview(new URLSearchParams(window.location.search).get('preview') === '1')
  }, [])
  return <MarketTerminal isPro={isPro || preview} />
}
