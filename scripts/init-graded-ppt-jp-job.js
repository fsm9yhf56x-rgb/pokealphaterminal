require('dotenv').config({ path: '.env.production.local' });
const { neon } = require('@neondatabase/serverless');

const KEY = process.env.POKEMON_PRICE_TRACKER_API_KEY;
if (!KEY) { console.error('Missing POKEMON_PRICE_TRACKER_API_KEY'); process.exit(1); }

(async () => {
  const sql = neon(process.env.DATABASE_URL);

  console.log('=== Fetch /v2/sets?language=japanese (PAGINE limit=100) ===');
  // PPT JP est pagine a 100 (contrairement a l'EN). Pagination obligatoire.
  let allSets = [], offset = 0;
  while (true) {
    const r = await fetch(`https://www.pokemonpricetracker.com/api/v2/sets?language=japanese&limit=100&offset=${offset}`, {
      headers: { Authorization: 'Bearer ' + KEY }
    });
    const j = await r.json();
    allSets.push(...(j.data || []));
    if (!j.metadata?.hasMore) break;
    offset += 100;
    if (offset > 500) break;
  }
  console.log('Total sets JP PPT:', allSets.length);

  // Released = cardCount>0 (on INCLUT les sets sans releaseDate, contrairement a l'EN:
  // 11 sets JP promos/decks n'ont pas de date mais ont des cartes a sync)
  const released = allSets.filter(s => (s.cardCount || 0) > 0);
  console.log('Sets JP avec cartes (a sync):', released.length);

  // Sets deja completes en JP
  const completed = await sql`
    SELECT DISTINCT set_name FROM graded_prices_ppt WHERE language='japanese';
  `;
  const completedSets = completed.map(r => r.set_name);

  const releasedNames = released.map(s => s.name);
  const pending = releasedNames.filter(s => !completedSets.includes(s));
  const completedRelevant = completedSets.filter(s => releasedNames.includes(s));

  console.log('JP deja OK:', completedRelevant.length);
  console.log('JP pending:', pending.length);

  const remainingCards = released
    .filter(s => pending.includes(s.name))
    .reduce((sum, s) => sum + (s.cardCount || 0), 0);
  const estimatedCredits = remainingCards * 2;
  console.log('Cartes restantes (estim cardCount, surestime ~2x):', remainingCards);
  console.log('Credits budget estime (haut):', estimatedCredits);

  const JOB_GRADED = 'graded_ppt_jp_full';
  await sql`
    INSERT INTO sync_progress (
      job_id, job_type, status,
      items_total, items_done, items_skipped, items_failed,
      items_pending, items_completed, items_errors,
      credits_budget,
      metadata,
      notes
    ) VALUES (
      ${JOB_GRADED}, 'graded_ppt_jp', 'pending',
      ${released.length},
      ${completedRelevant.length},
      0, 0,
      ${JSON.stringify(pending)}::jsonb,
      ${JSON.stringify(completedRelevant)}::jsonb,
      '[]'::jsonb,
      ${estimatedCredits},
      ${JSON.stringify({
        source: 'PPT v2',
        language: 'japanese',
        api_endpoint: '/v2/cards?set=<name>&fetchAllInSet=true&includeEbay=true&includeHistory=true&days=180&language=japanese',
        cr_per_card: 2,
        ppt_sets_total: allSets.length,
        ppt_sets_released: released.length,
        note: 'cardCount PPT surestime ~2x (variantes), volume reel ~moitie',
        remaining_cards_estimate: remainingCards,
      })}::jsonb,
      'Couverture prix gradels JP. Match drawer via set_name direct (tcg_sets JP.name = set_name).'
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
  console.log('\n=== Job graded_ppt_jp_full initialise ===');
  const r1 = await sql`SELECT status, items_total, items_done, jsonb_array_length(items_pending) AS pending, credits_budget FROM sync_progress WHERE job_id=${JOB_GRADED};`;
  console.log(r1[0]);

  console.log('\n=== Prochains 10 sets JP a sync ===');
  pending.slice(0, 10).forEach((s, i) => console.log(`  ${i+1}. ${s}`));
})();
