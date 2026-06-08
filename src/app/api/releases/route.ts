/**
 * /api/releases - calendrier des sorties (fusion TCGdex + PPT).
 * Logique dans lib/releasesData (partagee avec la page /releases).
 */
import { NextResponse } from 'next/server'
import { getReleases } from '@/lib/releasesData'

export const revalidate = 21600

export async function GET() {
  try {
    const sets = await getReleases()
    return NextResponse.json({ count: sets.length, sets, lastSynced: new Date().toISOString() })
  } catch (e: any) {
    return NextResponse.json({ count: 0, sets: [], error: String(e?.message || e) }, { status: 500 })
  }
}
