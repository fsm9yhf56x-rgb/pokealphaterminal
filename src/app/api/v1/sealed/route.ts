// src/app/api/v1/sealed/route.ts
// Catalogue scelle Kodo — couche HTTP uniquement.
//
// Toute la logique metier (resolution de prix en trois temps, boosters, titre
// court, filtrage des photos d'annonces) vit dans src/lib/sealed/catalog.ts,
// partagee avec la page serveur /cartes/scelles/[id]. Une seule regle, un seul
// endroit : la fiche ne peut plus afficher un prix que la liste ignore.
//
// GET /api/v1/sealed?lang=FR&sku=display&set=me05&q=nuit&sort=price&limit=200

import { NextRequest, NextResponse } from 'next/server'
import { checkPublicRateLimit } from '@/lib/rate-limit'
import { LANGS, listSealed } from '@/lib/sealed/catalog'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  // Route publique servant le catalogue scelle cote : c'est du moat data.
  // Un utilisateur qui navigue fait quelques appels, un aspirateur en fait des
  // centaines. Fail-open si Upstash est indisponible : on prefere servir.
  const _rl = await checkPublicRateLimit(req, 'data')
  if (_rl) return _rl

  try {
    const sp = req.nextUrl.searchParams
    const lang = String(sp.get('lang') || 'fr').toLowerCase()
    if (!LANGS.has(lang)) {
      return NextResponse.json({ error: 'lang invalide (fr|en|jp)' }, { status: 400 })
    }

    const { items, total, priced, facets } = await listSealed({
      lang,
      sku: sp.get('sku'),
      set: sp.get('set'),
      q: (sp.get('q') || '').trim() || null,
      sort: sp.get('sort') || 'price',
      limit: Math.min(Math.max(Number(sp.get('limit') || 300), 1), 1000),
      offset: Math.max(Number(sp.get('offset') || 0), 0),
    })

    return NextResponse.json({
      lang: lang.toUpperCase(),
      count: items.length,
      total,
      priced,
      // le marche dont sortent ces prix, pour que l'UI puisse l'annoncer honnetement
      priceMarket: lang === 'fr' ? 'EU_FR' : 'US',
      items,
      facets,
    }, { headers: { 'Cache-Control': 'private, max-age=60' } })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erreur'
    return NextResponse.json({ error: 'sealed_failed', detail: msg }, { status: 500 })
  }
}
