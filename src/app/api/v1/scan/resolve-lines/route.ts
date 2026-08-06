import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { resolveFromLines, type RawLine } from '@/lib/scan/resolve-lines'
import setIndexRaw from '@/lib/scan/set-index.json'
import { checkPublicRateLimit } from '@/lib/rate-limit'
export const dynamic = 'force-dynamic'

const SET_INDEX = setIndexRaw as Array<{ id: string; printedTotal: number; nameEn: string | null; nameFr: string | null; nameJp: string | null; logo: string | null }>
const normSetId = (x: string) => String(x).toLowerCase().replace(/[^a-z0-9]/g, '')
const BY_ID = new Map(SET_INDEX.map((e) => [normSetId(e.id), e]))

/** POST /api/v1/scan/resolve-lines — le client envoie les lignes OCR brutes,
 *  le serveur matche contre le catalogue entier. */
export async function POST(req: NextRequest) {
  const _rl = await checkPublicRateLimit(req, 'scan')
  if (_rl) return _rl
  let body: any
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }) }
  const lines: RawLine[] = Array.isArray(body?.lines)
    ? body.lines.slice(0, 30).map((l: any) => ({ text: String(l?.text ?? '').slice(0, 80), y: Number(l?.y) || 0, h: Number(l?.h) || 0 }))
    : []
  if (!lines.length) return NextResponse.json({ error: 'no_lines' }, { status: 400 })
  const lang = typeof body?.lang === 'string' ? body.lang : null
  try {
    const result = await resolveFromLines(lines, lang)
    const candidates = result.candidates.map((c) => {
      const e = BY_ID.get(normSetId(c.setId))
      const setName = c.lang === 'FR' ? (e?.nameFr || e?.nameEn) : c.lang === 'JP' ? (e?.nameJp || e?.nameEn) : e?.nameEn
      return { ...c, setName: setName || c.setId, setLogo: e?.logo || null, printedTotal: e?.printedTotal ?? null } as any
    })
    if (result.status === 'not_found') {
      sql`INSERT INTO scan_misses (raw_read) VALUES (${JSON.stringify({ lines: lines.slice(0, 20), lang })}::jsonb)`.catch(() => {})
    }
    return NextResponse.json({ ...result, candidates, card: result.card ? candidates.find((c: any) => c.kCardId === result.card!.kCardId) ?? result.card : undefined })
  } catch (e) {
    console.error('[scan/resolve-lines]', e)
    return NextResponse.json({ error: 'server_error' }, { status: 500 })
  }
}
