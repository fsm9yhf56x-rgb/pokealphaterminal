// scripts/kodo-guard-raw-monotonie.mjs
//
// GARDE DE MONOTONIE SUR LES ETATS BRUTS (G-RAW).
//
// Un etat degrade ne peut pas couter plus cher que l'etat superieur de la
// MEME source. Mesure du 11/08 : 43 316 paires inversees dans price_matrix,
// dont certaines a x1010. Le defaut est ANCIEN (present chaque jour depuis au
// moins le 1er aout), il n'avait simplement jamais ete mesure.
//
// POURQUOI CA ARRIVE : les etats degrades se vendent peu. Moyenne mesuree :
// 39 ventes pour l'etat inferieur contre 907 pour le superieur, un facteur 23.
// Trois ventes d'un lot mal titre ou une enchere qui derape suffisent a poser
// un Damaged au-dessus d'un Near Mint qui, lui, repose sur 50 000 ventes.
//
// PLANCHER A 1 EUR : en dessous, l'ordre des etats n'a aucun sens economique.
// TCGplayer applique un prix plancher et les frais de port dominent : un Near
// Mint a 0,03 $ face a un Lightly Played a 0,13 $ n'est pas une inversion de
// marche, c'est un artefact d'arrondi sur des montants derisoires. Corriger
// ces lignes toucherait 17 000 prix pour zero gain.
//
// ON REJETTE, ON NE PLAFONNE PAS. Meme principe que la garde G3 des gradees :
// une ligne incoherente n'est pas ecrite, son absence produit "—" plutot qu'un
// faux prix. Verifie avant d'ecrire ce script : ZERO ligne de portfolio est
// valorisee par une ligne fautive (elles passent par fr_cond: ou par un tier
// sain), donc aucune valorisation ne tombe.
//
// PLACE DANS LA CHAINE : apres kodo-merge-ppt, avant kodo-compute-signals.
// Toutes les sources sont ecrites, les signaux ne sont pas encore calcules.
// ATTENTION : kodo-price-by-state.mjs ecrit ses 6 tiers 'kodo_state' PLUS TARD
// dans la chaine — ils ne passent donc PAS par cette garde. C'est acceptable :
// kodo_state est construit par DECAY decroissant, il est monotone PAR
// CONSTRUCTION. Si un jour l'ancre change de nature, revoir ce point.

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL)

// Tolerance 2% : en dessous c'est du bruit d'arrondi, pas une inversion.
const TOLERANCE = 1.02
// Sous ce montant, l'ordre des etats n'a pas de sens (voir en-tete).
const PLANCHER_EUR = 1

const RANGS = `(VALUES
  ('NEAR_MINT',1),('EXCELLENT',2),('LIGHTLY_PLAYED',3),
  ('MODERATELY_PLAYED',4),('HEAVILY_PLAYED',5),('DAMAGED',6)
) AS t(tier, rang)`

console.log('=== GARDE MONOTONIE ETATS BRUTS ===')

const avant = await sql`
  WITH ordre AS (SELECT * FROM ${sql.unsafe(RANGS)}),
  etats AS (
    SELECT pm.print_id, pm.source, pm.tier, o.rang, pm.spot
      FROM price_matrix pm JOIN ordre o ON o.tier = pm.tier
     WHERE pm.is_asking = false AND pm.spot > 0
  )
  SELECT count(DISTINCT (b.print_id, b.source, b.tier))::int n
    FROM etats a JOIN etats b
      ON b.print_id = a.print_id AND b.source = a.source
     AND b.rang > a.rang AND b.spot > a.spot * ${TOLERANCE}
   WHERE a.spot >= ${PLANCHER_EUR}`
console.log('lignes incoherentes detectees :', avant[0].n)

const del = await sql`
  WITH ordre AS (SELECT * FROM ${sql.unsafe(RANGS)}),
  etats AS (
    SELECT pm.print_id, pm.source, pm.tier, o.rang, pm.spot
      FROM price_matrix pm JOIN ordre o ON o.tier = pm.tier
     WHERE pm.is_asking = false AND pm.spot > 0
  ),
  fautives AS (
    SELECT DISTINCT b.print_id, b.source, b.tier
      FROM etats a JOIN etats b
        ON b.print_id = a.print_id AND b.source = a.source
       AND b.rang > a.rang AND b.spot > a.spot * ${TOLERANCE}
     WHERE a.spot >= ${PLANCHER_EUR}
  ), sup AS (
    DELETE FROM price_matrix pm
     USING fautives f
     WHERE pm.print_id = f.print_id AND pm.source = f.source
       AND pm.tier = f.tier AND pm.is_asking = false
    RETURNING 1
  ) SELECT count(*)::int n FROM sup`
console.log('lignes supprimees :', del[0].n)

const apres = await sql`
  WITH ordre AS (SELECT * FROM ${sql.unsafe(RANGS)}),
  etats AS (
    SELECT pm.print_id, pm.source, pm.tier, o.rang, pm.spot
      FROM price_matrix pm JOIN ordre o ON o.tier = pm.tier
     WHERE pm.is_asking = false AND pm.spot > 0
  )
  SELECT count(DISTINCT (b.print_id, b.source, b.tier))::int n
    FROM etats a JOIN etats b
      ON b.print_id = a.print_id AND b.source = a.source
     AND b.rang > a.rang AND b.spot > a.spot * ${TOLERANCE}
   WHERE a.spot >= ${PLANCHER_EUR}`
console.log('lignes incoherentes restantes :', apres[0].n)

// Une seule passe ne suffit pas toujours : supprimer une ligne peut en
// exposer une autre (A > B > C ou seul B etait fautif au premier tour).
if (apres[0].n > 0) {
  console.log('  (residu attendu : relance le lendemain, la source reecrit chaque nuit)')
}
