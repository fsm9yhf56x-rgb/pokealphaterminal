// scripts/backfill-grade-fields.mjs
// Repare les cartes gradees dont grade_company / grade_value sont NULL alors que
// la note est enfouie dans `condition` (ex "PSA 10", "CCC 9.5"). Cause : l'ajout
// "Par Serie" (Holdings.tsx) ecrivait tout dans condition.
// Parse condition -> (company, value), remplit les colonnes dediees.
// DRY-RUN par defaut. --commit pour ecrire.
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.DATABASE_URL);
const COMMIT = process.argv.includes('--commit');

const GRADERS = ['PSA','BGS','CGC','SGC','ACE','TAG','CCC','PCA','AOG','GSG','PGS'];
const RE = new RegExp(`^\\s*(${GRADERS.join('|')})\\s*[_ ]?\\s*([0-9]{1,2}(?:\\.5)?)\\b`, 'i');

// Cartes candidates : gradees (ou condition prefixee societe) SANS grade_value.
const rows = await sql`
  SELECT id, condition, grade_company, grade_value, graded
  FROM portfolio_cards
  WHERE (graded = true OR condition ~* '^(PSA|BGS|CGC|SGC|ACE|TAG|CCC|PCA|AOG|GSG|PGS)[ _]?[0-9]')
    AND (grade_value IS NULL OR grade_company IS NULL)`;

console.log(`=== Backfill grade fields (${COMMIT ? 'COMMIT' : 'DRY-RUN'}) ===`);
console.log(`Cartes candidates (grade_value ou grade_company NULL) : ${rows.length}`);

let ok = 0, skip = 0;
const plan = [];
for (const r of rows) {
  const m = (r.condition || '').match(RE);
  if (!m) { skip++; continue; }
  const company = m[1].toUpperCase();
  const value = m[2]; // garde "9.5" tel quel (string), coherent avec le format tier
  plan.push({ id: r.id, company, value, from: r.condition });
  ok++;
}

console.log(`Parsables : ${ok} | non-parsables (condition sans note claire) : ${skip}`);
console.log('');
console.log('Apercu (max 30) :');
for (const p of plan.slice(0, 30)) {
  console.log(`  "${(p.from||'').padEnd(12)}" -> company=${p.company.padEnd(4)} value=${p.value}`);
}

if (COMMIT) {
  let done = 0;
  for (const p of plan) {
    await sql`
      UPDATE portfolio_cards
      SET grade_company = ${p.company},
          grade_value = ${p.value},
          graded = true,
          updated_at = now()
      WHERE id = ${p.id}`;
    done++;
  }
  console.log('');
  console.log(`grade fields remplis : ${done} cartes mises a jour.`);
} else {
  console.log('');
  console.log('(DRY-RUN -- rien ecrit. Verifie, puis --commit.)');
}
