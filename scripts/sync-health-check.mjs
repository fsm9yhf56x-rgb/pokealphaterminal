// scripts/sync-health-check.mjs
// Controle de fraicheur du pipeline, EN DIRECT sur la base. Sort en code 1 si
// quelque chose est perime -> le workflow devient rouge et GitHub previent.
//
//   node scripts/sync-health-check.mjs            -> rapport + code de sortie
//   node scripts/sync-health-check.mjs --report   -> rapport seul, jamais d'echec
//
// POURQUOI CE SCRIPT ALORS QUE /api/admin/sync-health EXISTE
//   La route est correcte : elle surveille bien price_signals.computed_at avec un
//   seuil de 30h. Mais PERSONNE NE L'APPELLE — c'est une page admin qu'il faut
//   ouvrir a la main. Le 30/07, price_signals etait fige depuis 51 heures et
//   aucune alerte n'est partie : les cotes de toutes les cartes affichaient des
//   prix d'avant-hier, sans qu'aucun signe ne l'indique.
//
//   Une garde qui depend de quelqu'un qui pense a regarder n'est pas une garde.
//   Meme raisonnement que pour la suppression de prix : on retire la dependance
//   a la vigilance humaine, on ne se contente pas de la recommander.
//
// Branche en fin de kodo-consolidate : si les donnees sont vieilles, le job passe
// au rouge et la notification GitHub arrive sans qu'on ait rien a configurer.

import { neon } from '@neondatabase/serverless';

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('Manque DATABASE_URL'); process.exit(1); }
const sql = neon(DB_URL);

const REPORT_ONLY = process.argv.includes('--report');

// Fraicheur par table. La colonne compte : `as_of` dit l'age de la donnee CHEZ LA
// SOURCE, `updated_at` / `computed_at` disent quand NOUS avons ecrit. Pour juger
// l'activite du pipeline, seule la seconde famille vaut (lecon du 17/07).
const FRAICHEUR = [
  { nom: 'cotes cartes',        table: 'price_signals',   col: 'computed_at',     seuilH: 30,      note: 'kodo-consolidate' },
  { nom: 'matrice prix',        table: 'price_matrix',    col: 'updated_at',      seuilH: 30,      note: 'ingests nocturnes' },
  { nom: 'historique prix',     table: 'price_history',   col: 'day',             seuilH: 30,      note: 'snapshot kodo-consolidate' },
  { nom: 'catalogue',           table: 'tcg_sets',        col: 'updated_at',      seuilH: 8 * 24,  note: 'sync-catalog lundi' },
  { nom: 'graded PPT',          table: 'graded_prices_ppt', col: 'fetched_at',    seuilH: 8 * 24,  note: 'rotation par lots' },
  { nom: 'scelle (cotes)',      table: 'sealed_prices',   col: 'last_priced_at',  seuilH: 30,      note: 'kodo-sealed 07:30' },
  { nom: 'scelle (journal)',    table: 'sealed_asks_raw', col: 'last_seen_at',    seuilH: 30,      note: 'journal des annonces' },
];

const CURSEURS = [
  { jobId: 'kodo_ingest_prices_v1', seuilH: 30, note: 'ingest prix EN/JP' },
  { jobId: 'kodo_ingest_eu_fr',     seuilH: 30, note: 'ingest prix FR' },
];

// La taille de la base n'est surveillee par personne. Le 30/07 elle etait a
// 4,3 Go — decouvert par hasard — pour un plan qui en inclut 10 et une limite de
// depense a 15 $/mois. Un depassement se paie, il ne previent pas.
const TAILLE_ALERTE_MB = 7000;

const anomalies = [];
console.log('=== FRAICHEUR DES DONNEES ===');

for (const c of FRAICHEUR) {
  try {
    const r = await sql.query(
      `SELECT round(EXTRACT(EPOCH FROM (now() - max("${c.col}")))/3600, 1) AS age FROM "${c.table}"`
    );
    const age = r[0]?.age == null ? null : Number(r[0].age);
    const perime = age == null || age > c.seuilH;
    if (perime) anomalies.push(c.nom + ' : ' + (age == null ? 'aucune donnee' : age + 'h > ' + c.seuilH + 'h'));
    console.log('  ' + (perime ? '[!]' : '[ok]').padEnd(5) + c.nom.padEnd(22)
      + (age == null ? 'vide' : 'il y a ' + age + 'h').padEnd(16) + 'seuil ' + c.seuilH + 'h · ' + c.note);
  } catch (e) {
    anomalies.push(c.nom + ' : ' + e.message.slice(0, 60));
    console.log('  [!]  ' + c.nom.padEnd(22) + 'ERREUR ' + e.message.slice(0, 50));
  }
}

console.log('\n=== CURSEURS D INGESTION ===');
for (const c of CURSEURS) {
  try {
    const r = await sql.query(
      `SELECT status, round(EXTRACT(EPOCH FROM (now() - last_run_at))/3600, 1) AS age
         FROM kodo_sync_state WHERE job_id = $1 LIMIT 1`, [c.jobId]
    );
    if (!r.length) {
      anomalies.push(c.jobId + ' : curseur introuvable');
      console.log('  [!]  ' + c.jobId.padEnd(26) + 'introuvable');
      continue;
    }
    const age = r[0].age == null ? null : Number(r[0].age);
    const perime = age == null || age > c.seuilH;
    if (perime) anomalies.push(c.jobId + ' : ' + (age == null ? 'jamais' : age + 'h > ' + c.seuilH + 'h'));
    console.log('  ' + (perime ? '[!]' : '[ok]').padEnd(5) + c.jobId.padEnd(26)
      + (age == null ? 'jamais' : 'il y a ' + age + 'h').padEnd(16) + String(r[0].status || '?'));
  } catch (e) {
    anomalies.push(c.jobId + ' : ' + e.message.slice(0, 60));
    console.log('  [!]  ' + c.jobId.padEnd(26) + 'ERREUR');
  }
}

console.log('\n=== VOLUMETRIE ===');
try {
  const t = await sql.query(
    `SELECT round(pg_database_size(current_database()) / 1024.0 / 1024.0) AS mb`
  );
  const mb = Number(t[0].mb);
  const trop = mb > TAILLE_ALERTE_MB;
  if (trop) anomalies.push('base a ' + mb + ' Mo (alerte au-dela de ' + TAILLE_ALERTE_MB + ')');
  console.log('  ' + (trop ? '[!]' : '[ok]').padEnd(5) + 'taille base'.padEnd(22) + mb + ' Mo · alerte a ' + TAILLE_ALERTE_MB + ' Mo');

  const top = await sql.query(
    `SELECT c.relname AS nom, round(pg_total_relation_size(c.oid) / 1024.0 / 1024.0) AS mb
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
      ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 3`
  );
  for (const x of top) console.log('         ' + String(x.nom).padEnd(24) + x.mb + ' Mo');
} catch (e) {
  console.log('  [!]  volumetrie illisible : ' + e.message.slice(0, 50));
}

console.log('\n' + '='.repeat(40));
if (!anomalies.length) {
  console.log('Pipeline sain : tout est frais.');
  process.exit(0);
}
console.log(anomalies.length + ' ANOMALIE(S) :');
for (const a of anomalies) console.log('  - ' + a);
if (REPORT_ONLY) {
  console.log('\n(--report : on ne fait pas echouer le job)');
  process.exit(0);
}
// Code 1 -> le job GitHub passe au rouge -> notification automatique.
process.exit(1);
