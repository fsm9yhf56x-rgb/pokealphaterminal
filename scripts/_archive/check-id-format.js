require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Cherche des IDs contenant 'bw' en EN
  const { data: bw } = await supa.from('tcg_cards').select('id, set_id, local_id').ilike('id', 'en-%bw%').limit(10);
  console.log('\n🔍 IDs "en-*bw*":');
  bw?.forEach(r => console.log(`   ${r.id.padEnd(30)} set_id=${r.set_id}  local_id=${r.local_id}`));

  // Un échantillon de 10 IDs EN
  const { data: sample } = await supa.from('tcg_cards').select('id, set_id, local_id').ilike('id', 'en-%').limit(10);
  console.log('\n🔍 Échantillon EN:');
  sample?.forEach(r => console.log(`   ${r.id.padEnd(30)} set_id=${r.set_id}  local_id=${r.local_id}`));

  // Tous les set_id uniques EN
  const { data: allSets } = await supa.from('tcg_cards').select('set_id').ilike('id', 'en-%').limit(5000);
  const uniqueSets = [...new Set(allSets?.map(r => r.set_id).filter(Boolean))];
  console.log(`\n📦 ${uniqueSets.length} set_id uniques en EN`);
  console.log('   Exemples:', uniqueSets.slice(0, 15).join(', '));
})();
