# Unification Kodo Engine — etat & plan

## Objectif
Kodo Engine devient le SEUL systeme. tcg_* disparait. A terme : API ouverte/payante.

## Etapes (ordre obligatoire — ne PAS sauter)
1. [FAIT] Catalogue Kodo autonome : scripts/kodo-sync-catalog.js (tcg_* -> k_*,
   canonicalisation core_id, k_cards.id = id tcg brut, idempotent). Obsidian integre.
   -> PAS encore greffe au cron (attendre validation sur un vrai nouveau set).
2. [A FAIRE] ENRICHIR k_* — PREALABLE a toute bascule app.
   k_* est epure, il manque des colonnes que l'app utilise :
   - k_sets : AJOUTER logo_url, source, release_date (verifier series deja present)
   - k_cards/k_prints : exposer local_id/number + source ; gerer image_url/has_image
   Sans ca, rebuild-static-data.mjs ne peut pas lire k_* (logos/filtre JP/images casses).
3. [A FAIRE] Basculer scripts/rebuild-static-data.mjs : tcg_* -> k_*.
   C'est LE point de bascule : il genere les JSON public/data/{cards,sets}-{LANG}.json
   que TOUS les composants catalogue consomment (cardDb.ts, setGroups.ts, Encyclopedie).
   Changer la SOURCE des JSON = basculer toute la couche catalogue sans toucher 1 composant.
   Mapping : tcg_cards.name->k_cards.name_localized, tcg_cards.local_id->k_prints.number,
   tcg_sets.series->k_sets.series, etc. TESTER build + Encyclopedie EN LOCAL avant prod.
4. [A FAIRE] SQL direct restant : spotlight/route.ts, market/explorer/route.ts
   (FROM tcg_cards JOIN tcg_sets) -> reecrire sur k_*.
5. [A FAIRE] Encyclopedie.tsx : chargement JP via supabase.from('tcg_cards') (l.446/454)
   -> vestige Supabase a verifier/migrer. Le 'supabase' importe est-il proxy Neon ou mort ?
6. [A FAIRE] Couper sync-catalog (TCGdex->tcg) et brancher TCGdex->k direct.
7. [A FAIRE] DROP tcg_sets, tcg_cards. UNIQUEMENT apres 2-5 valides en prod.

## Fichiers lisant encore tcg_* (20, audites)
Couche JSON (indirecte) : cardDb.ts, setGroups.ts, Encyclopedie.tsx (via rebuild-static-data)
SQL direct : spotlight, market/explorer, prices/*, db/query, sets/logos, admin
-> La bascule de rebuild-static-data (etape 3) regle la couche JSON d'un coup.

## Regle apprise (3 ratés ce matin)
Canonicalisation : k_cards.id = id tcg BRUT (jamais reconstruit lang-set-number).
sql.unsafe casse le driver Neon HTTP -> regex en dur. Tester chaque requete en LECTURE
(SELECT) avant tout INSERT/UPDATE sur la table de prod.
