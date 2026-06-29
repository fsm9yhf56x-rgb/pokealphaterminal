import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { getCardImageUrl, cardImageCandidates, type Lang } from '@/lib/images'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/scan/resolve
 *
 * Résolveur déterministe carte Kodo à partir de (set, numéro).
 * Cœur du scan : ZÉRO devinette. Trois issues exclusives :
 *   - "match"      : exactement 1 carte (dans la langue demandée si fournie)
 *   - "ambiguous"  : N candidats -> l'app fait trancher l'utilisateur
 *   - "not_found"  : aucune carte -> on le dit, pas de best guess
 *
 * Query params :
 *   set    (requis)  set_id, avec ou sans préfixe langue (base1 ou en-base1)
 *   number (requis)  numéro local de la carte (4, 097, TG01, SWSH001…)
 *   lang   (option)  en|fr|jp — filtre à une langue ; sinon toutes langues
 *   total  (option)  total du set imprimé (102 de "4/102") — réservé v2 (désambiguïsation set)
 *
 * Lecture seule. Ne touche aucune donnée utilisateur.
 */

type CandidateRow = {
  id: string
  print_id: string
  lang: string
  name_localized: string | null
  name_en: string | null
  rarity: string | null
  variant: string | null
  set_id: string
  number: string
  has_image: boolean
}

const LANGS = ['en', 'fr', 'jp'] as const

// Normalise le set_id entrant : retire le préfixe langue éventuel.
// (On NE retire PAS les suffixes variante ici : base1 / base1-shadowless /
//  base1-1st sont des sets DISTINCTS dans k_prints — c'est ce qui sépare les
//  éditions. normalizeSetId côté images ne sert qu'à pointer l'art commun.)
function stripLangPrefix(s: string): string {
  return s.replace(/^(en|fr|jp)-/i, '')
}

// Numéro : on tolère le format "4/102" en entrée (OCR brut) -> "4".
// On NE re-padde PAS : k_prints.number est déjà la forme locale stockée.
function cleanNumber(s: string): string {
  const before = s.split('/')[0].trim()
  return before
}

function buildCandidate(r: CandidateRow) {
  const lang = String(r.lang || 'en')
  // URL image canonique + chaîne de repli langue (même art, texte différent).
  const primary = getCardImageUrl({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  const candidatesImg = cardImageCandidates({ lang: lang as Lang, setId: r.set_id, localId: r.number })
  return {
    kCardId: r.id,
    printId: r.print_id,
    lang: lang.toUpperCase(),
    name: r.name_localized || r.name_en || null,
    nameEn: r.name_en || null,
    rarity: r.rarity || null,
    variant: r.variant || null,
    setId: r.set_id,
    number: r.number,
    hasImage: r.has_image === true,
    image: primary || (candidatesImg[0] ?? null),
    imageCandidates: candidatesImg,
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const rawSet = (url.searchParams.get('set') || '').trim()
    const rawNumber = (url.searchParams.get('number') || '').trim()
    const rawLang = (url.searchParams.get('lang') || '').trim().toLowerCase()

    if (!rawSet || !rawNumber) {
      return NextResponse.json(
        { status: 'error', error: 'missing_params', message: 'set et number sont requis' },
        { status: 400 },
      )
    }

    const setId = stripLangPrefix(rawSet)
    const number = cleanNumber(rawNumber)
    const langFilter = LANGS.includes(rawLang as any) ? rawLang : null

    // Requête déterministe. Match exact sur (set_id, number), filtre langue
    // optionnel. On joint k_prints pour set/number/variant/name_en.
    const rows = (langFilter
      ? await sql.query(
          `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
                  kp.set_id, kp.number, kp.variant, kp.name_en
           FROM k_cards kc
           JOIN k_prints kp ON kp.id = kc.print_id
           WHERE kp.set_id = $1 AND kp.number = $2 AND lower(kc.lang) = $3
           ORDER BY kp.variant NULLS FIRST, kc.id`,
          [setId, number, langFilter],
        )
      : await sql.query(
          `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kc.rarity, kc.has_image,
                  kp.set_id, kp.number, kp.variant, kp.name_en
           FROM k_cards kc
           JOIN k_prints kp ON kp.id = kc.print_id
           WHERE kp.set_id = $1 AND kp.number = $2
           ORDER BY
             CASE lower(kc.lang) WHEN 'fr' THEN 0 WHEN 'en' THEN 1 WHEN 'jp' THEN 2 ELSE 3 END,
             kp.variant NULLS FIRST, kc.id`,
          [setId, number],
        )) as CandidateRow[]

    const query = { set: setId, number, lang: langFilter }

    if (rows.length === 0) {
      return NextResponse.json({ status: 'not_found', query, candidates: [] })
    }

    const candidates = rows.map(buildCandidate)

    if (candidates.length === 1) {
      return NextResponse.json({ status: 'match', query, card: candidates[0], candidates })
    }

    // Plusieurs candidats : multi-langue (si pas de filtre) ou collision
    // variantes (cas JP : même set+number, plusieurs prints). On NE tranche pas.
    return NextResponse.json({ status: 'ambiguous', query, candidates })
  } catch (e: any) {
    console.error('[scan/resolve]', e?.message)
    return NextResponse.json({ status: 'error', error: 'internal' }, { status: 500 })
  }
}
