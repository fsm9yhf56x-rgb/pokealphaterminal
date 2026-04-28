/**
 * Source-agnostic price types.
 *
 * Every source (eBay, TCGPlayer, Cardmarket, PokeTrace, etc.) emits
 * `PriceSnapshot` objects. The write layer and storage schema don't
 * know which source produced a given snapshot.
 *
 * This lets us swap price providers without migrating data.
 */

// ─────────────────────────────────────────────────────────────
// Enums (aligned with DB CHECK constraints)
// ─────────────────────────────────────────────────────────────

export type PriceSource =
  | 'ebay'
  | 'tcgplayer'
  | 'cardmarket'
  | 'poketrace'
  | 'tcgdex'
  | 'mercari_jp'
  | 'manual'
  | 'other';

export type PriceVariant =
  | 'raw'
  | 'holo'
  | 'reverse_holo'
  | 'psa10'
  | 'psa9'
  | 'psa8'
  | 'bgs10'
  | 'cgc10'
  | '1st_ed'
  | 'shadowless'
  | 'sealed'
  | 'other';

// ─────────────────────────────────────────────────────────────
// Main snapshot shape
// ─────────────────────────────────────────────────────────────

/**
 * A single price data point for a card at a moment in time.
 * Maps directly to one row in `prices_snapshots`.
 */
export interface PriceSnapshot {
  /** Card identifier: e.g. "en-base1-4", "fr-base1-shadowless-4", "jp-20th-31651" */
  card_ref: string;

  /** Where this price came from */
  source: PriceSource;

  /** Variant of the card (raw, graded, 1st ed, etc.) */
  variant: PriceVariant;

  // Prices — optional, each source reports what it can (null allowed for DB-compat)
  price_avg?: number | null;
  price_low?: number | null;
  price_high?: number | null;
  price_median?: number | null;

  // Volume
  nb_sales?: number | null;
  /** Number of days the stats span (7, 30, 90, 365) */
  period_days?: number;

  /** Currency ISO 4217 code. Defaults to EUR if omitted. */
  currency?: string;

  /** Source-specific metadata (poketrace_id, tcgplayer_sku, etc.) */
  source_meta?: Record<string, unknown>;

  /** When this price was fetched. Defaults to now() if omitted. */
  fetched_at?: Date;
}

// ─────────────────────────────────────────────────────────────
// Adapter contract
// ─────────────────────────────────────────────────────────────

/**
 * Contract every price source must implement.
 *
 * Adapters are stateless — the source-specific logic (API calls,
 * rate limiting, response mapping) lives here. The rest of the app
 * only consumes PriceSnapshot objects.
 */
export interface PriceAdapter {
  /** Identifier — matches the `source` field on emitted snapshots */
  readonly name: PriceSource;

  /**
   * Fetch current prices for a single card. May emit multiple
   * snapshots (e.g. raw + psa10 variants from the same API call).
   */
  fetchCard(cardRef: string): Promise<PriceSnapshot[]>;

  /**
   * Fetch prices for a batch of cards. Adapters can optimize
   * this (batch endpoints, parallelism, rate limiting).
   */
  fetchBatch(cardRefs: string[]): Promise<PriceSnapshot[]>;
}
