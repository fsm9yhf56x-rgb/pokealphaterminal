import { neon } from '@neondatabase/serverless'
const sql = neon(process.env.DATABASE_URL)

// Calendrier des sorties A VENIR, multilingue.
// Aucune API ne liste les sets futurs en FR+JP : TCGdex n'ajoute qu'a
// l'approche, PPT est EN-only. Bulbapedia (API MediaWiki, wikitext structure,
// licence CC) couvre EN + JP en avance ET fournit les logos. Cette table est la
// source de verite maitrisee : le sync la remplit, mais une valeur saisie a la
// main n'est jamais ecrasee (source='manual' protege).
//
// Cle = code Bulbapedia (ex '30th', 'ME6') : stable, un set = une ligne, les 3
// langues sur la meme ligne. release_date_* peut differer par langue (le JP
// sort souvent avant l'EN). name_fr souvent NULL au depart (Bulbapedia EN/JP) ->
// se remplit quand TCGdex publie la version FR, ou a la main.
await sql`
  CREATE TABLE IF NOT EXISTS upcoming_sets (
    code             text PRIMARY KEY,
    name_en          text,
    name_fr          text,
    name_jp          text,
    release_date_en  date,
    release_date_fr  date,
    release_date_jp  date,
    logo_url         text,
    series           text,
    source           text NOT NULL DEFAULT 'bulbapedia',
    updated_at       timestamptz NOT NULL DEFAULT now()
  )
`
await sql`CREATE INDEX IF NOT EXISTS upcoming_sets_dates_idx ON upcoming_sets (release_date_en, release_date_jp)`

const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name='upcoming_sets' ORDER BY ordinal_position`
console.log('upcoming_sets :', cols.map(c => c.column_name).join(', '))
const n = await sql`SELECT count(*)::int AS n FROM upcoming_sets`
console.log('lignes :', n[0].n)
