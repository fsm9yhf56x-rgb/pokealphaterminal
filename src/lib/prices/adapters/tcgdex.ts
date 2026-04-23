/**
 * TCGdex adapter — wraps Cardmarket data exposed by TCGdex API.
 *
 * Status: SKELETON. Real logic lives in src/app/api/prices/tcgdex/route.ts.
 */

import type { PriceAdapter, PriceSnapshot } from '../types';

export class TcgdexAdapter implements PriceAdapter {
  readonly name = 'cardmarket' as const;  // emits "cardmarket" snapshots

  async fetchCard(cardRef: string): Promise<PriceSnapshot[]> {
    throw new Error('TcgdexAdapter.fetchCard not yet implemented');
  }

  async fetchBatch(cardRefs: string[]): Promise<PriceSnapshot[]> {
    throw new Error('TcgdexAdapter.fetchBatch not yet implemented');
  }
}
