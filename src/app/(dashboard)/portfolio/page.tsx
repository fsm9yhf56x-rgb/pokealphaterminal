'use client'
import { Holdings } from '@/components/features/portfolio/Holdings'
import { useAuth } from '@/lib/useAuth'
import { GuestWall } from '@/components/upgrade/GuestWall'

export default function PortfolioPage() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <GuestWall variant="portfolio" />
  return <Holdings />
}
