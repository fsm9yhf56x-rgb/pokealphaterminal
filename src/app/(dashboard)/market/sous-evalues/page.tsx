'use client'
// Alias kept for backward compatibility — canonical route is /market/spreads
import { Spreads } from '@/components/features/market/spreads/Spreads'

export default function SousEvaluesPage() {
  return <Spreads isPro={false} />
}
