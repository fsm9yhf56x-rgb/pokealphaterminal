# Kodo Engine — Schéma cible & plan de migration
*Design figé le 11/06/2026 — pilote les sessions C→F. Ne pas coder hors de ce plan.*

## 1. Principe produit
L'utilisateur collectionne **des cartes par langue** : le même tirage physique (print)
existe en EN, FR, JP... et chaque déclinaison est ajoutable séparément à sa collection.
Le marché price les **prints** (par marché et par langue) ; l'utilisateur possède des **cards**.

## 2. Schéma cible (3 niveaux)

### k_sets — le set canonique
- id (ex: 'ex1'), name, name_fr, name_jp, series, release_date
- langs text[] (ex: {en,fr,jp}), total_cards int
- tcgdex_slug, poketrace_us_slug, poketrace_eu_slug, ppt_set_name
- Remplace: tcg_sets (856 lignes vs 833 réels), set_aliases, sets, kodo_set_map (absorbée)

### k_prints — le tirage physique
- id = '{set_id}-{number}[-{variant}]' (ex: 'ex1-8', 'base1-4-1st')
- set_id → k_sets, number text, variant text (Normal|Holo|1stEd|Shadowless...)
- name_en, rarity, tcgplayer_id, cardmarket_id,
  poketrace_us_id, poketrace_us_holo_id, poketrace_eu_id, poketrace_eu_holo_id, ppt_card_id
- Absorbe: source_refs (devient les colonnes refs de k_prints)

### k_cards — la déclinaison linguistique (= l'unité de collection)
- id = '{lang}-{print_id}' (ex: 'en-ex1-8', 'fr-ex1-8') → COMPATIBLE avec les IDs actuels
- print_id → k_prints, lang text, name_localized, image_url (R2)
- Remplace: tcg_cards (mêmes IDs ⇒ migration transparente pour wishlist/searches)

### Prix (déjà construits, re-clés sur print)
- price_matrix: kodo_card_id → print_id + nouvelle col. La résolution par langue
  lit country_breakdown->language.{LANG} (FR/DE/IT...) ; JP via PPT.
- price_signals: idem, + cote_fr_eur, cote par langue extraite du JSONB.
- price_history (à créer, append-only) : alimentée par le cron quotidien depuis price_matrix.

## 3. Verdict données existantes

### portfolio_cards ✅ SAIN
Format (set_id sans préfixe, lang, card_number) = déjà le modèle print+lang.
Jointure: lower(lang)||'-'||set_id||'-'||card_number = k_cards.id. Pas de réécriture
des données users nécessaire — on ajoute une colonne k_card_id calculée, backfillée.
Exceptions: set_id NULL (scellés JP) → rattacher plus tard, non bloquant.

### Tables prix — matrice de décision
| Table | Taille | Sort |
|---|---|---|
| price_matrix / price_signals | 7 MB | ✅ CŒUR du Engine |
| graded_prices_ppt | 381 MB | ✅ GARDER (historique + JP + vélocité) |
| prices_snapshots | 505 MB | ⚠️ source FR legacy → remplacée par language.FR ; purge après bascule (≈ -500 MB Neon) |
| portfolio_value_snapshots | 32 kB | ✅ garder (courbe portfolio) |
| _deprecated_prices | 12 MB | ❌ DROP |
| prices_v2, prices_v2_by_condition, prices_canonical, prices_by_condition, graded_prices_flat, card_price_resolved(_jp) | 0 B | ❌ DROP (encore lues par /api/prices et /conditions !) |

### Mappings
- card_aliases, psa_card_mapping(s), psa_set_mappings → re-clés sur k_prints (session F,
  avec le re-scrape PSA déjà au backlog)
- set_variants, sets, set_aliases → absorbés par k_sets

## 4. API cible

### UN endpoint : GET /api/kodo/prices/:cardId
Résout k_cards → print → langue. Retourne:
{ fairValue, matrix{raw,graded par source}, coteLang (FR si carte fr-*), history,
  liquidity, spreads, gradeEV, sources, asOf, locks (par plan) }
Verrous plans intégrés (raw=free, matrice gradée=Premium, signaux=Pro) — reprend lib/plan.ts.

### Consolidation des 11 routes /api/prices/*
| Route | Sort |
|---|---|
| /prices (prices_v2!), /conditions (vides!) | ❌ remplacées par /kodo/prices |
| /graded, /graded-current, /graded-history | → fusion dans /kodo/prices (PPT reste la source des historiques) |
| /tcgdex, /tcgplayer, /ebay (écrit _deprecated!), /sync, /refresh | ❌ déprécier après bascule |
| /history | → /kodo/prices (history) |

## 5. Ordre d'exécution
- **C** : créer k_sets/k_prints/k_cards + backfill depuis tcg_cards/kodo_set_map/source_refs
  + colonne portfolio_cards.k_card_id backfillée. Validation chiffrée (counts, orphelins).
- **D** : re-clé price_matrix/signals sur print_id ; extraction cote par langue dans signals ;
  price_history + greffon cron ; endpoint /api/kodo/prices/:cardId + validation vs affichage actuel.
- **E** : bascule écritures (Holdings/wishlist écrivent k_card_id) + bascule lecture
  Pokedesk → Spotlight → drawers → digest. Une surface = un commit réversible.
- **F** : décommission (DROP tables mortes, routes legacy, purge prices_snapshots,
  re-scrape PSA sur k_prints, suppression tcg_sets/doublons en-obsidian-flames/préfixes orphelins).

## 6. Invariants (non négociables)
1. Les IDs k_cards = IDs tcg_cards actuels → zéro migration de données user destructive.
2. Construire à côté, basculer surface par surface, ne dropper qu'en F.
3. Toute nouvelle table user → USER_TABLES immédiatement.
4. Validation chiffrée avant chaque bascule (script de comparaison, échantillon par set).
5. Jamais de VACUUM FULL sur Neon ; purges en lots de 25k.
