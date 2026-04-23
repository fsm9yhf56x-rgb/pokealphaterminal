require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // Combien de cartes ont set_id NULL ?
  const { count: nullSet } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).is('set_id', null);
  const { count: total } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true });
  console.log(`Total cartes: ${total}`);
  console.log(`set_id NULL: ${nullSet}`);
  console.log(`set_id rempli: ${total - nullSet}`);

  // Par langue
  for (const lang of ['en', 'fr', 'jp']) {
    const { count: langTotal } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).ilike('id', `${lang}-%`);
    const { count: langNull } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).ilike('id', `${lang}-%`).is('set_id', null);
    console.log(`  ${lang}: total=${langTotal}  set_id NULL=${langNull}`);
  }

  // Échantillon id EN avec set_id NULL
  const { data: nullSamples } = await supa.from('tcg_cards').select('id, set_id, local_id').ilike('id', 'en-%').is('set_id', null).limit(5);
  console.log('\n🔍 IDs EN avec set_id NULL:');
  nullSamples?.forEach(r => console.log(`   ${r.id}  set_id=${r.set_id}  local_id=${r.local_id}`));
})();
