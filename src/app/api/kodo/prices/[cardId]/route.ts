import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db/sql'
import { checkPublicRateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

const ASK_DISCOUNT = 0.88

export async function GET(_req: NextRequest, { params }: { params: Promise<{ cardId: string }> }) {
  // Route publique : protection cout / abus (fail-open si Upstash down).
  const _rl = await checkPublicRateLimit(_req, 'data')
  if (_rl) return _rl

  try {
    const { cardId } = await params
    const cards = await sql.query(
      `SELECT kc.id, kc.print_id, kc.lang, kc.name_localized, kp.set_id, kp.number, kp.name_en
       FROM k_cards kc JOIN k_prints kp ON kp.id = kc.print_id WHERE kc.id = $1`, [cardId])
    const card = cards[0]
    if (!card) return NextResponse.json({ error: 'card_not_found' }, { status: 404 })

    const cardLang = String(card.lang || 'en').toLowerCase()
    const isFr = cardLang === 'fr'

    const [matrix, signals] = await Promise.all([
      // RÈGLE KODO — chaque prix son marché, et seulement des sources fiables.
      //   Carte FR  → gradés depuis ebay_fr UNIQUEMENT (CCC, filtré n>=2, annonces
      //               labellisées). Cardmarket_unsold EXCLU du gradé : asks
      //               fantaisistes (PSA8 > PSA10, prix au pif) = non fiable.
      //               Le BRUT FR (AGGREGATED, NEAR_MINT…) reste lu normalement.
      //   Carte EN/JP → inchangé : toutes lignes du print (ventes US fiables).
      isFr
        ? sql.query(
            `SELECT market, tier, source, spot, low, high, avg7d, avg30d, median7d, median30d,
                    sale_count, is_asking, currency, country_breakdown, as_of
             FROM price_matrix
             WHERE kodo_card_id = $1 AND market = 'EU'
             ORDER BY source, tier`, [card.id])
        : sql.query(
            `SELECT market, tier, source, spot, low, high, avg7d, avg30d, median7d, median30d,
                    sale_count, is_asking, currency, country_breakdown, as_of
             FROM price_matrix WHERE print_id = $1 ORDER BY market, source, tier`, [card.print_id]),
      sql.query(`SELECT * FROM price_signals WHERE print_id = $1 AND lang = $2`, [card.print_id, cardLang]),
    ])

    const sig = signals[0] || null
    const lang = String(card.lang || 'en').toUpperCase()

    // Cote specifique a la langue de LA carte demandee (depuis cote_lang JSONB) — INCHANGÉ
    let coteLang: any = null
    if (sig && sig.cote_lang) {
      const cl = sig.cote_lang as Record<string, any>
      for (const country of Object.keys(cl)) {
        const entry = cl[country]?.[lang]
        if (entry?.avg != null) { coteLang = { country, lang, ...entry }; break }
      }
      if (!coteLang) {
        const home: Record<string, string> = { FR: 'FR', EN: 'GB', DE: 'DE', IT: 'IT', ES: 'ES' }
        const c = home[lang]
        const entry = c ? cl[c]?.ALL : null
        if (entry?.avg != null) coteLang = { country: c, lang: 'ALL', ...entry }
      }
    }

    // Matrix FR : décote des annonces + flag basis (transparence vente/annonce)
    // + TUEUR d'aberrations par monotonie (une note basse plus chère qu'une note
    // supérieure = annonce fantaisiste -> supprimée). EN/JP : passe tel quel.
    const GRADE_RE = /^(PSA|CGC|BGS|SGC|TAG|ACE|PCA|CCC)_(\d+)(?:_(\d+))?/
    const gradeRank = (tier: string): number | null => {
      const m = tier.match(GRADE_RE)
      if (!m) return null
      return parseFloat(m[3] ? `${m[2]}.${m[3]}` : m[2])
    }

    let cleanMatrix = (matrix as any[]).map((r) => {
      const out: any = { ...r }
      for (const k of ['spot', 'low', 'high', 'avg7d', 'avg30d', 'median7d', 'median30d']) {
        out[k] = r[k] != null ? Number(r[k]) : null
      }
      out.basis = r.is_asking === false ? 'sale' : 'ask'
      if (isFr && r.is_asking !== false) {
        for (const k of ['spot', 'low', 'high', 'avg7d', 'avg30d', 'median7d', 'median30d']) {
          if (out[k] != null) out[k] = Math.round(out[k] * ASK_DISCOUNT * 100) / 100
        }
      }
      return out
    })

    // Plafond absolu anti-aberration (carte FR) : une note gradee dont le prix
    // decote depasse 25x la cote brute FR = annonce delirante (ex Dracaufeu FR
    // PSA10 a 880 000 EUR = 324x). Tuee AVANT la monotonie. Seuil valide sur le
    // vintage FR : les vraies notes plafonnent ~10x, le bruit commence >20x.
    if (isFr) {
      const rawBrutFr = sig ? Number(sig.cote_fr_eur ?? sig.fair_value_eur ?? 0) || 0 : 0
      if (rawBrutFr > 0) {
        // Plafond = 20x le brut, MAIS jamais sous 500 EUR : un raw cassé (ex
        // Dracaufeu ex à 7€) ne doit pas tuer un vrai prix gradé. 20x tue le
        // bruit Cardmarket résiduel (PSA9 à 55k = 20.3x), garde le légitime (<10x).
        const cap = Math.max(rawBrutFr * 20, 500)
        cleanMatrix = cleanMatrix.filter((r) => {
          if (gradeRank(String(r.tier)) == null) return true // brut : on garde
          const price = Number(r.spot ?? 0)
          return price > 0 && price <= cap
        })
      }
    }

    if (isFr) {
      // Tueur d'aberrations, PAR SOCIÉTÉ : on trie les notes par grade décroissant.
      // La note la plus haute fixe le plafond ; toute note inférieure dont le prix
      // dépasse le plafond courant est une aberration -> retirée. Le plafond ne
      // descend que sur les prix cohérents (monotonie réelle du marché gradé).
      const graded = cleanMatrix.filter((r) => gradeRank(String(r.tier)) != null)
      const brut = cleanMatrix.filter((r) => gradeRank(String(r.tier)) == null)
      const byCompany: Record<string, any[]> = {}
      for (const r of graded) {
        const co = String(r.tier).split('_')[0]
        ;(byCompany[co] ||= []).push(r)
      }
      const keptGraded: any[] = []
      for (const co of Object.keys(byCompany)) {
        const rows = byCompany[co].sort((a, b) => (gradeRank(String(b.tier))! - gradeRank(String(a.tier))!))
        let ceiling = Infinity
        for (const r of rows) {
          const price = Number(r.spot ?? 0)
          if (price <= 0) continue
          // note inférieure plus chère que la note supérieure retenue = aberration
          if (price > ceiling) continue
          keptGraded.push(r)
          ceiling = price // le plafond suit la dernière note cohérente (prix décroissant)
        }
      }
      cleanMatrix = [...brut, ...keptGraded]
    }

    return NextResponse.json({
      card: { id: card.id, printId: card.print_id, lang: card.lang, name: card.name_localized || card.name_en, setId: card.set_id, number: card.number },
      fairValueEur: sig ? Number(sig.fair_value_eur ?? 0) || null : null,
      fairValueMethod: sig?.fair_value_method ?? null,
      coteFrEur: sig ? Number(sig.cote_fr_eur ?? 0) || null : null,
      coteLang,
      liquidityScore: sig?.liquidity_score ?? null,
      spreadUsEuPct: sig?.spread_us_eu_pct ?? null,
      gradeEvPsa10Eur: sig ? Number(sig.grade_ev_psa10_eur ?? 0) || null : null,
      matrix: cleanMatrix,
      asOf: (matrix as any[])[0]?.as_of ?? null,
      market: isFr ? 'FR' : 'INTL',
      engine: 'kodo-v1',
    })
  } catch (e: any) {
    console.error('[kodo/prices]', e.message)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
