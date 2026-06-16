require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // 1. Compte total
  const { count: total } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true });
  console.log(`Total cartes en DB: ${total}`);

  // 2. Par langue (prefix)
  for (const lang of ['en', 'fr', 'jp']) {
    const { count } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).ilike('id', `${lang}-%`);
    console.log(`  ${lang}: ${count}`);
  }

  // 3. Distribution des hosts dans image_url
  const hosts = {};
  let from = 0, batch = 5000;
  while (true) {
    const { data } = await supa.from('tcg_cards').select('image_url').range(from, from + batch - 1);
    if (!data?.length) break;
    for (const r of data) {
      if (!r.image_url) { hosts['(null)'] = (hosts['(null)']||0)+1; continue; }
      const h = r.image_url.split('/')[2] || '(invalid)';
      hosts[h] = (hosts[h]||0)+1;
    }
    if (data.length < batch) break;
    from += batch;
  }
  console.log('\nHosts dans image_url:');
  Object.entries(hosts).sort((a,b)=>b[1]-a[1]).forEach(([h,c]) => console.log(`  ${c.toString().padStart(6)} ${h}`));

  // 4. Regarde 5 IDs contenant 'me' (pour comprendre si me03 est là sous un autre format)
  const { data: meSamples } = await supa.from('tcg_cards').select('id, image_url').ilike('id', '%me%').limit(10);
  console.log('\nÉchantillon IDs contenant "me":');
  meSamples?.forEach(r => console.log(`  ${r.id.padEnd(25)} → ${r.image_url?.slice(0,80)}`));
})();
