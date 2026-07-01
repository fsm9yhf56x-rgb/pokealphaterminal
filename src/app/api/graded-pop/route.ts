// src/app/api/graded-pop/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Population gradée unifiée (PSA + CCC) pour le bloc "POPULATION GRADÉE".
// Purement additif : ne modifie aucune route existante.
//
// Contrat : renvoie les populations par société, normalisées pour l'affichage.
//   { companies: [ { company, popTotal, gemRate, distribution[] }, ... ] }
// distribution = [{ grade, count, label }] triée par grade décroissant.
//
// Sources (chacune sur SON marché, jamais mélangée) :
//   - PSA : psa_pop_reports, filtré par langue via `variety`
//           (FR = variétés françaises ; EN = null + variantes EN, hors langues
//           étrangères ; JP = via psa_card_mappings). Réutilise la logique de
//           /api/pop-report (LANG_PATTERNS) pour éviter toute fuite de langue.
//   - CCC : grading_pop (company='CCC', lang), déjà propre.
//
// Ordre des sociétés : la locale d'abord (CCC en FR ; PSA ailleurs).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)

// Même logique de plan que /api/pop-report (on ne bloque pas, on décide le détail).
const PLAN_LEVEL: Record<string, number> = { free: 0, pro: 1, premium: 2 }

type Lang = 'EN' | 'FR' | 'JP'

// Filtrage langue PSA (même principe que /api/pop-report).
// FR : on GARDE les variétés françaises. EN : on EXCLUT les langues étrangères.
const FOREIGN_LANG_RE = /french|german|italian|spanish|portuguese|japanese/i
const FRENCH_RE = /french/i

interface DistRow { grade: number; count: number; label: string | null }
interface CompanyPop {
  company: 'PSA' | 'CCC'
  popTotal: number
  gemRate: number
  distribution: DistRow[]
}

// ── PSA : colonnes pop_* -> lignes {grade, count} ────────────────────────────
const PSA_GRADE_COLS: Array<[string, number]> = [
  ['pop_10', 10], ['pop_9', 9], ['pop_8_5', 8.5], ['pop_8', 8],
  ['pop_7_5', 7.5], ['pop_7', 7], ['pop_6_5', 6.5], ['pop_6', 6],
  ['pop_5_5', 5.5], ['pop_5', 5], ['pop_4_5', 4.5], ['pop_4', 4],
  ['pop_3_5', 3.5], ['pop_3', 3], ['pop_2_5', 2.5], ['pop_2', 2],
  ['pop_1_5', 1.5], ['pop_1', 1],
]

async function getPsaPop(cardId: string, lang: Lang): Promise<CompanyPop | null> {
  // Résolution du card_ref (même logique que pop-report : mapping sinon strip préfixe)
  let shortRef: string
  if (lang === 'JP') {
    const m = await sql`
      SELECT psa_card_ref FROM psa_card_mappings
      WHERE tcg_card_id = ${cardId} AND confidence IN ('verified','auto') LIMIT 1
    ` as Array<{ psa_card_ref: string }>
    if (m.length === 0) return null
    shortRef = m[0].psa_card_ref
  } else {
    const m = await sql`
      SELECT psa_card_ref FROM psa_card_mappings
      WHERE tcg_card_id = ${cardId} AND confidence IN ('verified','auto') LIMIT 1
    ` as Array<{ psa_card_ref: string }>
    shortRef = m.length > 0 ? m[0].psa_card_ref : cardId.replace(/^(en|fr|jp|aopkm)-/i, '')
  }

  const rows = await sql`
    SELECT variety, pop_total,
           pop_10, pop_9, pop_8_5, pop_8, pop_7_5, pop_7, pop_6_5, pop_6,
           pop_5_5, pop_5, pop_4_5, pop_4, pop_3_5, pop_3, pop_2_5, pop_2,
           pop_1_5, pop_1
    FROM psa_pop_reports
    WHERE card_ref = ${shortRef}
    ORDER BY pop_10 DESC NULLS LAST
  ` as Array<Record<string, unknown>>

  if (rows.length === 0) return null

  // Filtrage langue (FR garde le français ; EN exclut langues étrangères ; JP déjà résolu)
  let picked = rows
  if (lang === 'FR') {
    picked = rows.filter(r => typeof r.variety === 'string' && FRENCH_RE.test(r.variety))
  } else if (lang === 'EN') {
    picked = rows.filter(r => r.variety == null || !FOREIGN_LANG_RE.test(String(r.variety)))
  }
  if (picked.length === 0) return null

  // On prend la variété dominante (plus gros pop_total) pour l'affichage principal.
  const main = picked.reduce((a, b) => (Number(b.pop_total ?? 0) > Number(a.pop_total ?? 0) ? b : a))

  const distribution: DistRow[] = []
  let total = 0
  for (const [col, grade] of PSA_GRADE_COLS) {
    const c = Number(main[col] ?? 0)
    if (c > 0) { distribution.push({ grade, count: c, label: null }); total += c }
  }
  if (total === 0) return null

  const pop10 = distribution.find(d => d.grade === 10)?.count ?? 0
  return { company: 'PSA', popTotal: total, gemRate: total > 0 ? pop10 / total : 0, distribution }
}

