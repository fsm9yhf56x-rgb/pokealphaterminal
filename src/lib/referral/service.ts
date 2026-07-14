import { sql } from '@/lib/db/sql'

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // sans 0/o/1/l/i

function genCode(len = 6): string {
  let c = ''
  for (let i = 0; i < len; i++) c += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return c
}

/** Retourne le code du user, le crée (unique) s'il n'existe pas encore. */
export async function getOrCreateCode(userId: string): Promise<string> {
  const existing = (await sql`SELECT code FROM referral_codes WHERE user_id = ${userId} LIMIT 1`) as any[]
  if (existing[0]?.code) return existing[0].code

  for (let attempt = 0; attempt < 12; attempt++) {
    const code = genCode(6)
    try {
      await sql`INSERT INTO referral_codes (user_id, code) VALUES (${userId}, ${code})`
      return code
    } catch (e) {
      // Course sur user_id OU collision sur code : relire, sinon reessayer un autre code.
      const again = (await sql`SELECT code FROM referral_codes WHERE user_id = ${userId} LIMIT 1`) as any[]
      if (again[0]?.code) return again[0].code
      if (attempt === 11) console.error('[referral getOrCreateCode] insert failed', e)
    }
  }
  throw new Error('code_generation_failed')
}

export interface ReferralOverview {
  code: string
  counts: { total: number; qualified: number; rewarded: number }
  filleuls: { status: string; date: string }[]
  premiumUntil: string | null
}

/** Vue de parrainage d'un user : son code, ses stats, ses filleuls, son Premium offert. */
export async function getReferralOverview(userId: string): Promise<ReferralOverview> {
  const code = await getOrCreateCode(userId)
  const [counts, filleuls, prof] = (await Promise.all([
    sql`SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status IN ('qualified','rewarded'))::int AS qualified,
          count(*) FILTER (WHERE status = 'rewarded')::int AS rewarded
        FROM referrals WHERE referrer_id = ${userId}`,
    sql`SELECT status, to_char(created_at, 'DD/MM/YYYY') AS date
        FROM referrals WHERE referrer_id = ${userId} ORDER BY created_at DESC LIMIT 100`,
    sql`SELECT to_char(premium_until, 'DD/MM/YYYY') AS premium_until
        FROM "profiles" WHERE id = ${userId} AND premium_until > now() LIMIT 1`,
  ])) as any[]

  return {
    code,
    counts: counts[0] || { total: 0, qualified: 0, rewarded: 0 },
    filleuls: filleuls || [],
    premiumUntil: prof[0]?.premium_until ?? null,
  }
}

export interface LeaderRow {
  referrer_id: string
  name: string | null
  total: number
  rewarded: number
}

/** Classement des meilleurs parrains (par nombre de filleuls). */
export async function getLeaderboard(limit = 20): Promise<LeaderRow[]> {
  const rows = (await sql`
    SELECT r.referrer_id,
           u.name AS name,
           count(*)::int AS total,
           count(*) FILTER (WHERE r.status = 'rewarded')::int AS rewarded
    FROM referrals r
    LEFT JOIN "user" u ON u.id = r.referrer_id
    GROUP BY r.referrer_id, u.name
    ORDER BY total DESC, rewarded DESC
    LIMIT ${limit}
  `) as any[]
  return rows as LeaderRow[]
}
