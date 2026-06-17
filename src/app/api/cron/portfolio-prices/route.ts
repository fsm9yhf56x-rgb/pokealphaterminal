/**
 * GET /api/cron/portfolio-prices
 *
 * Valorise chaque ligne de portfolio selon SON exemplaire (Kodo Engine) :
 *  - Gradee ("PSA 10", "BGS 8.5"...) -> tier exact {COMPANY}_{GRADE} de price_matrix
 *  - Raw -> tier d'etat (NEAR_MINT par defaut tant que le formulaire ne capture pas l'etat)
 *  - Carte FR raw -> cote FR (price_signals) prioritaire
 *  - Fallback universel -> fair value (price_basis le trace)
 * Sources sold uniquement (is_asking=false). Conversion via fx_rates.
 * Protege par CRON_SECRET (Bearer ou ?secret=).
 */
import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
export const dynamic = 'force-dynamic'
export const maxDuration = 60
const sql = neon(process.env.DATABASE_URL!)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get('secret')
  const authHeader = req.headers.get('authorization')
  const expected = process.env.CRON_SECRET
  const ok = expected && (secret === expected || authHeader === `Bearer ${expected}`)
  if (!ok) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  try {
    await sql`ALTER TABLE portfolio_cards ADD COLUMN IF NOT EXISTS price_basis text`

    const res = (await sql`
      WITH fx AS (
        SELECT rate FROM fx_rates
        WHERE from_currency = 'USD' AND to_currency = 'EUR'
        ORDER BY rate_date DESC LIMIT 1
      ),
      resolved AS (
        SELECT pc.id AS pc_id,
               t.tier AS wanted_tier,
               best.spot, best.currency,
               kc.lang,
               ps.cote_fr_eur, ps.fair_value_eur, ps.fair_value_method
        FROM portfolio_cards pc
        JOIN k_cards kc ON kc.id = pc.k_card_id
        LEFT JOIN price_signals ps ON ps.print_id = kc.print_id
        LEFT JOIN LATERAL (SELECT rarity AS r FROM k_prints WHERE id = kc.print_id) kc_rarity ON true
        CROSS JOIN LATERAL (
          SELECT CASE
            WHEN pc.condition ~* '^(PSA|BGS|CGC|SGC|ACE|TAG)[ _]'
              THEN upper(replace(replace(trim(pc.condition), ' ', '_'), '.', '_'))
            WHEN upper(coalesce(pc.condition,'')) IN ('NM','NEAR MINT','NEAR_MINT') THEN 'NEAR_MINT'
            WHEN upper(coalesce(pc.condition,'')) IN ('LP','LIGHTLY PLAYED','LIGHTLY_PLAYED') THEN 'LIGHTLY_PLAYED'
            WHEN upper(coalesce(pc.condition,'')) IN ('MP','MODERATELY PLAYED','MODERATELY_PLAYED') THEN 'MODERATELY_PLAYED'
            WHEN upper(coalesce(pc.condition,'')) IN ('HP','HEAVILY PLAYED','HEAVILY_PLAYED') THEN 'HEAVILY_PLAYED'
            WHEN upper(coalesce(pc.condition,'')) IN ('DMG','DAMAGED') THEN 'DAMAGED'
            ELSE 'NEAR_MINT'
          END AS tier,
          CASE
            WHEN pc.variant ILIKE '%holo%' THEN 'Holofoil'
            WHEN pc.variant ILIKE '%reverse%' THEN 'Reverse_Holofoil'
            WHEN pc.variant IS NOT NULL AND pc.variant <> '' THEN 'Normal'
            WHEN kc_rarity.r ILIKE '%holo%' THEN 'Holofoil'
            ELSE 'Normal'
          END AS vmatch
        ) t
        LEFT JOIN LATERAL (
          SELECT pm.spot, pm.currency
          FROM price_matrix pm
          WHERE pm.print_id = kc.print_id
            AND pm.tier = t.tier
            AND pm.is_asking = false
            AND pm.spot IS NOT NULL
          ORDER BY
            CASE WHEN pm.variant = t.vmatch THEN 0 ELSE 1 END,
            CASE
              WHEN kc.lang = 'jp' THEN
                CASE pm.source WHEN 'ppt_tcgplayer' THEN 0 WHEN 'ppt_ebay' THEN 1 ELSE 2 END
              ELSE
                CASE pm.source WHEN 'tcgplayer' THEN 0 WHEN 'ppt_tcgplayer' THEN 1
                               WHEN 'ebay' THEN 2 WHEN 'ppt_ebay' THEN 3
                               WHEN 'cardmarket' THEN 4 ELSE 5 END
            END,
            pm.sale_count DESC NULLS LAST,
            pm.as_of DESC
          LIMIT 1
        ) best ON true
      )
      UPDATE portfolio_cards pc
      SET current_price = v.price_eur,
          price_basis = v.basis,
          updated_at = now()
      FROM (
        SELECT r.pc_id,
          CASE
            -- Echelle raw jugee non fiable par le compute (garde-fou coherence): pas de prix raw
            WHEN r.wanted_tier IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
              AND r.fair_value_method = 'insufficient_data' THEN NULL
            WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL
              THEN ROUND(r.cote_fr_eur::numeric, 2)
            WHEN r.spot IS NOT NULL THEN
              ROUND((CASE WHEN r.currency = 'EUR' THEN r.spot
                          ELSE r.spot * (SELECT rate FROM fx) END)::numeric, 2)
            ELSE ROUND(r.fair_value_eur::numeric, 2)
          END AS price_eur,
          CASE
            WHEN r.wanted_tier IN ('NEAR_MINT','LIGHTLY_PLAYED','MODERATELY_PLAYED','HEAVILY_PLAYED','DAMAGED')
              AND r.fair_value_method = 'insufficient_data' THEN 'insufficient_data'
            WHEN r.lang = 'fr' AND r.wanted_tier = 'NEAR_MINT' AND r.cote_fr_eur IS NOT NULL THEN 'cote_fr'
            WHEN r.spot IS NOT NULL THEN 'tier:' || r.wanted_tier
            WHEN r.fair_value_eur IS NOT NULL THEN 'fair_value_fallback'
            ELSE NULL
          END AS basis
        FROM resolved r
      ) v
      WHERE v.pc_id = pc.id
        AND (v.price_eur IS NOT NULL OR v.basis = 'insufficient_data')
        AND (pc.current_price IS DISTINCT FROM v.price_eur OR pc.price_basis IS DISTINCT FROM v.basis)
    `) as unknown as { rowCount?: number }
    const updated = (res as any)?.rowCount ?? null

    const totals = (await sql`
      SELECT COUNT(*)::int AS cards_priced,
             ROUND(SUM(current_price * COALESCE(qty,1))::numeric, 2) AS total_value_eur,
             COUNT(*) FILTER (WHERE price_basis LIKE 'tier:%')::int AS tier_exact,
             COUNT(*) FILTER (WHERE price_basis = 'fair_value_fallback')::int AS fallbacks
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
    `) as Array<{ cards_priced: number; total_value_eur: string | null; tier_exact: number; fallbacks: number }>

    const snap = (await sql`
      INSERT INTO portfolio_value_snapshots (user_id, day, total_value, total_cost, currency)
      SELECT user_id, CURRENT_DATE,
             ROUND(COALESCE(SUM(current_price * COALESCE(qty,1)),0)::numeric, 2),
             ROUND(COALESCE(SUM(buy_price * COALESCE(qty,1)),0)::numeric, 2),
             'EUR'
      FROM portfolio_cards
      WHERE current_price IS NOT NULL
      GROUP BY user_id
      ON CONFLICT (user_id, day) DO UPDATE SET
        total_value = EXCLUDED.total_value,
        total_cost = EXCLUDED.total_cost
      RETURNING user_id
    `) as Array<{ user_id: string }>

    return NextResponse.json({
      ok: true,
      snapshots: snap.length,
      updated,
      cards_priced: totals[0]?.cards_priced ?? 0,
      tier_exact: totals[0]?.tier_exact ?? 0,
      fallbacks: totals[0]?.fallbacks ?? 0,
      total_value_eur: totals[0]?.total_value_eur ? Number(totals[0].total_value_eur) : 0,
      ran_at: new Date().toISOString(),
    })
  } catch (e: any) {
    console.error('[cron/portfolio-prices]', e?.message)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
