import { getReleases } from '@/lib/releasesData'
import ReleasesClient from './ReleasesClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata = {
  title: 'Prochaines Séries · Kodo Cards',
  description: 'Les nouvelles sorties Pokémon TCG, anticipées pour toi. Calendrier des drops, dates de release, notification email à la sortie.',
}

type UpcomingSet = {
  name: string
  slug: string
  pptId: string
  series: string
  releaseDate: string
  releaseDateLocale: string
  imageUrl: string | null
  daysUntil: number
  isReleased: boolean
}

export default async function ReleasesPage() {
  const sets = await getReleases()
  const upcomingCount = sets.filter(s => !s.isReleased).length
  return <ReleasesClient sets={sets} upcomingCount={upcomingCount} lastSyncedAt={new Date().toISOString()} />
}
