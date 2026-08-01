// Les vues d'export heritent de k_sets.hidden. C'est ce qui fait que la regle
// vit a UN endroit : l'Index, le picker d'ajout, le static et les crons lisent
// tous la meme verite, au lieu d'une liste recopiee dans chaque consommateur.
import { neon } from '@neondatabase/serverless';
const COMMIT = process.argv.includes('--commit');
const sql = neon(process.env.DATABASE_URL);

const avant = await sql`SELECT count(*)::int AS n FROM k_sets_export`;
const avantC = await sql`SELECT count(*)::int AS n FROM k_cards_export`;
console.log('avant : ' + avant[0].n + ' sets, ' + avantC[0].n + ' cartes');

if (!COMMIT) { console.log('DRY-RUN. Relancer avec --commit.'); process.exit(0); }

await sql.query(`CREATE OR REPLACE VIEW k_sets_export AS
  SELECT (l.lang || '-') || ks.id AS id,
         CASE l.lang WHEN 'fr' THEN COALESCE(ks.name_fr, ks.name)
                     WHEN 'jp' THEN COALESCE(ks.name_jp, ks.name)
                     ELSE ks.name END AS name,
         ks.logo_url, ks.series, ks.release_date, ks.total_cards, ks.source,
         upper(l.lang) AS lang
    FROM k_sets ks CROSS JOIN LATERAL unnest(ks.langs) l(lang)
   WHERE NOT ks.hidden`);

await sql.query(`CREATE OR REPLACE VIEW k_cards_export AS
  SELECT kc.id, (kc.lang || '-') || kp.set_id AS set_id, kp.number AS local_id,
         kc.name_localized AS name, kc.rarity, kc.rarity_normalized,
         kc.image_url, kc.has_image, kc.source, upper(kc.lang) AS lang
    FROM k_cards kc
    JOIN k_prints kp ON kp.id = kc.print_id
    JOIN k_sets ks ON ks.id = kp.set_id
   WHERE NOT ks.hidden`);

const apres = await sql`SELECT count(*)::int AS n FROM k_sets_export`;
const apresC = await sql`SELECT count(*)::int AS n FROM k_cards_export`;
console.log('apres : ' + apres[0].n + ' sets (-' + (avant[0].n - apres[0].n) + '), '
  + apresC[0].n + ' cartes (-' + (avantC[0].n - apresC[0].n) + ')');
