// Purge des analytics_events au-dela de la duree annoncee dans la politique
// de confidentialite (25 mois, recommandation CNIL pour la mesure d'audience).
//
// Lance par le cron (kodo-consolidate.yml). Sans ce job, la politique promet
// une duree que le code ne tient pas.
//
// Les lignes ANONYMISEES (user_id/anon_id/session_id NULL, cf. suppression de
// compte) sont purgees aussi : la duree de conservation vaut pour l'evenement,
// pas pour son rattachement.

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

const RETENTION_MONTHS = 25

async function main() {
  const before = await sql`
    SELECT count(*)::int AS n FROM analytics_events
    WHERE ts < now() - interval '${sql.unsafe(String(RETENTION_MONTHS))} months'
  `
  const toDelete = before[0]?.n ?? 0

  if (!toDelete) {
    console.log(`analytics purge: rien a supprimer (retention ${RETENTION_MONTHS} mois)`)
    return
  }

  // Par lots : Neon n'aime pas les gros DELETE d'un bloc.
  let deleted = 0
  for (;;) {
    const r = await sql`
      DELETE FROM analytics_events
      WHERE id IN (
        SELECT id FROM analytics_events
        WHERE ts < now() - interval '${sql.unsafe(String(RETENTION_MONTHS))} months'
        LIMIT 25000
      )
      RETURNING id
    `
    deleted += r.length
    if (r.length < 25000) break
  }

  console.log(`analytics purge: ${deleted} lignes supprimees (> ${RETENTION_MONTHS} mois)`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
