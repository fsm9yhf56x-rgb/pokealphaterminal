import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

// Abonnements aux sorties a venir. 1 utilisateur + 1 set = 1 ligne.
// Le set est identifie par son 'code' upcoming_sets (ex '30th', 'ME6').
// A la sortie, le generateur setReleaseAlerts cree une notif par abonne.
await sql`
  CREATE TABLE IF NOT EXISTS set_alerts (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    text NOT NULL,
    set_code   text NOT NULL,
    set_name   text,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, set_code)
  )
`
await sql`CREATE INDEX IF NOT EXISTS set_alerts_user_idx ON set_alerts (user_id)`
await sql`CREATE INDEX IF NOT EXISTS set_alerts_code_idx ON set_alerts (set_code)`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='set_alerts' ORDER BY ordinal_position`
console.log('set_alerts :', cols.map(c => c.column_name).join(', '))
