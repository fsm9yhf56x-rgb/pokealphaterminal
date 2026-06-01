import { sql } from '@/lib/db/sql'
import ReleasesClient from './ReleasesClient'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export const metadata = {
  title: 'Prochains Sets · Kodo Cards',
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

async function fetchUpcomingSets(): Promise<{ sets: UpcomingSet[], lastSyncedAt: string | null }> {
  try {
    const result = await sql.query(
      "SELECT items_pending, last_run_at, created_at FROM sync_progress WHERE job_id = \'tcg_sets_upcoming_meta\';"
    )
    if (result.length === 0) return { sets: [], lastSyncedAt: null }
    const rawSets = result[0].items_pending || []
    const lastSyncedAt = result[0].last_run_at || result[0].created_at || null
    const now = new Date()
    const sets = (Array.isArray(rawSets) ? rawSets : [])
      .filter((s: any) => s && s.releaseDate)
      .map((s: any) => {
        const releaseDate = new Date(s.releaseDate)
        const daysUntil = Math.ceil((releaseDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return {
          name: s.name,
          slug: s.tcgPlayerId || '',
          pptId: s.pptId,
          series: s.series,
          releaseDate: s.releaseDate,
          releaseDateLocale: releaseDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
          imageUrl: s.imageUrl,
          daysUntil,
          isReleased: daysUntil <= 0,
        }
      })
      .sort((a: UpcomingSet, b: UpcomingSet) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime())
    return { sets, lastSyncedAt: lastSyncedAt instanceof Date ? lastSyncedAt.toISOString() : lastSyncedAt }
  } catch (e) {
    console.error('[/releases] fetch error:', e)
    return { sets: [], lastSyncedAt: null }
  }
}

export default async function ReleasesPage() {
  const { sets, lastSyncedAt } = await fetchUpcomingSets()
  return <ReleasesClient sets={sets} lastSyncedAt={lastSyncedAt} />
}
