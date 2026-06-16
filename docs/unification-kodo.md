# Unification Kodo Engine — etat

## Objectif
Faire de Kodo (k_sets / k_prints / k_cards) la couche de donnees unique cote app.
tcg_sets / tcg_cards = legacy, a terme supprime.

## Etat: 5/7 etapes faites (objectif app ATTEINT)

### FAIT
- **Etape 1** — Catalogue Kodo autonome (`kodo-sync-catalog.js`, tcg_* -> k_*, idempotent)
- **Etape 2** — k_* enrichi: source, logo_url, total_cards (638/638), noms multilingues
  (name EN / name_fr / name_jp), rarity_normalized. era/symbol_url = colonnes tcg_* TOUJOURS
  vides (0 ligne), non portees.
- **Etape 3** — Couche catalogue JSON sur Kodo. `rebuild-static-data.mjs` lit les vues
  `k_cards_export` / `k_sets_export`. JSON cartes identiques a l'octet vs tcg_*. Vue sets
  choisit le nom selon la langue (FR->name_fr, JP->name_jp, sinon EN).
- **Etape 4** — 6 routes SQL basculees sur k_*_export:
  sets/logos, prices/graded, graded-current, graded-history, market/explorer, spotlight.
  Bonus: resolution slug robuste (match exact id + fallback nom) remplace les LIKE flous
  preexistants qui renvoyaient le mauvais set.
- **Etape 5** — Encyclopedie JP (loadFromSupabase) basculee sur k_*_export via compat layer.

=> PLUS AUCUN CODE APPLICATIF NE LIT tcg_* DIRECTEMENT (verifie par grep).

### RESTE (dette post-lancement, NON bloquant)
- **Etape 6** — Rebrancher l'alimentation de k_* sur TCGdex direct.
  Actuellement: TCGdex -> tcg_* (sync-catalog.js) -> k_* (kodo-sync-catalog.js).
  tcg_* sert d'etage-tampon interne (invisible cote produit).
- **Etape 7** — DROP tcg_sets, tcg_cards.
  BLOQUE PAR: 3 crons de prod lisent encore tcg_* :
    - scripts/sync-catalog.js (8 ref) — ecrit tcg_* depuis TCGdex
    - scripts/kodo-ingest-prices.js (1 ref)
    - src/app/api/cron/prices-ebay/route.ts (4 ref)
  + ~65 scripts one-shot/diagnostic/migration (la plupart morts, a auditer avant drop).

## Vues d'export (versionnees: scripts/kodo-create-export-views.js)
- `k_cards_export`: k_cards + k_prints -> forme tcg_cards (set_id prefixe langue minuscule,
  local_id = number, lang en MAJ, + rarity_normalized).
- `k_sets_export`: k_sets -> 1 ligne/langue via unnest(langs), nom selon langue.
A relancer apres tout changement de schema k_*.

## Regle de canonicalisation (CRITIQUE)
- k_cards.id = id tcg BRUT (en-base1-4, jp-646982). JAMAIS reconstruit.
- k_prints.id / k_sets.id = canonique SANS prefixe langue (base1-4, base1).
- regex prefixe EN DUR ('^(en|fr|jp|de|es|it|pt|ko|zh|ru|pl)-'), sql.unsafe casse Neon HTTP.
- Toujours tester une requete en LECTURE (SELECT) avant INSERT/UPDATE sur prod.
