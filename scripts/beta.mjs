/**
 * Administration de la bêta fermée.
 *
 * USAGE (depuis la racine du repo) :
 *   export DBURL=$(grep -m1 '^DATABASE_URL' .env.production.local | sed -E 's/^DATABASE_URL=//; s/^"//; s/"$//')
 *
 *   DATABASE_URL=$DBURL node scripts/beta.mjs init
 *   DATABASE_URL=$DBURL node scripts/beta.mjs invite a@x.fr b@y.fr
 *   DATABASE_URL=$DBURL node scripts/beta.mjs invite --tier pro c@z.fr
 *   DATABASE_URL=$DBURL node scripts/beta.mjs list
 *   DATABASE_URL=$DBURL node scripts/beta.mjs revoke a@x.fr
 *   DATABASE_URL=$DBURL node scripts/beta.mjs probe
 *   DATABASE_URL=$DBURL node scripts/beta.mjs drop --yes
 *
 * `probe` = la sonde d'union du quota PokeTrace (cartes distinctes / user).
 * C'est le livrable data de la bêta : elle remplace mes estimations par la
 * vraie pente. À relever à 50, 200, 500 users.
 */

import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);
const [cmd, ...rest] = process.argv.slice(2);

const flag = (name) => {
  const i = rest.indexOf(name);
  return i === -1 ? null : rest[i + 1];
};
const args = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--tier');

const norm = (e) => String(e).trim().toLowerCase();
// Table qui donne du Premium : on n'y insere QUE des emails plausibles.
// Sans ce garde, un argument parasite (typiquement un commentaire zsh avale)
// devient une invitation silencieuse.
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

