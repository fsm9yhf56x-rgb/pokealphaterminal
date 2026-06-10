# Schema overhaul — phases 0-1 (juin 2026)

## Phase 0 — purge aopkm (DONE)
- Supprimé: tcg_cards (29 275), psa_card_mappings (12 334), prices_snapshots (2 552), tcg_sets (411)
- card_aliases: 0 ref aopkm (déjà propre)
- portfolio_cards: 1 carte (Nest Ball, Premium Trainer Box 2016) → set_id NULL, carte conservée
- prices_canonical est une VUE sur prices_snapshots + card_aliases (pas une table)
- Méthode: DELETE par lots 25k via PK id (jamais ctid sur vue), VACUUM simple

## Phase 1 — référentiel canonique (DONE)
- Table `sets` (628 lignes): PK = slug nu (base1, sv151...), name_en/fr/jp, lang_available[], tcgdex_slug via set_aliases
- Table `set_variants` (12): base1-1st, base1-shadowless... → FK sets
- Fusion en-X/fr-X/jp-X par slug nu; variantes détectées par suffixe (1st|shadowless|shadowless-ns|promo)
- Couverture portfolio: 393/393 résolus, 0 orphelin

## Phase 2 — TODO: tcg_cards canonique
- 1 ligne/carte, variant en colonne, FK sets(id), tcgplayer_id via card_aliases.tcgplayer_product_id
- Les ~176 lignes sans préfixe langue (pl4, si1, pop8...) à rattacher
## Phase 3 — TODO: basculer consommateurs (card_price_resolved, crons graded, API prices) sur le canonique
## Phase 4 — TODO: drop tcg_sets + _deprecated_prices; nettoyer tolérances aopkm du code (spotlight, ebay, graded routes)

## Règles
- `sets`/`set_variants` → ajouter à PUBLIC_TABLES de /api/db/query quand le front les consommera
- Jamais VACUUM FULL sur Neon; DELETE par lots 25k
