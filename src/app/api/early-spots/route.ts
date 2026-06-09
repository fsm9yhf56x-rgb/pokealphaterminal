/**
 * GET /api/early-spots
 * Renvoie l'état de l'offre Early Supporter (places restantes / total / ouvert).
 * Public : utilisé par la page pricing pour afficher "plus que X places".
 */
import { NextResponse } from 'next/server'
import { earlySpotsLeft } from '@/lib/early'
import { EARLY_SUPPORTER_SEATS } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const left = await earlySpotsLeft()
    return NextResponse.json({
      seatsLeft: left,
      seatsTotal: EARLY_SUPPORTER_SEATS,
      isOpen: left > 0,
    })
  } catch (e: any) {
    console.error('[early-spots]', e?.message)
    // fail-safe : on considère l'offre fermée plutôt que de planter la page
    return NextResponse.json({ seatsLeft: 0, seatsTotal: EARLY_SUPPORTER_SEATS, isOpen: false })
  }
}
