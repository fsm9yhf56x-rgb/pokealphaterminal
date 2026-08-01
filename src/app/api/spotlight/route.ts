// NOTE COURBE : prices.history renvoye ici est la SOURCE CANONIQUE de l'historique
// affiche par defaut (drawer + fiche via SpotlightChart). /api/price-series ne sert
// QUE le selecteur d'etat/note. Ne pas dupliquer la logique de courbe ailleurs.
/**
 * /api/spotlight?card_id=xxx&lang=FR
 *
 * Unified endpoint that returns ALL data needed for SpotlightV2.
 *
 * Sources mergees dans prices.bySource :
 *   - cardmarket : prix raw NM (Cardmarket EUR via TCGdex)
 *   - ebay       : eBay listings (asks, prices_canonical)
 *   - tcgplayer  : prix raw TCGplayer (en USD->EUR)
 *   - ppt_graded : NEW. eBay sold graded data via graded_prices_ppt (real sold)
 *
 * Le composant SpotlightStates lit bySource.ppt_graded pour les notes gradees.
 * Le bloc raw NM continue de venir de bySource.cardmarket + bySource.ebay.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserWithProfile } from '@/lib/auth/helpers'
import { neon } from '@neondatabase/serverless'

export const dynamic = 'force-dynamic'

const sql = neon(process.env.DATABASE_URL!)
const USD_TO_EUR = 0.92

// Convert PPT key (psa10, cgc8_5) -> spotlight variant (psa_10, cgc_8_5)
function normalizeGradedVariant(pptKey: string): string {
  const m = pptKey.match(/^([a-z]+)(\d+)(?:_(\d+))?$/i)
  if (!m) return pptKey
  const [, slab, intPart, fracPart] = m
  const grade = fracPart ? `${intPart}_${fracPart}` : intPart
  return `${slab.toLowerCase()}_${grade}`
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const cardIdParam = params.get('card_id')
  const lang = (params.get('lang') || '').toUpperCase()
  const conditionRaw = params.get('condition') || ''

  if (!cardIdParam) {
    return NextResponse.json({ error: 'card_id required' }, { status: 400 })
  }
  let cardId: string = cardIdParam

  // Resolve short ID (e.g. "base1-4") to canonical with lang
  if (!cardId.match(/^(en|fr|jp|aopkm)-/i)) {
    const langOrder = lang === 'FR' ? ['fr', 'en', 'jp']
                    : lang === 'JP' || lang === 'JA' ? ['jp', 'aopkm', 'en', 'fr']
                    : ['en', 'fr', 'jp']
    const candidates = langOrder.map(l => `${l}-${cardId}`)
    const found = await sql`
      SELECT id FROM k_cards_export WHERE id = ANY(${candidates as any}) LIMIT 5
    ` as Array<{ id: string }>
    if (found.length > 0) {
      for (const prefix of langOrder) {
        const match = found.find(r => r.id.startsWith(prefix + '-'))
        if (match) { cardId = match.id; break }
      }
    }
  }
  // Fallback UUID: si card_id est un UUID portfolio, resoudre via portfolio_cards.
  if (cardId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cardId)) {
    const pc = await sql`
      SELECT COALESCE(k_card_id, lower(lang) || '-' || set_id || '-' || card_number) AS rid,
             k_card_id, lang, set_id, card_number
      FROM portfolio_cards WHERE id = ${cardId} LIMIT 1
    ` as Array<any>
    if (pc.length > 0) {
      if (pc[0].k_card_id) {
        cardId = pc[0].k_card_id
      } else {
        const r = await sql`
          SELECT id FROM k_cards_export
          WHERE set_id = ${(String(pc[0].lang).toLowerCase()) + '-' + pc[0].set_id}
            AND local_id = ${pc[0].card_number} LIMIT 1
        ` as Array<{ id: string }>
        if (r.length > 0) cardId = r[0].id
      }
    }
  }
  // Fallback robuste: si l'id ne resout pas directement, tenter set_id + local_id.
  // Couvre les ids "set-numero" (ex jp-sv2a-pokemon-card-151-208) vs id reel (jp-566550).
  {
    const direct = await sql`SELECT id FROM k_cards_export WHERE lower(id) = lower(${cardId}) LIMIT 1` as Array<{id:string}>
    if (direct.length > 0) cardId = direct[0].id
    if (direct.length === 0) {
      // separer la partie numero finale du reste (= set_id potentiel)
      const mm = String(cardId).match(/^(.*)-([A-Za-z]*[0-9]+[a-z]?)$/i)
      if (mm) {
        const rawSet = mm[1].replace(/^(en|fr|jp|aopkm)-/i, '')
        const num = mm[2]
        const langPref = (lang === 'JP' || lang === 'JA') ? 'jp' : lang === 'FR' ? 'fr' : 'en'
        const tryOrder = [langPref, 'jp', 'en', 'fr']
        for (const lp of tryOrder) {
          const r = await sql`
            SELECT id FROM k_cards_export
            WHERE set_id = ${lp + '-' + rawSet} AND local_id = ${num} LIMIT 1
          ` as Array<{ id: string }>
          if (r.length > 0) { cardId = r[0].id; break }
        }
      }
    }
  }

  try {
    // 1. Card info
    const cardRows = await sql`
      SELECT c.id, c.name, c.local_id, c.lang, c.rarity, c.rarity_normalized, c.image_url,
             c.set_id, s.name AS set_name, s.release_date, s.series AS era
      FROM k_cards_export c
      LEFT JOIN k_sets_export s ON s.id = c.set_id
      WHERE c.id = ${cardId}
    ` as Array<any>

    if (cardRows.length === 0) {
      return NextResponse.json({ error: 'Card not found', resolved_id: cardId }, { status: 404 })
    }
    const card = cardRows[0]

    // 2. Multi-source latest prices (cardmarket / ebay / tcgplayer asks)
    // Kodo Engine: matrice de prix par print (remplace prices_canonical vide)
    const fxRow = await sql`SELECT rate FROM fx_rates WHERE from_currency='USD' AND to_currency='EUR' ORDER BY rate_date DESC LIMIT 1` as Array<any>
    const USD_EUR = Number(fxRow[0]?.rate || 0.92)
    // Kodo Engine: signaux derives (fair value, cote FR, liquidite, grade EV)
    const sigRows = await sql`
      SELECT ps.fair_value_eur, ps.fair_value_method, ps.cote_fr_eur, ps.cote_lang,
             ps.liquidity_score, ps.spread_us_eu_pct, ps.grade_ev_psa10_eur
      FROM k_cards kc JOIN price_signals ps ON ps.print_id = kc.print_id AND ps.lang = kc.lang
      WHERE kc.id = ${cardId} LIMIT 1
    ` as Array<any>
    const sig = sigRows[0] || null
    const kodo = sig ? {
      fairValueEur: sig.fair_value_eur != null ? Number(sig.fair_value_eur) : null,
      fairValueMethod: sig.fair_value_method || null,
      coteFrEur: sig.cote_fr_eur != null ? Number(sig.cote_fr_eur) : null,
      coteLang: sig.cote_lang || null,
      liquidityScore: sig.liquidity_score != null ? Number(sig.liquidity_score) : null,
      spreadUsEuPct: sig.spread_us_eu_pct != null ? Number(sig.spread_us_eu_pct) : null,
      gradeEvPsa10Eur: sig.grade_ev_psa10_eur != null ? Number(sig.grade_ev_psa10_eur) : null,
    } : null
    const matrixRows = await sql`
      SELECT pm.market, pm.tier, pm.source, pm.spot, pm.low, pm.high,
             pm.sale_count, pm.is_asking, pm.currency, pm.as_of, pm.country_breakdown
      FROM price_matrix pm
      WHERE pm.kodo_card_id = ${cardId} AND pm.spot IS NOT NULL AND pm.spot > 0
    ` as Array<any>
    const RAW_TIERS: Record<string, string> = {
      NEAR_MINT: 'NEAR_MINT', EXCELLENT: 'EXCELLENT', LIGHTLY_PLAYED: 'LIGHTLY_PLAYED', MODERATELY_PLAYED: 'MODERATELY_PLAYED',
      HEAVILY_PLAYED: 'HEAVILY_PLAYED', DAMAGED: 'DAMAGED', MINT: 'MINT', AGGREGATED: 'CARDMARKET_TREND',
    }
    const toEur = (v: any, cur: string) => v == null ? null : (cur === 'USD' ? Math.round(Number(v) * USD_EUR * 100) / 100 : Number(v))
    const latestPrices = matrixRows
      .filter((r: any) => !r.is_asking || r.source === 'cardmarket' || r.source === 'ebay_fr')
      .map((r: any) => {
        const isGrade = /^(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA)_/.test(r.tier)
        const src = r.source === 'ppt_tcgplayer' ? 'tcgplayer' : (r.source === 'ppt_ebay' ? 'ebay' : r.source)
        return {
          source: src,
          variant: isGrade ? r.tier.toLowerCase() : 'raw',
          condition: isGrade ? null : (RAW_TIERS[r.tier] || r.tier),
          price_avg: toEur(r.spot, r.currency),
          price_low: toEur(r.low, r.currency),
          price_high: toEur(r.high, r.currency),
          currency: 'EUR',
          nb_sales: r.sale_count,
          fetched_at: r.as_of,
        }
      })
      .filter((r: any) => r.price_avg != null && r.price_avg > 0)

    // 2b. History selon condition de l'user
    //  - User a un grade (PSA 9, CGC 10...) -> timeseries graded eBay sold (grades_history)
    //  - User raw NM -> raw history TCGplayer (plus dense) si dispo, sinon Cardmarket fallback
    let history: Array<{ date: string; price: number }> = []

    // Detecte si condition = grade (ex: "PSA 9", "CGC 10")
    const gradeMatch = conditionRaw.match(/^([A-Za-z]+)\s+(\d+(?:\.\d+)?)$/)
    const isGraded = !!gradeMatch

    if (isGraded) {
      // Convert "PSA 9" -> "psa9", "CGC 9.5" -> "cgc9_5" (format key dans grades_history)
      const slab = gradeMatch![1].toLowerCase()
      const grade = gradeMatch![2].replace('.', '_')
      const gradeKey = slab + grade

      const gradedHistRows = await sql`
        SELECT grades_history->${gradeKey} AS hist
        FROM graded_prices_ppt
        WHERE set_name = ${card.set_name}
          AND card_number LIKE ${String(card.local_id ?? '').padStart(3, '0') + '/%'}
        LIMIT 1
      ` as Array<{ hist: Record<string, any> | null }>

      const histObj = gradedHistRows[0]?.hist || {}
      // Convert { "2025-12-18": { sevenDayAverage: 2691, average: 3000 }, ... } -> sorted array
      const USD_TO_EUR = 0.92
      history = Object.entries(histObj)
        .map(([date, pt]: [string, any]) => ({
          date,
          price: Math.round((Number(pt.sevenDayAverage || pt.average || 0)) * USD_TO_EUR * 100) / 100,
        }))
        .filter(p => p.price > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Fallback raw : raw_history TCGplayer NM (dense) sinon Cardmarket (clairseme mais existant)
    if (history.length === 0) {
      // 1. Tente raw_history TCGplayer Near Mint (depuis graded_prices_ppt.raw_history)
      const rawHistRows = await sql`
        SELECT raw_history->'conditions'->'Near Mint'->'history' AS nm_hist
        FROM graded_prices_ppt
        WHERE set_name = ${card.set_name}
          AND card_number LIKE ${String(card.local_id ?? '').padStart(3, '0') + '/%'}
        LIMIT 1
      ` as Array<{ nm_hist: Array<any> | null }>

      const nmHist = rawHistRows[0]?.nm_hist
      if (Array.isArray(nmHist) && nmHist.length > 0) {
        const USD_TO_EUR = 0.92
        history = nmHist
          .map((p: any) => ({
            date: typeof p.date === 'string' ? p.date : new Date(p.date).toISOString(),
            price: Math.round(Number(p.market || 0) * USD_TO_EUR * 100) / 100,
          }))
          .filter(p => p.price > 0)
          .sort((a, b) => a.date.localeCompare(b.date))
      }
    }

    // 2. Si toujours rien, fallback Cardmarket historique (l'ancien comportement)
    if (history.length === 0) {
      // UNE seule serie coherente: priorite NM tcgplayer > NM ppt > Trend cardmarket.
      // Jamais melanger les tiers (variation fictive sinon).
      // CHAQUE MARCHE SUR SA CARTE, l'historique compris. price_history vit par
      // print_id SANS langue : une carte FR sans donnee EU recevait la serie
      // NEAR_MINT/tcgplayer/USD convertie en euros — une courbe du marche US
      // sous drapeau francais, avec un "+10,6% sur 90j" qui decrit une tendance
      // americaine. Pas de donnee FR -> pas de courbe.
      const frOnly = String((card as any)?.lang || '').toUpperCase() === 'FR'
      const khRows = await sql`
        WITH series AS (
          SELECT ph.tier, ph.source, ph.market, count(*) AS pts,
            CASE WHEN ph.tier='NEAR_MINT' AND ph.source='tcgplayer' THEN 0
                 WHEN ph.tier='NEAR_MINT' AND ph.source='ppt_tcgplayer' THEN 1
                 WHEN ph.tier='AGGREGATED' AND ph.source='cardmarket' THEN 2
                 ELSE 9 END AS prio
          FROM k_cards kc JOIN price_history ph ON ph.print_id = kc.print_id
          WHERE kc.id = ${cardId} AND ph.price > 0
          GROUP BY ph.tier, ph.source, ph.market
        ), best AS (
          SELECT tier, source, market FROM series
           WHERE prio < 9 AND (${frOnly} = false OR market = 'EU')
           ORDER BY prio, pts DESC LIMIT 1
        )
        SELECT ph.day, ph.price, ph.currency
        FROM k_cards kc
        JOIN price_history ph ON ph.print_id = kc.print_id
        JOIN best b ON b.tier = ph.tier AND b.source = ph.source AND b.market = ph.market
        WHERE kc.id = ${cardId} AND ph.price > 0
        ORDER BY ph.day ASC LIMIT 365
      ` as Array<any>
      history = khRows.map((r: any) => ({
        date: String(r.day),
        price: r.currency === 'USD' ? Math.round(Number(r.price) * USD_EUR * 100) / 100 : Number(r.price),
      }))
    }

    // 2c. NEW: PPT graded prices (real eBay sold).
    // Match via (set_name, card_number padded 3 digits)
    const localId = card.local_id ?? cardId.split('-').pop() ?? '0'
    const numberPrefix = String(localId).padStart(3, '0') + '/'
    const pptRows = await sql`
      SELECT card_name, card_number, raw_market_usd, total_sales, grades, fetched_at
      FROM graded_prices_ppt
      WHERE set_name = ${card.set_name}
        AND card_number LIKE ${numberPrefix + '%'}
      ORDER BY fetched_at DESC
      LIMIT 1
    ` as Array<any>

    const pptGradedEntries: any[] = []
    if (pptRows.length > 0) {
      const grades = pptRows[0].grades || {}
      for (const [pptKey, raw] of Object.entries(grades)) {
        const g = raw as any
        if (!g || g.smartPrice == null) continue
        // Noise filter: low confidence + 1 vente = trop fragile, on n'expose pas
        if (g.confidence === 'low' && (g.count ?? 0) < 2) continue

        const variant = normalizeGradedVariant(pptKey)
        pptGradedEntries.push({
          variant,
          condition: null,
          price_avg: Math.round(Number(g.smartPrice) * USD_TO_EUR * 100) / 100,
          price_low: g.min != null ? Math.round(Number(g.min) * USD_TO_EUR * 100) / 100 : null,
          price_high: g.max != null ? Math.round(Number(g.max) * USD_TO_EUR * 100) / 100 : null,
          currency: 'EUR',
          nb_sales: g.count ?? null,
          fetched_at: pptRows[0].fetched_at,
          // metadata enriched (consumed if Spotlight needs)
          confidence: g.confidence ?? null,
          market_trend: g.marketTrend ?? null,
        })
      }
    }

    // 3. Group by source
    const bySource: Record<string, any[]> = {}
    for (const r of latestPrices) {
      const key = r.source
      if (!bySource[key]) bySource[key] = []
      bySource[key].push({
        variant: r.variant,
        condition: r.condition,
        price_avg: Number(r.price_avg),
        price_low: r.price_low ? Number(r.price_low) : null,
        price_high: r.price_high ? Number(r.price_high) : null,
        currency: r.currency,
        nb_sales: r.nb_sales,
        fetched_at: r.fetched_at,
      })
    }
    // Gradé FR : asks nettoyés (cardmarket_fr + ebay_fr, is_asking=true) décotés x0.88.
    // Chaque marché sur sa carte -> les ventes US (ppt_graded) ne servent QU'AUX cartes non-FR.
    const isFrCard = String(card.lang || '').toUpperCase() === 'FR'
    const ASK_DISCOUNT = 0.88
    const frGradedEntries: any[] = []
    for (const r of matrixRows) {
      if (r.market !== 'EU') continue
      if (!(r.source === 'cardmarket_fr' || r.source === 'ebay_fr')) continue
      if (!/^(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA)_/.test(r.tier)) continue
      const base = Number(r.spot)
      if (!(base > 0)) continue
      const isAsk = r.is_asking !== false
      // ebay_fr gradé (nos matchers Éd1/Unl + CCC/PSA) = déjà des médianes de marché
      // réelles -> PAS de décote. Seul cardmarket_fr (asks) subit le x0.88.
      const discount = r.source === 'ebay_fr' ? 1 : (isAsk ? ASK_DISCOUNT : 1)
      frGradedEntries.push({
        variant: r.tier.toLowerCase(),
        condition: null,
        price_avg: Math.round(base * discount * 100) / 100,
        price_low: null,
        price_high: null,
        currency: 'EUR',
        nb_sales: r.sale_count ?? null,
        fetched_at: r.as_of,
        is_ask: isAsk,
        src_kind: r.source === 'ebay_fr' ? 'ebay_fr' : 'cardmarket_fr',
      })
    }
    if (frGradedEntries.length > 0) {
      const byNote = new Map<string, any>()
      for (const e of frGradedEntries) {
        const cur = byNote.get(e.variant)
        const better = !cur
          || (e.src_kind === 'ebay_fr' && cur.src_kind !== 'ebay_fr')
          || (e.src_kind === cur.src_kind && e.price_avg > cur.price_avg)
        if (better) byNote.set(e.variant, e)
      }
      const deduped = Array.from(byNote.values()).sort((a, b) => {
        const aPsa = String(a.variant).startsWith('psa_') ? 1 : 0
        const bPsa = String(b.variant).startsWith('psa_') ? 1 : 0
        if (aPsa !== bPsa) return bPsa - aPsa
        return (b.nb_sales ?? 0) - (a.nb_sales ?? 0)
      })
      bySource.ppt_graded = deduped
    } else if (pptGradedEntries.length > 0 && !isFrCard) {
      pptGradedEntries.sort((a, b) => {
        const aPsa = String(a.variant).startsWith('psa_') ? 1 : 0
        const bPsa = String(b.variant).startsWith('psa_') ? 1 : 0
        if (aPsa !== bPsa) return bPsa - aPsa
        return (b.nb_sales ?? 0) - (a.nb_sales ?? 0)
      })
      bySource.ppt_graded = pptGradedEntries
    }

    // NOTE: l'ancien Filtre 1 (qui retirait les grades de ebay/tcgplayer) datait de
    // l'epoque ou ces grades venaient de prices_canonical (asks figees pourries).
    // Desormais les grades viennent de price_matrix (Kodo Engine: vraies ventes eBay sold,
    // is_asking=false, prix coherents). Ils sont fiables -> on les conserve.
    // Le verrou Premix ci-dessous (Filtre 2) gere TOUS les grades, toutes sources.

    // ── Verrou Premium sur le grade, TOUTES SOURCES confondues ──────────
    // Les variantes gradees existent dans ppt_graded ET dans ebay
    // (prices_canonical asks). Troncature unique apres construction complete:
    // non-Premium = 1 note teaser (la plus parlante), le reste retire serveur.
    // Donnees jamais envoyees = verrou reel.
    {
      const GRADE_PREFIXES = ['psa_', 'bgs_', 'cgc_', 'sgc_', 'ace_', 'tag_', 'cca_', 'pca_', 'ccc_']
      const gradeNum = (v: any): number => {
        const m = String(v ?? '').match(/_(\d+)(?:_(\d))?$/)
        return m ? Number(m[1]) + (m[2] ? Number(m[2]) / 10 : 0) : 0
      }
      const isGradedVariant = (v: any) => GRADE_PREFIXES.some(p => String(v ?? '').toLowerCase().startsWith(p))
      const u = await getCurrentUserWithProfile().catch(() => null)
      // Prix gradés = Pro (et Premium, car isPro couvre les deux). Le moteur Graded.ev reste Premium.
      const isPro = u?.isPro === true
      if (!isPro) {
        const allGraded: { src: string; entry: any }[] = []
        for (const [src, entries] of Object.entries(bySource)) {
          if (src.startsWith('__')) continue
          for (const e of entries as any[]) {
            if (isGradedVariant(e?.variant)) allGraded.push({ src, entry: e })
          }
        }
        if (allGraded.length > 1) {
          // Teaser: PSA d'abord, puis volume de ventes
          allGraded.sort((a, b) => {
            // Teaser le plus parlant: PSA prioritaire, puis le grade le plus haut (PSA 10 > 9...),
            // puis volume. Met en avant la note emblematique (ex Charizard PSA 10) plutot qu'un grade liquide bas.
            const aPsa = String(a.entry.variant).startsWith('psa_') ? 1 : 0
            const bPsa = String(b.entry.variant).startsWith('psa_') ? 1 : 0
            if (aPsa !== bPsa) return bPsa - aPsa
            const ga = gradeNum(a.entry.variant), gb = gradeNum(b.entry.variant)
            if (ga !== gb) return gb - ga
            return (b.entry.nb_sales ?? 0) - (a.entry.nb_sales ?? 0)
          })
          const keep = allGraded[0]
          for (const src of Object.keys(bySource)) {
            if (src.startsWith('__')) continue
            bySource[src] = (bySource[src] as any[]).filter(
              e => !isGradedVariant(e?.variant) || e === keep.entry
            )
          }
          ;(bySource as any).__gradedLocked = true
          ;(bySource as any).__gradedHiddenCount = allGraded.length - 1
        } else if (allGraded.length === 1) {
          // Une seule note au total: on la laisse, pas de lock (rien a cacher)
        }
      }
    }

    // 4. Prix d'affichage = NM (etat de reference), moyenne ponderee par volume.
    //    Regle Kodo: NM-first, seuil volume >= 3, garde-fou anti-aberration,
    //    priorite source selon le marche (FR -> Cardmarket EU, EN/US -> TCGplayer US).
    const VOL_MIN = 3
    const cardLangUp = String((card as any)?.lang || '').toUpperCase()
    const isEuMarket = cardLangUp === 'FR'

    // NM strict de chaque source (+ volume). Doublon TCGplayer: garder celui avec nb_sales.
    const cmTrend = bySource.cardmarket?.find(p => p.variant === 'raw' && p.condition === 'CARDMARKET_TREND')
    const cmNm = bySource.cardmarket?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
    const ebayNm = bySource.ebay?.find(p => p.variant === 'raw' && p.condition === 'NEAR_MINT')
    const tcgNmAll = (bySource.tcgplayer || []).filter(p => p.condition === 'NEAR_MINT')
    const tcgNm = tcgNmAll.find(p => p.nb_sales != null) || tcgNmAll[0]

    // Candidats : NM de chaque source. nb_sales null = prix de reference (volume
    // inconnu, PAS zero vente) -> garde avec poids forfaitaire. nb_sales connu mais
    // faible (< VOL_MIN) -> ecarte (peu fiable).
    const DEFAULT_WEIGHT = 10  // poids d'un NM de reference sans volume connu
    type Cand = { price: number; vol: number; volKnown: boolean; src: string; priority: number }
    const raw: Cand[] = []
    const mkCand = (p: any, src: string, priority: number): Cand => ({
      price: p.price_avg,
      vol: p.nb_sales != null ? p.nb_sales : DEFAULT_WEIGHT,
      volKnown: p.nb_sales != null,
      src, priority,
    })
    // Kodo: une carte FR se price SUR LE MARCHE FR/EU uniquement.
    // On n'autorise JAMAIS une source US (tcgplayer/ebay US) a composer le prix
    // d'une carte FR -> sinon fuite US deguisee en cote FR (ex base2-3 vintage non mappe).
    if (cmNm && cmNm.price_avg > 0) raw.push(mkCand(cmNm, 'cardmarket', isEuMarket ? 3 : 2))
    if (!isEuMarket && tcgNm && tcgNm.price_avg > 0) raw.push(mkCand(tcgNm, 'tcgplayer', 3))
    if (!isEuMarket && ebayNm && ebayNm.price_avg > 0) raw.push(mkCand(ebayNm, 'ebay', 1))
    // Prix Édition 1 / Unlimited FR maison (eBay FR, tri chirurgical). PRIORITAIRE :
    // ces prix séparent les éditions et remplacent le prix Cardmarket pollué (qui
    // mélange Éd1/Éd2). Éd1 sur id -1st- (variant ed1_raw), Unlimited sur id normal
    // (variant unl_raw). Le prix édition-spécifique fait autorité -> on repart from scratch.
    const isEd1Card = /-1st-\d+$/.test(cardId)
    const wantEdVariant = isEd1Card ? 'ed1_raw' : 'unl_raw'
    const edCand = (bySource.ebay_fr || []).find((p: any) => p.variant === wantEdVariant)
    if (edCand && edCand.price_avg > 0) {
      raw.length = 0
      raw.push(mkCand(edCand, 'ebay_fr_edition', 10))
    }

    // Filtre volume: on n'ecarte QUE les sources avec volume connu ET faible.
    // Les sources sans volume connu (reference) sont conservees.
    let cands = raw.filter(c => !c.volKnown || c.vol >= VOL_MIN)

    // Garde-fou anti-aberration: exclure les prix hors [0.4x, 2.5x] de la mediane
    if (cands.length >= 2) {
      const sorted = [...cands].map(c => c.price).sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]
      cands = cands.filter(c => c.price >= median * 0.4 && c.price <= median * 2.5)
    }

    // cmTrend en renfort si on n'a rien (ou comme reference marche EU)
    if (cands.length === 0 && cmTrend && cmTrend.price_avg > 0) {
      cands = [{ price: cmTrend.price_avg, vol: DEFAULT_WEIGHT, volKnown: false, src: 'cardmarket_trend', priority: isEuMarket ? 3 : 2 }]
    }

    // Moyenne ponderee par volume (poids = volume, mineure ponderation par priorite source)
    let marketEst: number | null = null
    if (cands.length > 0) {
      const wsum = cands.reduce((s, c) => s + (c.vol * c.priority), 0)
      marketEst = wsum > 0
        ? cands.reduce((s, c) => s + c.price * (c.vol * c.priority), 0) / wsum
        : cands.reduce((s, c) => s + c.price, 0) / cands.length
    }

    // ── frByCondition : prix FR par etat (raw), depuis country.FR.language.FR.
    //    Asking-only (le vendu FR par etat n'existe pas), seuil saleCount>=3,
    //    MINT ignore (ambigu), dedup par tier (saleCount max), garde-fou outlier.
    //    Le composant <PriceByCondition> affiche ces donnees labellees "annonces FR"
    //    si non vide, sinon placeholder. Se remplit tout seul quand la densite arrive.
    // EXCELLENT etait absent de cette liste (recopie sans lui quand MINT a ete
    // retire) -> le cran manquait dans le tableau alors que le moteur le calcule,
    // et c'est justement lui qui porte le prix de marche headline (Nostenfer Ed1 :
    // 175,99 EXCELLENT affiche en tete, invisible dans le tableau = fiche inexplicable).
    const FR_RAW_TIERS = ['NEAR_MINT', 'EXCELLENT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED']
    const FR_MIN_ASKING = 3
    const frByCondition: Record<string, { price: number; saleCount: number; isAsking: boolean }> = {}
    const coteRef = (kodo?.coteFrEur ?? kodo?.fairValueEur ?? marketEst ?? null)
    const outlierMax = coteRef != null ? coteRef * 5 : Infinity
    for (const r of matrixRows) {
      if (!FR_RAW_TIERS.includes(r.tier)) continue
      if (r.source !== 'cardmarket_unsold') continue  // asking-only
      const fr = r.country_breakdown?.FR?.language?.FR
      if (!fr || fr.avg == null) continue
      const price = Number(fr.avg)
      const sc = Number(fr.saleCount ?? 0)
      if (!(price > 0) || price > outlierMax) continue
      if (sc < FR_MIN_ASKING) continue
      const prev = frByCondition[r.tier]
      if (!prev || sc > prev.saleCount) {
        frByCondition[r.tier] = { price: Math.round(price * 100) / 100, saleCount: sc, isAsking: true }
      }
    }

    // Fallback kodo_state : prix par etat derives (percentiles reels vintage OU
    // ratios de decote FR calibres). Affiches avec le marqueur ~ (indicatif).
    // On ne remplit QUE les etats absents du breakdown Cardmarket reel.
    for (const r of matrixRows) {
      if (r.source !== 'kodo_state') continue
      if (!FR_RAW_TIERS.includes(r.tier)) continue
      if (frByCondition[r.tier]) continue
      const kprice = Number(r.spot)
      if (!(kprice > 0)) continue
      frByCondition[r.tier] = { price: Math.round(kprice * 100) / 100, saleCount: 0, isAsking: true, derived: true } as any
    }
    // ── FILTRE MARCHE FR : une carte FR ne montre QUE le grade FR (CCC/PCA) ──────
    // Les tiers gradés US (PSA/CGC/BGS/eBay US) sont collectés dans bySource mais
    // n'ont aucun sens sur une fiche FR (PSA ne grade quasi pas de FR). On les retire
    // ici, a la source, pour que TOUTES les fiches (CardDetailPage + SpotlightV2)
    // soient coherentes avec l'onglet Gradation (qui lit deja grading_pop CCC/PCA).
    // Marche non-FR (EN/JP) : comportement inchange, tout le grade reste visible.
    {
      const isFrCard = String((card as any)?.lang || '').toUpperCase() === 'FR'
      if (isFrCard) {
        const FR_COMPANIES = ['ccc_', 'pca_', 'psa_', 'cgc_', 'bgs_', 'sgc_', 'ace_', 'tag_', 'cca_']  // toutes sociétés : le prix FR est garanti par la SOURCE (ebay_fr/cardmarket_fr), pas par le grader
        const GRADE_PREFIXES = ['psa_', 'bgs_', 'cgc_', 'sgc_', 'ace_', 'tag_', 'cca_', 'pca_', 'ccc_']
        const isGradedVar = (v: any) => GRADE_PREFIXES.some(p => String(v ?? '').toLowerCase().startsWith(p))
        const isFrGradedVar = (v: any) => FR_COMPANIES.some(p => String(v ?? '').toLowerCase().startsWith(p))
        let removedNonFr = 0
        for (const src of Object.keys(bySource)) {
          if (src.startsWith('__')) continue
          const before = (bySource[src] as any[]).length
          bySource[src] = (bySource[src] as any[]).filter(
            e => !isGradedVar(e?.variant) || isFrGradedVar(e?.variant)
          )
          removedNonFr += before - (bySource[src] as any[]).length
        }
        // ppt_graded = uniquement US (EN/JP) -> vide sur une carte FR
        if (Array.isArray(bySource.ppt_graded)) {
          bySource.ppt_graded = (bySource.ppt_graded as any[]).filter(e => isFrGradedVar(e?.variant))
          if ((bySource.ppt_graded as any[]).length === 0) delete bySource.ppt_graded
        }
        ;(bySource as any).__frGradeOnly = true
        ;(bySource as any).__nonFrGradeRemoved = removedNonFr
      }
    }

    // ── frGraded : prix gradés FR (CCC/PCA) pour l'onglet Prix, par note.
    //    La donnee est deja dans bySource (filtree FR ci-dessus). On la reformate
    //    en liste triee par prix decroissant. Onglet Prix = "combien ca vaut grade",
    //    distinct de l'onglet Gradation = "faut-il grader" (Graded.ev + population).
    const frGraded: Array<{ variant: string; price: number; saleCount: number }> = []
    {
      const isFrCard = String((card as any)?.lang || '').toUpperCase() === 'FR'
      if (isFrCard) {
        const FR_COMPANIES = ['ccc_', 'pca_', 'psa_', 'cgc_', 'bgs_', 'sgc_', 'ace_', 'tag_', 'cca_']
        const seen = new Set<string>()
        for (const src of Object.keys(bySource)) {
          if (src.startsWith('__')) continue
          for (const e of (bySource[src] as any[])) {
            const v = String(e?.variant ?? '').toLowerCase()
            if (!FR_COMPANIES.some(p => v.startsWith(p))) continue
            const price = Number(e?.price_avg ?? 0)
            if (!(price > 0)) continue
            if (seen.has(v)) continue
            seen.add(v)
            frGraded.push({ variant: e.variant, price: Math.round(price * 100) / 100, saleCount: Number(e?.nb_sales ?? 0) })
          }
        }
        frGraded.sort((a, b) => b.price - a.price)
      }
    }
    return NextResponse.json({
      card,
      kodo,
      prices: {
        bySource,
        marketEst,
        primaryCurrency: 'EUR',
        history,
        frByCondition,
        frGraded,
        frGradedLocked: (bySource as any).__gradedLocked === true,
        frGradedHiddenCount: Number((bySource as any).__gradedHiddenCount || 0),
        fxUsdEur: USD_EUR,
      },
      resolved_id: cardId,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch (e: any) {
    console.error('[spotlight] error:', e?.message || e)
    return NextResponse.json({ error: e?.message || 'internal' }, { status: 500 })
  }
}
