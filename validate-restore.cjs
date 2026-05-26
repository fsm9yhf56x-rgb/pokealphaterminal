const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.restore-test' });

if (!process.env.DATABASE_URL_RESTORE || process.env.DATABASE_URL_RESTORE.includes('PASTE_') || process.env.DATABASE_URL_RESTORE.includes('REMPLACE_')) {
  console.error('ERROR: .env.restore-test ne contient pas la vraie URL');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL_RESTORE });

(async () => {
  try {
    console.log('=== Test connexion branche restore ===');
    const meta = await pool.query('SELECT current_database(), current_user, current_timestamp');
    console.log('  Database  : ' + meta.rows[0].current_database);
    console.log('  User      : ' + meta.rows[0].current_user);
    console.log('  Timestamp : ' + meta.rows[0].current_timestamp);

    console.log('');
    console.log('=== Comptage tables branche restore ===');

    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name"
    );

    let totalRows = 0;
    for (const t of tables.rows) {
      const cnt = await pool.query('SELECT COUNT(*) FROM "' + t.table_name + '"');
      const rowCount = parseInt(cnt.rows[0].count);
      totalRows += rowCount;
      console.log('  ' + t.table_name.padEnd(40) + ' : ' + rowCount.toLocaleString() + ' rows');
    }

    console.log('');
    console.log('=== Resultat ===');
    console.log('  Tables   : ' + tables.rows.length);
    console.log('  Rows tot : ' + totalRows.toLocaleString());
    console.log('');
    console.log('Baseline prod : 25 tables / 587,534 rows');

    if (tables.rows.length === 25 && totalRows === 587534) {
      console.log('OK RESTORE PARFAITEMENT VALIDE : 100% match');
    } else if (tables.rows.length === 25 && Math.abs(totalRows - 587534) < 1000) {
      console.log('OK RESTORE VALIDE : ' + (totalRows - 587534) + ' rows de diff (normal, tables actives)');
    } else {
      const tableDiff = tables.rows.length - 25;
      const rowDiff = totalRows - 587534;
      console.log('WARNING : differences importantes');
      console.log('  Tables diff : ' + (tableDiff >= 0 ? '+' : '') + tableDiff);
      console.log('  Rows diff   : ' + (rowDiff >= 0 ? '+' : '') + rowDiff.toLocaleString());
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
})();
