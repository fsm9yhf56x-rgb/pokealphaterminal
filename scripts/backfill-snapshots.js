#!/usr/bin/env node
/**
 * Phase 7 — Commit 4/6: Backfill prices_snapshots from historical prices rows.
 *
 * For each row in `prices`:
 *   - if ebay_avg NOT NULL → emit 1 snapshot { source: 'ebay', variant: 'raw' }
 *   - if tcg_avg NOT NULL → emit 1 snapshot { source: 'tcgplayer', variant: 'raw' }
 *   - if cardmarket_avg NOT NULL → emit 1 snapshot { source: 'cardmarket', variant: 'raw' }
 *   - if psa10_avg NOT NULL → emit 1 snapshot { source: 'poketrace', variant: 'psa10' }
 *   - if psa9_avg NOT NULL → emit 1 snapshot { source: 'poketrace', variant: 'psa9' }
 *
 * All snapshots tagged with source_meta.backfilled = true for rollback.
 * fetched_at preserved from the source row (preserves chronology).
 *
 * Idempotent: re-runs skip already-backfilled data using (card_ref, source, variant, fetched_at).
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const DRY_RUN = process.argv.includes('--dry');
const PAGE_SIZE = 1000;
const BATCH_INSERT_SIZE = 500;

function deriveCardRef(row) {
  // card_ref = poketrace_id (guaranteed unique per row in prices)
  return row.poketrace_id;
}

function rowToSnapshots(row) {
  const snaps = [];
  const cardRef = deriveCardRef(row);
  const fetchedAt = row.fetched_at || new Date().toISOString();
  const meta = { backfilled: true, card_name: row.card_name, source_row: row.id };

  // eBay
  if (row.ebay_avg != null) {
    snaps.push({
      card_ref: cardRef,
      source: 'ebay',
      variant: 'raw',
      price_avg: row.ebay_avg,
      price_low: row.ebay_low ?? null,
      price_high: row.ebay_high ?? null,
      nb_sales: row.ebay_sales ?? null,
      currency: row.currency || 'USD',
      source_meta: meta,
      fetched_at: fetchedAt,
    });
  }

  // TCGPlayer
  if (row.tcg_avg != null) {
    snaps.push({
      card_ref: cardRef,
      source: 'tcgplayer',
      variant: 'raw',
      price_avg: row.tcg_avg,
      price_low: row.tcg_low ?? null,
      price_high: row.tcg_high ?? null,
      nb_sales: row.tcg_sales ?? null,
      currency: row.currency || 'USD',
      source_meta: meta,
      fetched_at: fetchedAt,
    });
  }

  // Cardmarket
  if (row.cardmarket_avg != null) {
    snaps.push({
      card_ref: cardRef,
      source: 'cardmarket',
      variant: 'raw',
      price_avg: row.cardmarket_avg,
      price_low: row.cardmarket_low ?? null,
      currency: 'EUR',
      source_meta: { ...meta, cardmarket_trend: row.cardmarket_trend },
      fetched_at: fetchedAt,
    });
  }

  // PSA10 (will be 0 currently, but safe for future)
  if (row.psa10_avg != null) {
    snaps.push({
      card_ref: cardRef,
      source: 'poketrace',
      variant: 'psa10',
      price_avg: row.psa10_avg,
      currency: row.currency || 'USD',
      source_meta: meta,
      fetched_at: fetchedAt,
    });
  }

  // PSA9
  if (row.psa9_avg != null) {
    snaps.push({
      card_ref: cardRef,
      source: 'poketrace',
      variant: 'psa9',
      price_avg: row.psa9_avg,
      currency: row.currency || 'USD',
      source_meta: meta,
      fetched_at: fetchedAt,
    });
  }

  return snaps;
}

async function main() {
  console.log(`🧪 Backfill prices_snapshots from prices ${DRY_RUN ? '(DRY RUN)' : '(LIVE)'}`);

  // Count total rows to process
  const { count: totalRows } = await supabase
    .from('_deprecated_prices')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 ${totalRows} rows in prices\n`);

  let offset = 0;
  let totalSnapshots = 0;
  let totalBatches = 0;
  const startTime = Date.now();

  while (offset < totalRows) {
    const { data: rows, error } = await supabase
      .from('_deprecated_prices')
      .select('*')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`❌ Error at offset ${offset}:`, error.message);
      process.exit(1);
    }
    if (!rows?.length) break;

    // Build snapshots for this page
    const pageSnapshots = [];
    for (const row of rows) {
      pageSnapshots.push(...rowToSnapshots(row));
    }

    if (DRY_RUN) {
      console.log(`  📦 page ${offset / PAGE_SIZE + 1}: ${rows.length} rows → ${pageSnapshots.length} snapshots (not inserted)`);
    } else {
      // Insert in batches of BATCH_INSERT_SIZE
      for (let i = 0; i < pageSnapshots.length; i += BATCH_INSERT_SIZE) {
        const batch = pageSnapshots.slice(i, i + BATCH_INSERT_SIZE);
        const { error: insertErr } = await supabase.from('prices_snapshots').insert(batch);
        if (insertErr) {
          console.error(`❌ Insert failed at offset ${offset}, batch ${i}:`, insertErr.message);
          process.exit(1);
        }
        totalBatches++;
      }
      console.log(`  ✅ page ${offset / PAGE_SIZE + 1}: ${rows.length} rows → ${pageSnapshots.length} snapshots inserted`);
    }

    totalSnapshots += pageSnapshots.length;
    offset += PAGE_SIZE;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n📊 TOTAL`);
  console.log(`   Source rows processed: ${totalRows}`);
  console.log(`   Snapshots ${DRY_RUN ? 'to insert' : 'inserted'}: ${totalSnapshots}`);
  console.log(`   Batches inserted: ${totalBatches}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`\n${DRY_RUN ? '🧪 DRY RUN — re-run without --dry to commit' : '✅ Done'}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
