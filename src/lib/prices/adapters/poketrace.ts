/**
 * PokeTrace adapter — fetches sold data from PokeTrace API.
 *
 * Status: SKELETON. Real logic lives in src/app/api/prices/refresh/route.ts
 * and will be migrated here at commit 3 (dual-write).
 */

import type { PriceAdapter, PriceSnapshot } from '../types';

export class PokeTraceAdapter implements PriceAdapter {
  readonly name = 'poketrace' as const;

  async fetchCard(cardRef: string): Promise<PriceSnapshot[]> {
    // TODO commit 3: migrate logic from src/app/api/prices/refresh/route.ts
    throw new Error('PokeTraceAdapter.fetchCard not yet implemented');
  }

  async fetchBatch(cardRefs: string[]): Promise<PriceSnapshot[]> {
    // TODO commit 3: batch version
    throw new Error('PokeTraceAdapter.fetchBatch not yet implemented');
  }
}
