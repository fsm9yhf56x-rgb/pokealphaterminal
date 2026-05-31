require('dotenv').config({ path: '.env.production.local' });
const { neon } = require('@neondatabase/serverless');

const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY || process.env.POKETRACE_API_KEY;
if (!KEY) { console.error('Missing API key'); process.exit(1); }

(async () => {
  const sql = neon(process.env.DATABASE_URL);

  // 1. Fetch sets PPT EN
  console.log('=== Fetch PPT sets EN ===');
  const r = await fetch('https://www.pokemonpricetracker.com/api/v2/sets?language=english', {
    headers: { Authorization: 'Bearer ' + KEY }
  });
  if (!r.ok) {
    console.error('PPT err:', r.status, await r.text());
    process.exit(1);
  }
  const j = await r.json();
  const pptSets = (j.data || []).map(s => s.name);
  console.log('Sets PPT EN total:', pptSets.length);
  console.log('Credits consumed:', j.apiCallsConsumed || 'N/A');
  console.log('Credits remaining:', j.apiCallsRemaining || 'N/A');

  // 2. Sets deja completes (graded_prices_ppt EN existants)
  const completed = await sql`
    SELECT DISTINCT set_name FROM graded_prices_ppt WHERE language='english'
    ORDER BY set_name;
  `;
  const completedSets = completed.map(r => r.set_name);
  console.log('\n=== Sets deja traites ===');
  console.log('Total:', completedSets.length);
  completedSets.forEach(s => console.log('  ' + s));

  // 3. Sets PPT NON encore traites = items_pending
  const pending = pptSets.filter(s => !completedSets.includes(s));
  console.log('\n=== Sets restants (PPT - completed) ===');
  console.log('Total:', pending.length);

  // 4. Init / upsert le job
  const JOB_ID = 'graded_ppt_en_full_coverage';
  const result = await sql`
    INSERT INTO sync_progress (
      job_id, job_type, status,
      items_total, items_done, items_skipped, items_failed,
      items_pending, items_completed, items_errors,
      credits_budget,
      metadata,
      notes
    ) VALUES (
      ${JOB_ID},
      'graded_ppt_en',
      'pending',
      ${pptSets.length},
      ${completedSets.length},
      0,
      0,
      ${JSON.stringify(pending)}::jsonb,
      ${JSON.stringify(completedSets)}::jsonb,
      '[]'::jsonb,
      62000,
      ${JSON.stringify({
        source: 'PPT v2',
        language: 'english',
        api_endpoint: '/v2/cards?set=<name>&fetchAllInSet=true&includeEbay=true&includeHistory=true&days=180',
        cr_per_card_estimate: 3,
        ppt_sets_total: pptSets.length,
        target: 'cover all EN cards in graded_prices_ppt',
      })}::jsonb,
      'Couverture complete cartes EN via PPT. Auto-resume via workflow GH Actions.'
    )
    ON CONFLICT (job_id) DO UPDATE SET
      items_total = EXCLUDED.items_total,
      items_done = EXCLUDED.items_done,
      items_pending = EXCLUDED.items_pending,
      items_completed = EXCLUDED.items_completed,
      metadata = EXCLUDED.metadata,
      last_run_at = NULL
    RETURNING job_id, items_total, items_done, jsonb_array_length(items_pending) AS pending_count;
  `;
  console.log('\n=== Job initialise ===');
  console.log(result[0]);

  // 5. Sample 10 prochains sets a traiter
  console.log('\n=== Prochains 10 sets a traiter ===');
  pending.slice(0, 10).forEach((s, i) => console.log(`  ${i+1}. ${s}`));
})();
