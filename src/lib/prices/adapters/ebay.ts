/**
 * eBay Browse API adapter — fetches active listings (not sold).
 *
 * Status: SKELETON. Real logic lives in src/app/api/prices/ebay/route.ts.
 */

import type { PriceAdapter, PriceSnapshot } from '../types';

export class EbayAdapter implements PriceAdapter {
  readonly name = 'ebay' as const;

  async fetchCard(cardRef: string): Promise<PriceSnapshot[]> {
    throw new Error('EbayAdapter.fetchCard not yet implemented');
  }

  async fetchBatch(cardRefs: string[]): Promise<PriceSnapshot[]> {
    throw new Error('EbayAdapter.fetchBatch not yet implemented');
  }
}
