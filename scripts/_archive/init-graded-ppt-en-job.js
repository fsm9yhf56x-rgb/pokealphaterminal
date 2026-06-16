require('dotenv').config({ path: '.env.production.local' });
const { neon } = require('@neondatabase/serverless');

const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;
if (!KEY) { console.error('Missing POKEMON_PRICE_TRACKER_API_KEY'); process.exit(1); }

(async () => {
  const sql = neon(process.env.DATABASE_URL);

  console.log('=== Fetch /v2/sets?language=english ===');
  const r = await fetch('https://www.pokemonpricetracker.com/api/v2/sets?language=english', {
    headers: { Authorization: 'Bearer ' + KEY }
  });
  const j = await r.json();
  const allSets = j.data || [];
  console.log('Total sets EN PPT:', allSets.length);

  const now = new Date();

  // Released = traitables pour graded_prices_ppt
  const released = allSets.filter(s => {
    const d = s.releaseDate ? new Date(s.releaseDate) : null;
    return (s.cardCount || 0) > 0 && (d ? d <= now : true);
  });

  // Upcoming = pour page coming soon (stockes ailleurs)
  const upcoming = allSets.filter(s => {
    const d = s.releaseDate ? new Date(s.releaseDate) : null;
    return d && d > now;
  });

  console.log('Released:', released.length, '| Upcoming:', upcoming.length);

  // Sets deja completes
  const completed = await sql`
    SELECT DISTINCT set_name FROM graded_prices_ppt WHERE language='english';
  `;
  const completedSets = completed.map(r => r.set_name);

  const releasedNames = released.map(s => s.name);
  const pending = releasedNames.filter(s => !completedSets.includes(s));
  const completedRelevant = completedSets.filter(s => releasedNames.includes(s));

  console.log('Released deja OK:', completedRelevant.length);
  console.log('Released pending:', pending.length);

  // Budget realiste base sur cardCount des released pending
  const remainingCards = released
    .filter(s => pending.includes(s.name))
    .reduce((sum, s) => sum + (s.cardCount || 0), 0);
  const estimatedCredits = remainingCards * 2;

  console.log('Cartes restantes:', remainingCards);
  console.log('Credits budget estime:', estimatedCredits);

  // 1. Upsert job graded
  const JOB_GRADED = 'graded_ppt_en_full_coverage';
  await sql`
    INSERT INTO sync_progress (
      job_id, job_type, status,
      items_total, items_done, items_skipped, items_failed,
      items_pending, items_completed, items_errors,
      credits_budget,
      metadata,
      notes
    ) VALUES (
      ${JOB_GRADED}, 'graded_ppt_en', 'pending',
      ${released.length},
      ${completedRelevant.length},
      0, 0,
      ${JSON.stringify(pending)}::jsonb,
      ${JSON.stringify(completedRelevant)}::jsonb,
      '[]'::jsonb,
      ${estimatedCredits},
      ${JSON.stringify({
        source: 'PPT v2',
        language: 'english',
        api_endpoint: '/v2/cards?set=<name>&fetchAllInSet=true&includeEbay=true&includeHistory=true&days=180',
        cr_per_card: 2,
        ppt_sets_total: allSets.length,
        ppt_sets_released: released.length,
        ppt_sets_upcoming: upcoming.length,
        total_cards_estimate: released.reduce((sum, s) => sum + (s.cardCount || 0), 0),
        remaining_cards_estimate: remainingCards,
      })}::jsonb,
      'Couverture complete cartes EN released. Sets futurs syncs via job separe.'
    )
    ON CONFLICT (job_id) DO UPDATE SET
      items_total = EXCLUDED.items_total,
      items_done = EXCLUDED.items_done,
      items_pending = EXCLUDED.items_pending,
      items_completed = EXCLUDED.items_completed,
      items_errors = '[]'::jsonb,
      credits_budget = EXCLUDED.credits_budget,
      metadata = EXCLUDED.metadata,
      notes = EXCLUDED.notes,
      status = 'pending',
      completed_at = NULL;
  `;
  console.log('\n=== Job GRADED reinitialise ===');
  const r1 = await sql`SELECT status, items_total, items_done, jsonb_array_length(items_pending) AS pending, credits_budget FROM sync_progress WHERE job_id=${JOB_GRADED};`;
  console.log(r1[0]);

  // 2. Upsert job upcoming meta
  const JOB_UPCOMING = 'tcg_sets_upcoming_meta';
  const upcomingPayload = upcoming.map(s => ({
    name: s.name,
    pptId: s.id,
    series: s.series,
    releaseDate: s.releaseDate,
    cardCount: s.cardCount,
    imageUrl: s.imageCdnUrl,
    tcgPlayerId: s.tcgPlayerId,
  }));

  await sql`
    INSERT INTO sync_progress (
      job_id, job_type, status,
      items_total, items_done,
      items_pending, items_completed, items_errors,
      credits_budget,
      metadata,
      notes
    ) VALUES (
      ${JOB_UPCOMING}, 'tcg_sets_upcoming_meta', 'pending',
      ${upcoming.length}, 0,
      ${JSON.stringify(upcomingPayload)}::jsonb,
      '[]'::jsonb,
      '[]'::jsonb,
      0,
      ${JSON.stringify({
        source: 'PPT v2 /sets endpoint',
        purpose: 'Coming Soon page UI: anticipation des nouvelles sorties',
        usage: 'A integrer dans tcg_sets quand cardCount > 0 (auto-promotion released)',
      })}::jsonb,
      'Metadonnees des sets futurs pour page Coming Soon. Pas de sync prix (cardCount=0).'
    )
    ON CONFLICT (job_id) DO UPDATE SET
      items_total = EXCLUDED.items_total,
      items_pending = EXCLUDED.items_pending,
      metadata = EXCLUDED.metadata,
      notes = EXCLUDED.notes;
  `;
  console.log('\n=== Job UPCOMING META ===');
  const r2 = await sql`SELECT status, items_total, jsonb_array_length(items_pending) AS pending FROM sync_progress WHERE job_id=${JOB_UPCOMING};`;
  console.log(r2[0]);

  console.log('\n=== Sets UPCOMING (stockes pour future page UI) ===');
  upcomingPayload.forEach(s => {
    const days = Math.ceil((new Date(s.releaseDate) - now) / (1000*60*60*24));
    console.log(`  ${s.releaseDate.slice(0,10)} (+${days}j) | ${s.name} | ${s.series}`);
  });

  console.log('\n=== Prochains 10 sets a sync GRADED ===');
  pending.slice(0, 10).forEach((s, i) => console.log(`  ${i+1}. ${s}`));
})();
