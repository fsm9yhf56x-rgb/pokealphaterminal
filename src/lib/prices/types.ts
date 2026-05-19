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
  // Raw card states
  | 'raw' | 'holo' | 'reverse_holo'
  | '1st_ed' | 'shadowless' | 'sealed' | 'other'
  // PSA grades
  | 'psa_10' | 'psa_9_5' | 'psa_9' | 'psa_8_5' | 'psa_8'
  | 'psa_7' | 'psa_6' | 'psa_5' | 'psa_4' | 'psa_3' | 'psa_2' | 'psa_1'
  // BGS grades (Beckett)
  | 'bgs_10' | 'bgs_9_5' | 'bgs_9' | 'bgs_8_5' | 'bgs_8'
  | 'bgs_7' | 'bgs_6' | 'bgs_5' | 'bgs_4' | 'bgs_3'
  // CGC grades
  | 'cgc_10' | 'cgc_9_5' | 'cgc_9' | 'cgc_8_5' | 'cgc_8'
  | 'cgc_7' | 'cgc_6' | 'cgc_5'
  // SGC grades
  | 'sgc_10' | 'sgc_9_5' | 'sgc_9' | 'sgc_8' | 'sgc_7'
  // PCA grades (France)
  | 'pca_10' | 'pca_9' | 'pca_8' | 'pca_7'
  // CCC grades (France)
  | 'ccc_10' | 'ccc_9' | 'ccc_8' | 'ccc_7'
  // Legacy compatibility (DO NOT REMOVE)
  | 'psa10' | 'psa9' | 'psa8' | 'bgs10' | 'cgc10';

// ─────────────────────────────────────────────────────────────
// Main snapshot shape
// ─────────────────────────────────────────────────────────────

/**
 * A single price data point for a card at a moment in time.
 * Maps directly to one row in `prices_snapshots`.
 */
export type PriceCondition =
  | 'NEAR_MINT'
  | 'LIGHTLY_PLAYED'
  | 'MODERATELY_PLAYED'
  | 'HEAVILY_PLAYED'
  | 'DAMAGED'
  | 'POOR'
  | 'CARDMARKET_TREND';

export type PriceLang = 'EN' | 'FR' | 'JA';

export interface PriceSnapshot {
  /** Card identifier: e.g. "en-base1-4", "fr-base1-shadowless-4", "jp-20th-31651" */
  card_ref: string;

  /** Where this price came from */
  source: PriceSource;

  /** Variant of the card (raw, graded, 1st ed, etc.) */
  variant: PriceVariant;
  /** Card condition (NEAR_MINT, LIGHTLY_PLAYED, MODERATELY_PLAYED, HEAVILY_PLAYED, DAMAGED). Optional — defaults to null. */
  condition?: PriceCondition | null;

  /** Card language (EN/FR/JA). Optional — defaults to null. */
  lang?: PriceLang | null;

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
