/**
 * Maps a PokeTrace API card response to PriceSnapshot[].
 *
 * PokeTrace aggregates data from eBay and TCGplayer and exposes
 * raw/PSA10/PSA9 variants. We emit one snapshot per variant.
 *
 * All snapshots carry source='poketrace' (PokeTrace is the immediate
 * data source — the day we fetch eBay directly, those snapshots will
 * have source='ebay').
 */

import type { PriceSnapshot } from '../types';

export function buildPoketraceSnapshots(
  card: any,
  ptSlug: string,
  setId: string
): PriceSnapshot[] {
  const ebay = card.prices?.ebay?.NEAR_MINT;
  const tcg = card.prices?.tcgplayer?.NEAR_MINT;
  const psa10 = card.prices?.ebay?.PSA_10;
  const psa9 = card.prices?.ebay?.PSA_9;

  const lang = setId?.match(/^(en|fr|jp)-/)?.[1] || 'en';
  const cardRef = `${lang}-${ptSlug}-${card.cardNumber || 'unknown'}`;

  const topPrice =
    ebay?.avg && tcg?.avg
      ? Math.round((ebay.avg * 0.5 + tcg.avg * 0.5) * 100) / 100
      : ebay?.avg || tcg?.avg || card.topPrice || null;

  const snaps: PriceSnapshot[] = [];

  // Raw snapshot (aggregated top price)
  snaps.push({
    card_ref: cardRef,
    source: 'poketrace',
    variant: 'raw',
    price_avg: topPrice,
    price_low: ebay?.low ?? tcg?.low ?? null,
    price_high: ebay?.high ?? tcg?.high ?? null,
    nb_sales: card.totalSaleCount ?? null,
    currency: card.currency || 'USD',
    source_meta: {
      poketrace_id: card.id,
      card_name: card.name,
      variant_label: card.variant || null,
      ebay_avg: ebay?.avg ?? null,
      tcg_avg: tcg?.avg ?? null,
    },
  });

  if (psa10?.avg) {
    snaps.push({
      card_ref: cardRef,
      source: 'poketrace',
      variant: 'psa10',
      price_avg: psa10.avg,
      price_low: psa10.low ?? null,
      price_high: psa10.high ?? null,
      nb_sales: psa10.saleCount ?? null,
      currency: card.currency || 'USD',
      source_meta: { poketrace_id: card.id, card_name: card.name },
    });
  }

  if (psa9?.avg) {
    snaps.push({
      card_ref: cardRef,
      source: 'poketrace',
      variant: 'psa9',
      price_avg: psa9.avg,
      price_low: psa9.low ?? null,
      price_high: psa9.high ?? null,
      nb_sales: psa9.saleCount ?? null,
      currency: card.currency || 'USD',
      source_meta: { poketrace_id: card.id, card_name: card.name },
    });
  }

  return snaps;
}
