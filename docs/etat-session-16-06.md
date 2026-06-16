# Etat session 16/06 — Unification + Prix par langue

## FAIT cette session (tout commite + pousse, build vert)

### Unification Kodo: 5/7 (objectif app ATTEINT)
- App 100% sur Kodo: JSON (rebuild-static-data lit k_*_export) + 6 routes SQL
  (sets/logos, prices/graded, graded-current, graded-history, market/explorer, spotlight)
  + Encyclopedie JP (compat layer -> k_*_export).
- k_* enrichi: total_cards (638/638), noms multilingues name/name_fr/name_jp
  (vue choisit selon langue), rarity_normalized, source, logo_url.
- Bugs slug LIKE preexistants corriges (renvoyaient le mauvais set) -> resolution
  exacte id + fallback nom.
- Pipeline auto-maintenu: workflow sync-catalog propage TCGdex->tcg_*->k_*->JSON
  (kodo-sync-catalog + refresh vues greffes entre sync et rebuild).
- RESTE (dette post-lancement, NON bloquant): etapes 6-7 = DROP tcg_*.
  Bloque par 3 crons prod encore sur tcg_* (sync-catalog, kodo-ingest-prices, prices-ebay).

### Prix par langue (chantier majeur, COMPLET)
- price_signals indexe par (print_id, lang) — 1 signal par carte-langue.
- compute-signals reecrit: calcule par langue (Cardmarket trend de la langue,
  liquidite de la langue, tous les LATERAL filtrent split_part(kodo_card_id,'-',1)).
- Cote FR corrigee: utilisait les ANNONCES (cardmarket_unsold) -> bug 15 EUR.
  Maintenant ventes (cardmarket AGGREGATED fr-%) -> 3.44 EUR correct.
- spotlight + explorer filtrent ps.lang = kc.lang (casse minuscule des deux cotes).
- Migration versionnee (kodo-migrate-signals-lang.js, idempotente) + greffee au
  workflow kodo-consolidate avant compute.
- Verifie bout-en-bout: 2011bw-1 EN 3.29 vs FR 3.44.

### Menage & fiabilite
- 113 scripts one-shot/diagnostic archives dans scripts/_archive (git mv).
  scripts/ = 20 vivants. Gardes pour diagnostic: kodo-coverage-report, kodo-validate-vs-legacy.
- Bug fetch corrige: AbortController 15s sur get() dans kodo-ingest-prices
  (plus de runs zombies).

## PENDING a fort impact produit (prochaine session, idealement FR complet)
1. **Regle de prix "source la plus tradee"**: compute prend Cardmarket trend par
   defaut. La regle (docs/regle-prix-reference.md) veut la source avec le plus de
   VENTES a tier egal. Casse-tete: Cardmarket = cote agregee sans sale_count, eBay/
   TCGPlayer = count reel. A arbitrer (seuil de ventes pour que le sold prime ?).
2. **Panneau de prix style PokeTrace**: transparence multi-source (blocs eBay/
   TCGPlayer/Cardmarket etiquetes + cote FR + detail par etat). Inspiration validee
   via screenshots. A faire avec prix FR visibles.

## PENDING infra/divers (memoire)
- Verifier ingestion FR chaque jour (job kodo_ingest_eu_fr, resumable, ~2400/nuit).
- DROP tcg_* (etapes 6-7) en session dediee: rebrancher 3 crons -> laisser tourner
  une nuit -> verifier k_* alimente -> alors dropper.
- Cosmetique: favicon, OG image, logo, rename repo/Vercel.
