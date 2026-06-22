// ============================================================================
// ROLE DE CETTE ROUTE : SELECTEUR de serie uniquement (etat NM/LP... ou note PSA/CGC).
// La COURBE PRINCIPALE (par defaut) n'est PAS servie ici : elle vient de
// prices.history via /api/spotlight (source canonique, lang-aware, lue par le
// drawer ET la fiche). SpotlightChart n'appelle cette route QUE si l'utilisateur
// change de serie (userPicked=true). NE PAS rebrancher la courbe par defaut ici
// -> sinon on recree la divergence drawer/fiche corrigee en juin 2026.
// ============================================================================
/**
 * /api/price-series?card_id=xxx&lang=FR&series=NEAR_MINT
 *
 * Renvoie l'historique d'UNE serie precise pour le graphe a selecteur.
 *  - series raw   : 'NEAR_MINT' | 'LIGHTLY_PLAYED' | 'MODERATELY_PLAYED' | 'HEAVILY_PLAYED' | 'DAMAGED'
 *                   -> lit raw_history->'conditions'->LABEL->'history' (array {date, market})
 *  - series gradee: 'psa10' | 'cgc9' | 'bgs9_5' ...
 *                   -> lit grades_history->KEY (objet {date: {sevenDayAverage, average}})
 *
 * Renvoie aussi availableSeries (les series qui ont >=1 point) pour peupler le menu.
 * sparse = true si moins de SPARSE_THRESHOLD points (=> "historique en cours de construction").
 */
import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'
const sql = neon(process.env.DATABASE_URL!)
const USD_TO_EUR = 0.92
const SPARSE_THRESHOLD = 10

// Labels exacts des conditions raw dans raw_history->'conditions'
const RAW_LABEL: Record<string, string> = {
  NEAR_MINT: 'Near Mint',
  LIGHTLY_PLAYED: 'Lightly Played',
  MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played',
  DAMAGED: 'Damaged',
}
const RAW_ORDER = ['NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED']
const RAW_FR: Record<string, string> = {
  NEAR_MINT: 'Near Mint', LIGHTLY_PLAYED: 'Lightly Played', MODERATELY_PLAYED: 'Moderately Played',
  HEAVILY_PLAYED: 'Heavily Played', DAMAGED: 'Damaged',
}

// Ordre d'affichage des slabs gradés
const SLAB_ORDER: Record<string, number> = { psa: 0, cgc: 1, bgs: 2, ace: 3, sgc: 4, tag: 5 }
// Ordre d'affichage des societes (pills) par popularite
const COMPANY_ORDER = ['PSA', 'CGC', 'BGS', 'SGC', 'ACE', 'TAG']
function slabOf(key: string): string {
  const m = key.match(/^([a-z]+)/i)
  return m ? m[1].toUpperCase() : key.toUpperCase()
}
function gradeNum(key: string): string {
  const m = key.match(/^[a-z]+(\d+)(?:_(\d+))?$/i)
  if (!m) return key
  return `${m[1]}${m[2] ? '.' + m[2] : ''}`
}

