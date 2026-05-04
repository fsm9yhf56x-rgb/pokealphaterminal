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

  const cardRef = card.id; // = poketrace_id on prices table

  const topPrice =
    ebay?.avg && tcg?.avg
      ? Math.round((ebay.avg * 0.5 + tcg.avg * 0.5) * 100) / 100
      : ebay?.avg || tcg?.avg || card.topPrice || null;

  const snaps: PriceSnapshot[] = [];

  // Raw snapshot (aggregated top price)
  snaps.push({
    card_ref: cardRef,
    source: 'poketrace', lang: 'EN',
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
      source: 'poketrace', lang: 'EN',
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
      source: 'poketrace', lang: 'EN',
      variant: 'psa9',
      price_avg: psa9.avg,
      price_low: psa9.low ?? null,
      price_high: psa9.high ?? null,
      nb_sales: psa9.saleCount ?? null,
      currency: card.currency || 'USD',
      source_meta: { poketrace_id: card.id, card_name: card.name },
    });
  }

  // Per-condition snapshots: 5 conditions × 2 sources = up to 10 extra snapshots per card
  // (skipped silently when the source/condition has no data)
  const CONDITIONS = ['NEAR_MINT', 'LIGHTLY_PLAYED', 'MODERATELY_PLAYED', 'HEAVILY_PLAYED', 'DAMAGED'] as const;
  for (const cond of CONDITIONS) {
    const ebayCond = card.prices?.ebay?.[cond];
    const tcgCond = card.prices?.tcgplayer?.[cond];
    if (ebayCond?.avg) {
      snaps.push({
        card_ref: cardRef,
        source: 'ebay', lang: 'EN',
        variant: 'raw',
        condition: cond,
        price_avg: ebayCond.avg,
        price_low: ebayCond.low ?? null,
        price_high: ebayCond.high ?? null,
        price_median: ebayCond.median7d ?? null,
        nb_sales: ebayCond.saleCount ?? null,
        currency: card.currency || 'USD',
        source_meta: {
          poketrace_id: card.id,
          condition: cond,
          ebay_avg7d: ebayCond.avg7d ?? null,
          ebay_avg30d: ebayCond.avg30d ?? null,
        },
      });
    }
    if (tcgCond?.avg) {
      snaps.push({
        card_ref: cardRef,
        source: 'tcgplayer' as any, lang: 'EN',
        variant: 'raw',
        condition: cond,
        price_avg: tcgCond.avg,
        price_low: tcgCond.low ?? null,
        price_high: tcgCond.high ?? null,
        price_median: tcgCond.median7d ?? null,
        nb_sales: tcgCond.saleCount ?? null,
        currency: card.currency || 'USD',
        source_meta: {
          poketrace_id: card.id,
          condition: cond,
          tcg_avg7d: tcgCond.avg7d ?? null,
          tcg_avg30d: tcgCond.avg30d ?? null,
        },
      });
    }
  }

  return snaps;
}
