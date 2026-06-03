'use client'

import { useEffect, useState } from 'react'
import { Ticker } from '@/components/ui/Ticker'
import type { TickerItem } from '@/components/ui/Ticker'

export function TickerBar() {
  const [items, setItems] = useState<TickerItem[]>([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/market/ticker', { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        if (cancelled) return
        const mapped: TickerItem[] = (json.items ?? []).map((r: any) => ({
          name: r.name ?? 'Carte',
          price: Number(r.price) || 0,
          changePct: r.changePct == null ? null : Number(r.changePct),
          type: r.type ?? undefined,
        }))
        setItems(mapped)
      } catch {
        /* silencieux — la barre se masque si pas de data */
      }
    }

    load()
    const id = setInterval(load, 5 * 60_000) // refresh doux toutes les 5 min
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (!items.length) return null
  return <Ticker items={items} />
}