function gradeLabel(key: string): string {
  const m = key.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return key.toUpperCase()
  const [, slab, intp, frac] = m
  return `${slab.toUpperCase()} ${intp}${frac ? '.' + frac : ''}`
}
function gradeSortKey(key: string): number {
  const m = key.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return 9999
  const [, slab, intp, frac] = m
  const slabRank = (SLAB_ORDER[slab.toLowerCase()] ?? 8) * 1000
  const gradeVal = parseFloat(`${intp}.${frac || 0}`)
  return slabRank - gradeVal // plus haute note en premier dans le slab
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  let cardId = params.get('card_id')
  const lang = (params.get('lang') || '').toUpperCase()
  const series = params.get('series') || 'NEAR_MINT'
  if (!cardId) return NextResponse.json({ error: 'card_id required' }, { status: 400 })

  // Resolve short id -> canonical (meme logique que spotlight)
  if (!cardId.match(/^(en|fr|jp|aopkm)-/i)) {
    const langOrder = lang === 'FR' ? ['fr', 'en', 'jp'] : lang === 'JP' || lang === 'JA' ? ['jp', 'aopkm', 'en', 'fr'] : ['en', 'fr', 'jp']
    const candidates = langOrder.map(l => `${l}-${cardId}`)
    const found = await sql`SELECT id FROM k_cards_export WHERE id = ANY(${candidates as any}) LIMIT 5` as Array<{ id: string }>
    if (found.length > 0) {
      for (const prefix of langOrder) {
        const match = found.find(r => r.id.startsWith(prefix + '-'))
        if (match) { cardId = match.id; break }
      }
    }
  }

  try {
    // Recup set_name (via jointure k_sets_export, comme l'API spotlight) + local_id
    const cardRows = await sql`
      SELECT c.local_id, c.print_id, c.lang AS card_lang, s.name AS set_name
      FROM k_cards_export c
      LEFT JOIN k_sets_export s ON s.id = c.set_id
      WHERE c.id = ${cardId}
      LIMIT 1
    ` as Array<{ local_id: string | number; set_name: string | null }>
    if (cardRows.length === 0) return NextResponse.json({ error: 'card not found' }, { status: 404 })
    const setName = cardRows[0].set_name
    const localId = cardRows[0].local_id
    const numberPrefix = String(localId ?? '').padStart(3, '0') + '/%'

    // ── CHEMIN FR : l'historique FR vit dans price_history (source='cardmarket_fr'
    //    = snapshot FR pur quotidien, sinon market='EU' Cardmarket). graded_prices_ppt
    //    est EN/JP only -> aveugle au FR. On sert donc l'Engine, format identique.
    const printId = (cardRows[0] as any).print_id as string
    const isFrCard = ((cardRows[0] as any).card_lang || '').toLowerCase() === 'fr' || lang === 'FR'
    if (isFrCard && printId) {
      const RAW_TIERS_FR = ['NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED']
      // Sources FR pertinentes (priorite a la cote Cardmarket = reference FR sur ce marche) :
      //  - NEAR_MINT raw  <- market='EU' AGGREGATED cardmarket (la courbe du drawer, dense)
      //                      + market='FR' cardmarket_fr (snapshot FR pur, s'accumule)
      //  - autres tiers raw + grade <- market='FR' (FR pur ; souvent sparse, normal)
      // On normalise AGGREGATED -> NEAR_MINT pour que la serie raw par defaut soit tracable.
      // NEAR_MINT raw : UNE seule source, jamais melangee (sinon fausse variation).
      //   priorite cardmarket_fr SI dense (>=SPARSE_THRESHOLD), sinon cote Cardmarket EU.
      const frNm = await sql`
        SELECT day::text AS date, price::float AS price, COALESCE(sale_count,0)::int AS volume
        FROM price_history WHERE print_id=${printId} AND market='FR' AND tier='NEAR_MINT' AND source='cardmarket_fr' AND price>0
        ORDER BY day ASC` as Array<{ date: string; price: number; volume: number }>
      const euNm = await sql`
        SELECT day::text AS date, price::float AS price, COALESCE(sale_count,0)::int AS volume
        FROM price_history WHERE print_id=${printId} AND market='EU' AND tier='AGGREGATED' AND source='cardmarket' AND price>0
        ORDER BY day ASC` as Array<{ date: string; price: number; volume: number }>
      const nmRows = (frNm.length >= SPARSE_THRESHOLD ? frNm : euNm).map(r => ({ ...r, tier: 'NEAR_MINT', source: frNm.length >= SPARSE_THRESHOLD ? 'cardmarket_fr' : 'cardmarket' }))
      // Autres tiers raw + grade : uniquement FR pur (souvent sparse, normal).
      const otherRows = await sql`
        SELECT day::text AS date, tier, source, price::float AS price, COALESCE(sale_count,0)::int AS volume
        FROM price_history WHERE print_id=${printId} AND market='FR' AND tier <> 'NEAR_MINT' AND price>0
        ORDER BY day ASC` as Array<{ date: string; tier: string; source: string; price: number; volume: number }>
      const rows = [...nmRows, ...otherRows] as Array<{ date: string; tier: string; source: string; price: number; volume: number }>

      // availableSeries : tiers ayant >=1 point
      const tiersPresent = new Set(rows.map(r => r.tier))
      const availRawFr: Array<{ key: string; label: string }> = []
      for (const k of RAW_TIERS_FR) if (tiersPresent.has(k)) availRawFr.push({ key: k, label: RAW_FR[k] || k })
      const availGradedFr: Array<{ key: string; label: string }> = []
      for (const t of tiersPresent) {
        if (RAW_TIERS_FR.includes(t)) continue
        const key = t.toLowerCase()
        availGradedFr.push({ key, label: gradeLabel(key) })
      }
      availGradedFr.sort((a, b) => gradeSortKey(a.key) - gradeSortKey(b.key))
      const gradedByCompanyFr: Record<string, Array<{ key: string; label: string; grade: string }>> = {}
      for (const g of availGradedFr) {
        const co = slabOf(g.key)
        if (!gradedByCompanyFr[co]) gradedByCompanyFr[co] = []
        gradedByCompanyFr[co].push({ key: g.key, label: g.label, grade: gradeNum(g.key) })
      }
      const companiesFr = Object.keys(gradedByCompanyFr).sort((a, b) => {
        const ia = COMPANY_ORDER.indexOf(a), ib = COMPANY_ORDER.indexOf(b)
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
      })

      // Serie demandee : on filtre par tier (raw = tier direct, grade = key.toUpperCase())
      const wantTier = RAW_TIERS_FR.includes(series) ? series : series.toUpperCase()
      const isGradedFr = !RAW_TIERS_FR.includes(series)
      const histFr = rows
        .filter(r => r.tier === wantTier)
        .map(r => ({ date: r.date, price: Math.round(r.price * 100) / 100, volume: r.volume }))
      const seriesLabelFr = isGradedFr ? gradeLabel(series) : (RAW_FR[series] || series)
      const pointCountFr = histFr.length

      return NextResponse.json({
        series,
        seriesLabel: seriesLabelFr,
        history: histFr,
        pointCount: pointCountFr,
        sparse: pointCountFr < SPARSE_THRESHOLD,
        hasVolume: histFr.some(p => (p.volume ?? 0) > 0),
        availableSeries: { raw: availRawFr, graded: availGradedFr },
        gradedByCompany: gradedByCompanyFr,
        companies: companiesFr,
      }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } })
    }

    // Charge la ligne graded_prices_ppt (raw_history + grades_history) la plus riche
    const pptRows = await sql`
      SELECT raw_history, grades_history
      FROM graded_prices_ppt
      WHERE set_name = ${setName} AND card_number LIKE ${numberPrefix}
      ORDER BY (
        COALESCE(jsonb_array_length(raw_history->'conditions'->'Near Mint'->'history'),0)
        + (SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(grades_history,'{}'::jsonb)))
      ) DESC
      LIMIT 1
    ` as Array<{ raw_history: any; grades_history: any }>

    const rawHist = pptRows[0]?.raw_history || null
    const gradesHist = pptRows[0]?.grades_history || null

    // ── availableSeries : quelles series ont >=1 point ?
    const availRaw: Array<{ key: string; label: string }> = []
    for (const k of RAW_ORDER) {
      const arr = rawHist?.conditions?.[RAW_LABEL[k]]?.history
      if (Array.isArray(arr) && arr.length > 0) availRaw.push({ key: k, label: RAW_FR[k] })
    }
    const availGraded: Array<{ key: string; label: string }> = []
    if (gradesHist && typeof gradesHist === 'object') {
      for (const k of Object.keys(gradesHist)) {
        const obj = gradesHist[k]
        const n = obj && typeof obj === 'object' ? Object.keys(obj).length : 0
        if (n > 0) availGraded.push({ key: k, label: gradeLabel(k) })
      }
      availGraded.sort((a, b) => gradeSortKey(a.key) - gradeSortKey(b.key))
    }
    // Groupe par societe pour les pills : { PSA: [{key,label,grade}], CGC: [...] }
    const gradedByCompany: Record<string, Array<{ key: string; label: string; grade: string }>> = {}
    for (const g of availGraded) {
      const co = slabOf(g.key)
      if (!gradedByCompany[co]) gradedByCompany[co] = []
      gradedByCompany[co].push({ key: g.key, label: g.label, grade: gradeNum(g.key) })
    }
    // Liste ordonnee des societes presentes
    const companies = Object.keys(gradedByCompany).sort((a, b) => {
      const ia = COMPANY_ORDER.indexOf(a), ib = COMPANY_ORDER.indexOf(b)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib)
    })

    // ── Construit la serie demandee
    let history: Array<{ date: string; price: number; volume?: number }> = []
    let seriesLabel = ''
    const isGraded = !RAW_ORDER.includes(series)

    if (isGraded) {
      seriesLabel = gradeLabel(series)
      const obj = gradesHist?.[series] || {}
      history = Object.entries(obj)
        .map(([date, pt]: [string, any]) => ({
          date,
          price: Math.round((Number(pt.sevenDayAverage || pt.average || 0)) * USD_TO_EUR * 100) / 100,
          volume: Number(pt.count ?? 0) || 0,
        }))
        .filter(p => p.price > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
    } else {
      seriesLabel = RAW_FR[series] || series
      const arr = rawHist?.conditions?.[RAW_LABEL[series]]?.history
      if (Array.isArray(arr)) {
        history = arr
          .map((p: any) => ({
            date: typeof p.date === 'string' ? p.date : new Date(p.date).toISOString(),
            price: Math.round(Number(p.market || 0) * USD_TO_EUR * 100) / 100,
            volume: Number(p.volume ?? 0) || 0,
          }))
          .filter((p: any) => p.price > 0)
          .sort((a: any, b: any) => a.date.localeCompare(b.date))
      }
    }

    const pointCount = history.length
    const sparse = pointCount < SPARSE_THRESHOLD
    const hasVolume = history.some(p => (p.volume ?? 0) > 0)

    return NextResponse.json({
      series,
      seriesLabel,
      history,
      pointCount,
      sparse,
      hasVolume,
      availableSeries: { raw: availRaw, graded: availGraded },
      gradedByCompany,
      companies,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e: any) {
    console.error('[price-series] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
