// k_sets.hidden : la liste des sets ecartes vit en BASE, pas dupliquee dans
// chaque script. 10 crons lisent k_sets, d'autres partent directement de
// k_cards : une liste recopiee dans chacun aurait diverge des le premier oubli.
//
// Les Galeries de Dresseurs sont des DOUBLONS INTEGRAUX : chaque serie mere
// contient deja ses cartes TG/GG (swsh10 = 246 cartes, de 001 a TG30) et le set
// galerie les repete. Leurs print_id sont DISTINCTS et ne portent AUCUNE cote
// (swsh10-TG22 = 23 lignes de price_matrix, swsh10.5tg-TG22 = 0) : un cron qui
// les balaie brule du quota pour alimenter un catalogue mort.
//   --check  : etat actuel      --commit : applique
import { neon } from '@neondatabase/serverless';
const COMMIT = process.argv.includes('--commit');
const sql = neon(process.env.DATABASE_URL);

const CACHES = [
  ['swsh9.5tg',  'doublon : TG01-TG30 deja dans swsh9'],
  ['swsh10.5tg', 'doublon : TG01-TG30 deja dans swsh10 (id trompeur, pointe swsh10.5)'],
  ['swsh12.5tg', 'doublon : TG01-TG30 deja dans swsh12'],
  ['swsh12.5gg', 'doublon : GG01-GG70 deja dans swsh12.5'],
  ['swsh11.5tg', 'doublon : TG01-TG30 deja dans swsh11'],
  ['mee', 'energies de base : aucune image, aucun interet de collection'],
  ['sve', 'energies de base : aucune image, aucun interet de collection'],
  ['xya', '6 cartes sans cote, 2 avec la mauvaise image, nom mal traduit'],
];

const cols = await sql`SELECT column_name FROM information_schema.columns
                        WHERE table_name='k_sets' AND column_name IN ('hidden','hidden_reason')`;
const has = (c) => cols.some((x) => x.column_name === c);
console.log('k_sets.hidden        : ' + (has('hidden') ? '[x]' : '[ ] absente'));
console.log('k_sets.hidden_reason : ' + (has('hidden_reason') ? '[x]' : '[ ] absente'));

// Verification : un set masque ne doit PAS porter de cartes absentes de sa mere.
for (const [id] of CACHES.filter(([i]) => i.includes('tg') || i.includes('gg'))) {
  const r = await sql.query(
    `SELECT count(*)::int AS orphelines
       FROM k_prints p
      WHERE p.set_id = $1
        AND NOT EXISTS (SELECT 1 FROM k_prints m
                         WHERE m.set_id <> $1 AND m.number = p.number)`, [id]);
  const n = r[0]?.orphelines ?? 0;
  console.log('  ' + id.padEnd(14) + (n === 0 ? 'OK, aucune carte unique' : '!! ' + n + ' cartes UNIQUES — ne pas masquer'));
  if (n > 0) { console.error('ARRET : masquer ' + id + ' ferait disparaitre des cartes.'); process.exit(1); }
}

if (!COMMIT) { console.log('\nDRY-RUN. Relancer avec --commit.'); process.exit(0); }

await sql.query(`ALTER TABLE k_sets ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false`);
await sql.query(`ALTER TABLE k_sets ADD COLUMN IF NOT EXISTS hidden_reason text`);
for (const [id, why] of CACHES) {
  await sql.query(`UPDATE k_sets SET hidden = true, hidden_reason = $2 WHERE id = $1`, [id, why]);
}
const out = await sql`SELECT id, name_fr, hidden_reason FROM k_sets WHERE hidden ORDER BY id`;
console.log('\n' + out.length + ' sets masques :');
for (const r of out) console.log('  ' + r.id.padEnd(14) + (r.name_fr || '').padEnd(46) + r.hidden_reason);
