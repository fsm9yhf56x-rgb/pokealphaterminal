import { sql } from '@/lib/db/sql'

/** Agrégats analytics sur les 30 derniers jours (page admin). */
export async function getAnalyticsOverview() {
  const [totals, byDay, topPages, topEvents, funnel] = (await Promise.all([
    sql`SELECT
          count(*)::int AS events,
          count(*) FILTER (WHERE event = 'page_view')::int AS page_views,
          count(DISTINCT coalesce(user_id, anon_id))::int AS visitors,
          count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL)::int AS sessions,
          count(*) FILTER (WHERE user_id IS NOT NULL)::int AS logged_events,
          count(*) FILTER (WHERE user_id IS NULL)::int AS anon_events
        FROM analytics_events
        WHERE ts > now() - interval '30 days'`,

    sql`SELECT to_char(date_trunc('day', ts), 'DD/MM') AS day,
               count(*) FILTER (WHERE event = 'page_view')::int AS vues,
               count(DISTINCT coalesce(user_id, anon_id))::int AS visiteurs
        FROM analytics_events
        WHERE ts > now() - interval '30 days'
        GROUP BY date_trunc('day', ts)
        ORDER BY date_trunc('day', ts)`,

    sql`SELECT path, count(*)::int AS n
        FROM analytics_events
        WHERE event = 'page_view' AND path IS NOT NULL AND ts > now() - interval '30 days'
        GROUP BY path ORDER BY n DESC LIMIT 15`,

    sql`SELECT event, count(*)::int AS n
        FROM analytics_events
        WHERE ts > now() - interval '30 days'
        GROUP BY event ORDER BY n DESC LIMIT 20`,

    sql`SELECT
          count(*) FILTER (WHERE event = 'signup_completed')::int AS signups,
          count(*) FILTER (WHERE event = 'pricing_viewed')::int AS pricing_views,
          count(*) FILTER (WHERE event = 'checkout_started')::int AS checkout_started,
          count(*) FILTER (WHERE event = 'checkout_completed')::int AS checkout_completed,
          count(*) FILTER (WHERE event = 'gate_hit')::int AS gate_hits
        FROM analytics_events
        WHERE ts > now() - interval '30 days'`,
  ])) as any[]

  return {
    totals: totals[0] || {},
    byDay: byDay || [],
    topPages: topPages || [],
    topEvents: topEvents || [],
    funnel: funnel[0] || {},
  }
}

export type AnalyticsOverview = Awaited<ReturnType<typeof getAnalyticsOverview>>
