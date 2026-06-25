'use client'
import { DailyHub } from '@/components/features/home/daily-hub/DailyHub'
import { useAuth } from '@/lib/useAuth'
import { GuestWall } from '@/components/upgrade/GuestWall'

export default function HomePage() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <GuestWall variant="home" />
  return <DailyHub />
}
