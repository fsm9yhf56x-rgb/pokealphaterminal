import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { sql } from '@/lib/db/sql'
import { checkPublicRateLimit } from '@/lib/rate-limit'
export const dynamic = 'force-dynamic'

/** POST /api/v1/scan/resolve-image — matching VISUEL (dHash 256 bits). */
async function dhash256(buf: Buffer): Promise<bigint[]> {
  const { data } = await sharp(buf).grayscale().resize(17, 16, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true })
  const h = [0n, 0n, 0n, 0n]
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const bit = data[y * 17 + x] > data[y * 17 + x + 1] ? 1n : 0n
    h[y >> 2] = (h[y >> 2] << 1n) | bit
  }
  return h.map((v) => BigInt.asIntN(64, v))
}

export async function POST(req: NextRequest) {
  const _rl = await checkPublicRateLimit(req, 'costly')
  if (_rl) return _rl
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const b64 = String(body?.image ?? '')
  if (b64.length < 100 || b64.length > 400_000) return NextResponse.json({ error: 'bad_image' }, { status: 400 })
  try {
    const h = await dhash256(Buffer.from(b64, 'base64'))
    const rows = (await sql`
      SELECT cp.k_card_id,
             (bit_count(cp.h0 # ${h[0]}) + bit_count(cp.h1 # ${h[1]})
            + bit_count(cp.h2 # ${h[2]}) + bit_count(cp.h3 # ${h[3]})) AS dist
      FROM card_phash cp ORDER BY dist ASC LIMIT 5`) as Array<{ k_card_id: string; dist: number }>
    const best = rows[0]
    if (!best || Number(best.dist) > 64) return NextResponse.json({ status: 'not_found', candidates: [] })
    const ids = rows.filter((r) => Number(r.dist) <= Number(best.dist) + 10).map((r) => r.k_card_id)
    const cards = (await sql`
      SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image, kc.image_url,
             kp.set_id, kp.number, kp.name_en
      FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id
      WHERE kc.id = ANY(${ids})`) as any[]
    const cands = ids.map((id) => cards.find((c) => c.id === id)).filter(Boolean).map((c) => ({
      kCardId: c.id, printId: c.print_id, lang: String(c.lang || 'en').toUpperCase(),
      name: c.name_localized || c.name_en, nameEn: c.name_en, rarity: c.rarity,
      setId: c.set_id, number: c.number, hasImage: c.has_image === true,
      image: c.image_url, imageCandidates: [c.image_url].filter(Boolean),
      matchKind: 'visual', similarity: null, variant: null, year: null, series: null,
    }))
    if (cands.length === 1 && Number(best.dist) <= 40)
      return NextResponse.json({ status: 'match', card: cands[0], candidates: cands, via: 'visual' })
    return NextResponse.json({ status: cands.length ? 'ambiguous' : 'not_found', candidates: cands, via: 'visual' })
  } catch (e) {
    console.error('[scan/resolve-image]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
