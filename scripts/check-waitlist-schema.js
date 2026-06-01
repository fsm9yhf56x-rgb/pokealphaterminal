require('dotenv').config({ path: '.env.production.local' });
const { neon } = require('@neondatabase/serverless');
(async () => {
  const sql = neon(process.env.DATABASE_URL);
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name='waitlist_jp'
    ORDER BY ordinal_position;
  `;
  console.log('=== waitlist_jp ===');
  cols.forEach(c => console.log(c.column_name.padEnd(20) + '| ' + c.data_type + ' | nullable=' + c.is_nullable));

  const n = await sql`SELECT COUNT(*) as n FROM waitlist_jp;`;
  console.log('Rows actuels:', n[0].n);
})();
