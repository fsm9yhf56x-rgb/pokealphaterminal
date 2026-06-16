require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sep = (s) => console.log(`\n${'═'.repeat(60)}\n${s}\n${'═'.repeat(60)}`);

async function tableExists(name) {
  const { count, error } = await supa.from(name).select('*', { count: 'exact', head: true });
  return { exists: !error, count: count ?? 0, error: error?.message };
}

async function firstRowCols(name) {
  const { data, error } = await supa.from(name).select('*').limit(1);
  if (error || !data?.length) return null;
  return data[0];
}

(async () => {
  sep('📋 TABLES CONNUES');
  const known = [
    'profiles',
    'portfolio_cards',
    'tcg_sets',
    'tcg_cards',
    '_deprecated_prices',
    'card_prices',
    'wishlist',
    'badges',
    'sync_logs',
    'sets',
    'cards',
  ];
  const tableStatus = {};
  for (const t of known) {
    const res = await tableExists(t);
    tableStatus[t] = res;
    if (res.exists) console.log(`  ✅ ${t.padEnd(22)} ${res.count} rows`);
    else console.log(`  ❌ ${t.padEnd(22)} (n'existe pas)`);
  }

  // tcg_cards
  if (tableStatus.tcg_cards?.exists) {
    sep('🃏 tcg_cards — COLONNES (via échantillon)');
    const sample = await firstRowCols('tcg_cards');
    if (sample) {
      Object.entries(sample).forEach(([k, v]) => {
        const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
        const s = v === null ? '∅' : typeof v === 'string' ? `"${v.slice(0, 60)}${v.length > 60 ? '...' : ''}"` : JSON.stringify(v).slice(0, 70);
        console.log(`  ${k.padEnd(22)} ${type.padEnd(10)} ${s}`);
      });
    }

    sep('🃏 tcg_cards — DISTRIBUTION LANGUES');
    for (const lang of ['en', 'fr', 'jp']) {
      const { count } = await supa.from('tcg_cards').select('*', { count: 'exact', head: true }).ilike('id', `${lang}-%`);
      console.log(`  ${lang}: ${count}`);
    }

    sep('🃏 tcg_cards — ÉCHANTILLONS IDs');
    for (const lang of ['en', 'fr', 'jp']) {
      const { data } = await supa.from('tcg_cards').select('id, image_url').ilike('id', `${lang}-%`).limit(3);
      console.log(`\n  ${lang}:`);
      data?.forEach((r) => console.log(`    ${r.id.padEnd(28)} → ${r.image_url?.slice(0, 80) || '∅'}`));
    }
  }

  // tcg_sets
  if (tableStatus.tcg_sets?.exists) {
    sep('📦 tcg_sets — COLONNES + ÉCHANTILLON');
    const sample = await firstRowCols('tcg_sets');
    if (sample) {
      Object.entries(sample).forEach(([k, v]) => {
        const type = v === null ? 'null' : typeof v;
        const s = v === null ? '∅' : typeof v === 'string' ? `"${v.slice(0, 60)}"` : JSON.stringify(v).slice(0, 70);
        console.log(`  ${k.padEnd(22)} ${type.padEnd(10)} ${s}`);
      });
    }
    const { data: threeSets } = await supa.from('tcg_sets').select('*').limit(3);
    console.log('\n  3 premiers sets:');
    threeSets?.forEach((s) => console.log(`    ${JSON.stringify(s).slice(0, 150)}`));
  }

  // portfolio_cards
  if (tableStatus.portfolio_cards?.exists) {
    sep('👤 portfolio_cards — COLONNES');
    const sample = await firstRowCols('portfolio_cards');
    if (sample) {
      Object.entries(sample).forEach(([k, v]) => {
        const type = v === null ? 'null' : typeof v;
        const s = v === null ? '∅' : typeof v === 'string' ? `"${v.slice(0, 60)}"` : JSON.stringify(v).slice(0, 70);
        console.log(`  ${k.padEnd(22)} ${type.padEnd(10)} ${s}`);
      });
    }
  }

  // prices
  for (const t of ['_deprecated_prices', 'card_prices']) {
    if (tableStatus[t]?.exists && tableStatus[t].count > 0) {
      sep(`💰 ${t} — COLONNES + ÉCHANTILLON`);
      const sample = await firstRowCols(t);
      if (sample) {
        Object.entries(sample).forEach(([k, v]) => {
          const type = v === null ? 'null' : typeof v;
          const s = v === null ? '∅' : typeof v === 'string' ? `"${v.slice(0, 60)}"` : JSON.stringify(v).slice(0, 70);
          console.log(`  ${k.padEnd(22)} ${type.padEnd(10)} ${s}`);
        });
      }
    }
  }

  // distribution image_url
  if (tableStatus.tcg_cards?.exists) {
    sep('🃏 tcg_cards — image_url HOSTS');
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
    Object.entries(hosts).sort((a,b)=>b[1]-a[1]).forEach(([h,c]) => console.log(`  ${c.toString().padStart(7)} ${h}`));
  }

  sep('✅ AUDIT TERMINÉ');
})().catch((e) => { console.error(e); process.exit(1); });
