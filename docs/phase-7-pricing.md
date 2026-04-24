# Phase 7 — Time-Series Pricing Architecture

Last updated: 2026-04-23
Status: Active (commit 6/6 complete — `prices` renamed to `_deprecated_prices`)

## Tables

### `prices_snapshots` (append-only, source-of-truth for prices)
- Every price read/fetch writes 1+ rows here (source-agnostic via adapters)
- Schema: `card_ref + source + variant + price_avg/low/high + fetched_at + source_meta`
- Card_ref convention: equals `poketrace_id` (which equals the unique row id in `_deprecated_prices`)

### `prices_latest` (MATERIALIZED VIEW on prices_snapshots)
- DISTINCT ON (card_ref, source, variant) ORDER BY fetched_at DESC
- Refreshed via `SELECT refresh_prices_latest()` RPC
- Unique index on (card_ref, source, variant) → supports CONCURRENTLY refresh

### `_deprecated_prices` (formerly `prices`, legacy table)
- Still the primary write target for the 5 dual-write routes
- Still source of truth for card metadata (name, number, set_slug, variant labels)
- Will be removed in a future refactor once writes are fully abstracted through adapters
- **DO NOT** read from this table in new code — use `prices_v2` instead

### `prices_v2` (VIEW for read compatibility)
- JOINs `_deprecated_prices` with `prices_latest` via poketrace_id
- Exposes the same columns as legacy `prices` (ebay_avg, cardmarket_avg, psa10_avg, etc.)
- Price values: snapshot-driven when available, fallback to `_deprecated_prices` otherwise
- top_price + tier recomputed dynamically (no stale cached value)

## Write paths (dual-write)

5 routes write both to `_deprecated_prices` (for current metadata) AND emit `PriceSnapshot` objects via `writeSnapshots()`:
- `/api/prices/ebay`       → source='ebay'
- `/api/prices/tcgdex`     → source='cardmarket'
- `/api/prices/refresh`    → source='poketrace' (raw + psa10 variants)
- `/api/prices/sync`       → source='poketrace' (raw + psa10 + psa9)
- `/api/cron/prices`       → both eBay fill-gaps + PokeTrace batch

## Read paths

- `/api/prices/route.ts`      reads from `prices_v2` ✅ (public API)
- `admin-queries.ts`          still reads from `_deprecated_prices` (admin dashboard, no user impact)
- Internal reads inside dual-write routes (find-to-update patterns): still read from `_deprecated_prices` (needed for `.update().eq('id', ...)` semantics)

## Adapter pattern

`src/lib/prices/`:
- `types.ts`              — PriceSource, PriceVariant, PriceSnapshot, PriceAdapter
- `writer.ts`             — writeSnapshots() + refreshPricesLatest()
- `adapters/`
  - `poketrace.ts`        — skeleton (future: migrate refresh/sync logic here)
  - `ebay.ts`             — skeleton
  - `tcgdex.ts`           — skeleton
  - `poketrace-mapper.ts` — shared builder for PokeTrace card → snapshots

## Key numbers (2026-04-23 after commit 5/6)

- `_deprecated_prices`: 29,638 rows
- `prices_snapshots`: 31,833 rows (29,476 unique card_refs)
- `prices_latest`: 23,075 rows
- Top asset preserved: Charizard 1st Ed Shadowless @ $15,000 ✅

## Backfill

`scripts/backfill-snapshots.js`:
- Reads every row from `_deprecated_prices`
- Emits up to 5 snapshots per row (ebay, tcgplayer, cardmarket, psa10, psa9)
- Tags each with `source_meta.backfilled = true` for rollback
- Preserves `fetched_at` from source row (chronology)
- Rollback: `DELETE FROM prices_snapshots WHERE source_meta->>'backfilled' = 'true';`

## Rollback plan (emergency)

If the rename breaks production, run this SQL:

```sql
-- Rollback: restore table name
DROP VIEW IF EXISTS prices_v2 CASCADE;
ALTER TABLE _deprecated_prices RENAME TO prices;

-- Recreate prices_v2 pointing to 'prices' (see commit 5 for exact SQL)
```

And revert the code commit:

```bash
git reset --hard HEAD~1  # if not pushed
# OR
git revert HEAD          # if already pushed
```

## Post-Phase 7 verification (2026-04-24)

**Claim from earlier investigation**: "236 duplicate rows in prices"

**Verdict after audit**: FALSE POSITIVE.

The 236 "duplicates" counted by `COUNT(*) - COUNT(DISTINCT (set_slug, card_number, variant))`
were caused by NULL handling in GROUP BY (NULL = NULL evaluates to NULL,
so rows with `card_number IS NULL` merged incorrectly).

Checking by the true unique key `poketrace_id`:
- Total rows: 29 638
- Unique poketrace_id: 29 638
- Duplicates: 0

The database is clean. No cleanup needed.