async function init() {
  await sql`
    CREATE TABLE IF NOT EXISTS beta_invites (
      email      text PRIMARY KEY,
      tier       text NOT NULL DEFAULT 'premium',
      note       text,
      invited_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  // Garde-fou : la table ne doit accepter que des plans connus, et jamais
  // un email non normalisé (sinon le LEFT JOIN sur lower(email) rate en
  // silence -> le testeur reste Free sans comprendre pourquoi).
  await sql`
    ALTER TABLE beta_invites
    DROP CONSTRAINT IF EXISTS beta_invites_tier_chk
  `;
  await sql`
    ALTER TABLE beta_invites
    ADD CONSTRAINT beta_invites_tier_chk CHECK (tier IN ('pro', 'premium'))
  `;
  await sql`
    ALTER TABLE beta_invites
    DROP CONSTRAINT IF EXISTS beta_invites_email_lower_chk
  `;
  await sql`
    ALTER TABLE beta_invites
    ADD CONSTRAINT beta_invites_email_lower_chk CHECK (email = lower(email))
  `;
  console.log('OK  table beta_invites prete (+ contraintes tier / email lower)');
}

async function invite() {
  const tier = flag('--tier') || 'premium';
  if (!['pro', 'premium'].includes(tier)) throw new Error(`tier invalide: ${tier}`);
  if (args.length === 0) throw new Error('aucun email fourni');

  const emails = args.map(norm);
  const bad = emails.filter((e) => !isEmail(e));
  if (bad.length) throw new Error(`pas des emails: ${bad.join(' ')} — rien insere`);
  const rows = await sql`
    INSERT INTO beta_invites (email, tier)
    SELECT unnest(${emails}::text[]), ${tier}
    ON CONFLICT (email) DO UPDATE SET tier = EXCLUDED.tier
    RETURNING email, tier
  `;
  for (const r of rows) console.log(`OK  ${r.email} -> ${r.tier}`);
  console.log(`\n${rows.length} invitation(s). Effet immediat, aucun compte requis.`);
}

async function list() {
  // L'invite peut precederle compte : LEFT JOIN, jamais INNER.
  const rows = await sql`
    SELECT bi.email, bi.tier, bi.invited_at, u.id IS NOT NULL AS inscrit
    FROM beta_invites bi
    LEFT JOIN "user" u ON lower(u.email) = bi.email
    ORDER BY bi.invited_at DESC
  `;
  if (rows.length === 0) return console.log('(aucune invitation)');
  for (const r of rows) {
    const s = r.inscrit ? 'inscrit ' : 'attendu ';
    console.log(`${s} ${r.tier.padEnd(7)} ${r.email}`);
  }
  const n = rows.filter((r) => r.inscrit).length;
  console.log(`\n${rows.length} invitation(s), ${n} inscrit(s).`);
}

async function revoke() {
  if (args.length === 0) throw new Error('aucun email fourni');
  const rows = await sql`
    DELETE FROM beta_invites WHERE email = ANY(${args.map(norm)}::text[])
    RETURNING email
  `;
  for (const r of rows) console.log(`OK  revoque ${r.email}`);
  console.log('\nEffet immediat au prochain SELECT profil (aucun cache).');
}

async function probe() {
  const [u] = await sql`SELECT COUNT(*)::int AS n FROM "user"`;
  const [p] = await sql`
    SELECT COUNT(DISTINCT k_card_id)::int AS cartes,
           COUNT(DISTINCT user_id)::int   AS users,
           COUNT(*)::int                  AS lignes
    FROM portfolio_cards
  `;
  // Ce qui coute vraiment au quota PokeTrace : une carte DISTINCTE, detenue,
  // non-commune, et de langue en-/fr-. Le JP passe par PPT (source_refs ne
  // contient aucune carte jp-*) donc il est gratuit ici.
  const rows = await sql`
    SELECT CASE
             WHEN pc.k_card_id IS NULL THEN 'sans_k_card_id (hors pipeline)'
             WHEN kc.id IS NULL        THEN 'k_card_id orphelin (a corriger)'
             WHEN split_part(pc.k_card_id, '-', 1) = 'jp' THEN 'JP (gratuit, via PPT)'
             WHEN COALESCE(kc.rarity, '') IN
                  ('Common','Commune','Uncommon','Peu Commune') THEN 'commune/unco -> T3 1x/an'
             WHEN kc.rarity IS NULL    THEN 'rarity NULL (trou a boucher)'
             ELSE 'T1 quotidien (COUT)'
           END AS classe,
           COUNT(*)::int                     AS lignes,
           COUNT(DISTINCT pc.k_card_id)::int AS cartes
    FROM portfolio_cards pc
    LEFT JOIN k_cards kc ON kc.id = pc.k_card_id
    GROUP BY 1 ORDER BY 3 DESC
  `;
  console.log(`users inscrits         : ${u.n}`);
  console.log(`users avec portfolio   : ${p.users}`);
  console.log(`lignes portfolio       : ${p.lignes}`);
  console.log(`cartes distinctes      : ${p.cartes}`);
  console.log(`ratio cartes/user      : ${p.users ? (p.cartes / p.users).toFixed(1) : '-'}`);
  console.log('\nrepartition (c est l UNION qui compte, pas la somme) :');
  console.log(`  ${'classe'.padEnd(32)} ${'lignes'.padStart(7)} ${'cartes'.padStart(7)}`);
  for (const r of rows) {
    console.log(`  ${r.classe.padEnd(32)} ${String(r.lignes).padStart(7)} ${String(r.cartes).padStart(7)}`);
  }
  const cout = rows.find((r) => r.classe.startsWith('T1 quotidien'));
  console.log(`\nT1 ajoute par les portfolios : ${cout ? cout.cartes : 0} cartes/jour`);
  console.log('T1 actuel hors portfolios    : 2741 EN + 2225 FR sur budget 5300.');
  console.log('\nA relever a 50, 200, 500 users : c est la pente reelle de l union,');
  console.log('elle remplace toute estimation. Si "rarity NULL" ou "orphelin" > 0,');
  console.log('ce sont des trous a boucher AVANT de monter en charge.');
}

async function drop() {
  if (!rest.includes('--yes')) throw new Error('ajouter --yes pour confirmer');
  await sql`DROP TABLE IF EXISTS beta_invites`;
  console.log('OK  beta_invites supprimee. Aucune table metier touchee.');
}

const CMDS = { init, invite, list, revoke, probe, drop };

if (!CMDS[cmd]) {
  console.log(`commandes: ${Object.keys(CMDS).join(' | ')}`);
  process.exit(1);
}
CMDS[cmd]().catch((e) => {
  console.error('ERREUR', e.message);
  process.exit(1);
});