// ── CCC : grading_pop (déjà en lignes) ───────────────────────────────────────
async function getCccPop(cardId: string, lang: Lang): Promise<CompanyPop | null> {
  const cardRef = cardId.replace(/^(en|fr|jp|aopkm)-/i, '')
  const langLower = lang.toLowerCase()
  const rows = await sql`
    SELECT grade_num, count, label, pop_total
    FROM grading_pop
    WHERE company='CCC' AND card_ref=${cardRef} AND lang=${langLower}
    ORDER BY grade_num DESC
  ` as Array<{ grade_num: number; count: number; label: string | null; pop_total: number }>

  if (rows.length === 0) return null

  const distribution: DistRow[] = rows.map(r => ({
    grade: Number(r.grade_num),
    count: Number(r.count),
    label: r.label,
  }))
  const popTotal = Number(rows[0].pop_total ?? 0) ||
    distribution.reduce((s, d) => s + d.count, 0)
  // Gem rate CCC = toutes les notes 10 (Gem + Gold + Black) / total
  const pop10 = distribution.filter(d => d.grade === 10).reduce((s, d) => s + d.count, 0)
  return { company: 'CCC', popTotal, gemRate: popTotal > 0 ? pop10 / popTotal : 0, distribution }
}

export async function GET(req: NextRequest) {
  const cardId = req.nextUrl.searchParams.get('card_id')
  const lang = (req.nextUrl.searchParams.get('lang') || 'EN').toUpperCase() as Lang
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  // Plan (on ne bloque pas : on décide si on renvoie la distribution détaillée).
  const user = await getCurrentUserWithProfile()
  const isPremium = !!user && (PLAN_LEVEL[user.plan] ?? 0) >= PLAN_LEVEL['premium']

  const [psa, ccc] = await Promise.all([
    getPsaPop(cardId, lang).catch(() => null),
    getCccPop(cardId, lang).catch(() => null),
  ])

  // Ordre : société locale d'abord (CCC en FR ; PSA ailleurs).
  const companies: CompanyPop[] = []
  if (lang === 'FR') {
    if (ccc) companies.push(ccc)
    if (psa) companies.push(psa)
  } else {
    if (psa) companies.push(psa)
    if (ccc) companies.push(ccc)
  }

  // Teaser free/pro : on garde le total recensé + gem rate par société,
  // mais on masque la distribution détaillée (réservée Premium).
  if (!isPremium) {
    return NextResponse.json(
      {
        locked: true,
        companies: companies.map(c => ({
          company: c.company, popTotal: c.popTotal, gemRate: c.gemRate, distribution: [],
        })),
        lang,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  }

  return NextResponse.json(
    { locked: false, companies, lang },
    { headers: { 'Cache-Control': 'private, max-age=300' } },
  )
}
