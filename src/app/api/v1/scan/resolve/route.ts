import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getCardImageUrl, cardImageCandidates, type Lang } from '@/lib/images'
import { resolveScan, type ScanCandidate } from '@/lib/scan/resolve-query'
import setIndexRaw from '@/lib/scan/set-index.json'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/scan/resolve
 *
 * Résolveur scan déterministe. Deux modes d'entrée :
 *
 *   A. PIVOT NOM (mode scan principal, 92% résolu) :
 *      ?name=Dracaufeu&number=4&lang=fr[&total=102]
 *      -> matching nom+numéro tolérant OCR (exact puis flou), filtre total.
 *
 *   B. SET DIRECT (fallback / usage interne) :
 *      ?set=base1&number=4[&lang=fr]
 *      -> match exact (set_id, number) comme avant.
 *
 * Trois issues exclusives, jamais de devinette :
 *   "match" (1 carte) | "ambiguous" (picker) | "not_found".
 *
 * Lecture seule. Ne touche aucune donnée utilisateur.
 */

type SetIndexEntry = {
  id: string
  printedTotal: number
  langs: string[]
  series: string | null
  year: number | null
  nameEn: string | null
  nameFr: string | null
  nameJp: string | null
  logo: string | null
}
const SET_INDEX = setIndexRaw as SetIndexEntry[]
const TOTAL_BY_SET: Record<string, number> = Object.fromEntries(
  SET_INDEX.map((e) => [e.id, e.printedTotal]),
)

const LANGS = ['en', 'fr', 'jp'] as const

function stripLangPrefix(s: string): string {
  return s.replace(/^(en|fr|jp)-/i, '')
}
function cleanNumber(s: string): string {
  return s.split('/')[0].trim()
}

// ── Mode B : set direct (reprend l'ancien comportement) ──
type DirectRow = {
  id: string; print_id: string; lang: string; name_localized: string | null
  rarity: string | null; has_image: boolean
  set_id: string; number: string; variant: string | null; name_en: string | null
}
function directCandidate(r: DirectRow): ScanCandidate {
  const lang = String(r.lang || 'en')
  const primary = getCardImageUrl({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  const imgs = cardImageCandidates({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  return {
    kCardId: r.id, printId: r.print_id, lang: lang.toUpperCase(),
    name: r.name_localized || r.name_en || null, nameEn: r.name_en || null,
    rarity: r.rarity || null, variant: r.variant || null,
    setId: r.set_id, number: r.number,
    year: null, series: null,
    hasImage: r.has_image === true,
    image: primary || (imgs[0] ?? null), imageCandidates: imgs,
    matchKind: 'exact', similarity: null,
  }
}

async function resolveBySet(rawSet: string, rawNumber: string, rawLang: string) {
  const setId = stripLangPrefix(rawSet)
  const number = cleanNumber(rawNumber)
  const langFilter = (LANGS as readonly string[]).includes(rawLang) ? rawLang : null
  const rows = (langFilter
    ? await sql.query(
        `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
                kp.set_id, kp.number, kp.variant, kp.name_en
         FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id
         WHERE kp.set_id = $1 AND kp.number = $2 AND lower(kc.lang) = $3
         ORDER BY kp.variant NULLS FIRST, kc.id`,
        [setId, number, langFilter])
    : await sql.query(
        `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
                kp.set_id, kp.number, kp.variant, kp.name_en
         FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id
         WHERE kp.set_id = $1 AND kp.number = $2
         ORDER BY
           CASE lower(kc.lang) WHEN 'fr' THEN 0 WHEN 'en' THEN 1 WHEN 'jp' THEN 2 ELSE 3 END,
           kp.variant NULLS FIRST, kc.id`,
        [setId, number])) as DirectRow[]

  const query = { set: setId, number, lang: langFilter }
  if (rows.length === 0) return NextResponse.json({ status: 'not_found', query, candidates: [] })
  const candidates = rows.map(directCandidate)
  if (candidates.length === 1) return NextResponse.json({ status: 'match', query, card: candidates[0], candidates })
  return NextResponse.json({ status: 'ambiguous', query, candidates })
}

export async function GET(req: NextRequest) {
  try {
    const u = new URL(req.url)
    const name = (u.searchParams.get('name') || '').trim()
    const set = (u.searchParams.get('set') || '').trim()
    const number = (u.searchParams.get('number') || '').trim()
    const lang = (u.searchParams.get('lang') || '').trim().toLowerCase()
    const totalRaw = (u.searchParams.get('total') || '').trim()
    const total = totalRaw ? parseInt(cleanNumber(totalRaw), 10) : null

    if (!number) {
      return NextResponse.json(
        { status: 'error', error: 'missing_params', message: 'number est requis' },
        { status: 400 })
    }

    // ── Mode B : set direct ──
    if (set && !name) {
      return await resolveBySet(set, number, lang)
    }

    // ── Mode A : pivot nom ──
    if (!name) {
      return NextResponse.json(
        { status: 'error', error: 'missing_params', message: 'name ou set requis (+ number)' },
        { status: 400 })
    }

    const result = await resolveScan({ name, number, lang, total: Number.isFinite(total as any) ? total : null })

    // Filtre total imprimé : si fourni et discriminant, on restreint aux sets
    // dont le total correspond — SANS jamais vider la liste (best-effort).
    if (total && Number.isFinite(total) && result.candidates.length > 1) {
      const matching = result.candidates.filter((c) => TOTAL_BY_SET[c.setId] === total)
      if (matching.length >= 1 && matching.length < result.candidates.length) {
        result.candidates = matching
        if (matching.length === 1) {
          result.status = 'match'
          result.card = matching[0]
        } else {
          result.status = 'ambiguous'
          result.card = undefined
        }
      }
    }

    // Enrichit chaque candidat avec le nom de set localisé (pour le picker).
    const withSetNames = result.candidates.map((c) => {
      const e = SET_INDEX.find((s) => s.id === c.setId)
      const setName =
        c.lang === 'FR' ? (e?.nameFr || e?.nameEn) :
        c.lang === 'JP' ? (e?.nameJp || e?.nameEn) :
        (e?.nameEn)
      return { ...c, setName: setName || c.setId, setLogo: e?.logo || null }
    })

    return NextResponse.json({
      status: result.status,
      query: result.query,
      card: result.card ? withSetNames.find((c) => c.kCardId === result.card!.kCardId) : undefined,
      candidates: withSetNames,
    })
  } catch (e: any) {
    console.error('[scan/resolve]', e?.message)
    return NextResponse.json({ status: 'error', error: 'internal' }, { status: 500 })
  }
}
