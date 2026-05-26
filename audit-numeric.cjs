const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    const result = await pool.query(`
      SELECT
        table_name,
        column_name,
        data_type,
        numeric_precision,
        numeric_scale,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type IN ('numeric', 'decimal', 'double precision', 'real')
      ORDER BY table_name, ordinal_position
    `);

    console.log('=== Colonnes NUMERIC/DECIMAL en prod ===');
    console.log('');
    let currentTable = '';
    let total = 0;
    for (const r of result.rows) {
      if (r.table_name !== currentTable) {
        currentTable = r.table_name;
        console.log('## ' + currentTable);
      }
      const nullable = r.is_nullable === 'YES' ? ' (nullable)' : '';
      const precision = r.numeric_precision ? '(' + r.numeric_precision + ',' + r.numeric_scale + ')' : '';
      console.log('  ' + r.column_name.padEnd(30) + ' : ' + r.data_type + precision + nullable);
      total++;
    }
    console.log('');
    console.log('=== TOTAL ===');
    console.log('  ' + total + ' colonnes numeric/decimal a surveiller');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    pool.end();
  }
})();
