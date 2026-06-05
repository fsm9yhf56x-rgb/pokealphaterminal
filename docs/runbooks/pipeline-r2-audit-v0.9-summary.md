# Audit Pipeline + R2 — Synthèse v0.9

> Kodo Cards · Infrastructure Solide · Audit Pipeline & Stockage
> Date : 2026-06-05 · Standard : Bedrock-grade v0.9
> Complément à `db-audit-v0.9-summary.md`

---

## Verdict global

| Volet | Score | Statut |
|---|---|---|
| Pipeline (crons & syncs) | Sain après nettoyage | OK |
| R2 (stockage images) | Couverture 97-98% | OK |

L'audit a révélé **1 incident actif** (pipeline zombie en échec 504) corrigé, et **1 point d'attention** (parseLocalId vs padding) documenté pour suivi. L'infrastructure Pipeline + R2 est jugée solide pour la beta privée.

---

## PIPELINE

### Incident trouvé & corrigé
- **TCGdex/Cardmarket échouait à CHAQUE run (HTTP 504)** depuis ≥ 2 jours. La route `/api/prices/tcgdex` mettait 644s (5 runs × ~2 min) avant timeout. Cause : workflow zombie de l'ancien pipeline, dont la source a été remplacée par PPT + PokeTrace.
- **Action** : crons neutralisés (commentés, fichiers gardés, réactivables via `workflow_dispatch`) sur 4 workflows de l'ancien pipeline :
  - `prices-tcgdex.yml` (le 504)
  - `prices-tcgplayer.yml`
  - `prices-ebay.yml`
  - `artofpkm-sync.yml`
- Commit : `1b6ff81`

### Crons lissés
- **Collision quotidienne à 04:00** entre `prices-poketrace` et `portfolio-prices` : portfolio-prices calculait la valeur du portfolio en même temps que poketrace rafraîchissait les prix FR → risque de lire des prix périmés.
- **Action** : `portfolio-prices` décalé de `0 4` → `30 4` (04:30, après poketrace) → calcul sur prix frais + fin des collisions.

### Sources VIVANTES confirmées (post-nettoyage)
| Workflow | Rôle | Cron |
|---|---|---|
| `sync-graded-ppt-en` | Gradés PPT EN (raw + gradés) | 00:05 quotidien |
| `sync-graded-ppt-jp` | Gradés PPT JP | 00:15 / 08:15 / 16:15 |
| `prices-poketrace` | Référence FR (PokeTrace Pro) | toutes les 4h |
| `portfolio-prices` | Calcul valeur portfolio | 04:30 quotidien |
| `dedupe-snapshots` | Hygiène snapshots | 03:00 quotidien |
| `sync-catalog` | Catalogue (sets/cartes) | 1er du mois 04:00 |
| `psa-sync-{hot,warm,cold}` | Pop reports PSA EN | 1 / 8 / 15 du mois |
| `psa-jp-sync-{hot,warm,cold}` | Pop reports PSA JP | 4 / 11 / 18 du mois |

- **PSA conservé** : la vue `psa_pop_latest` contient 70 972 lignes et alimente 6 routes/pages (`/api/pop-report`, `/api/psa/pop`, admin sync-status...). PPT fournit des PRIX gradés (smartPrice par grade) mais PAS la population PSA (rareté) → PSA reste la seule source de pop. Coût quasi nul (mensuel, étalé).
- **Watchdog** `flag_stuck_sync_logs` : présent et fonctionnel.

---

## R2 (stockage images)

### Migration legacy : propre
- **0 URL Supabase résiduelle** en DB (`tcg_cards.image_url`). Supabase Storage déprécié, migration terminée.
- `getCardImageUrl()` construit l'URL R2 au **runtime** (`{R2_BASE}/{lang}/{normalizeSetId(setId)}/{localId}.{ext}`), utilisée en **priorité** ; `image_url` (DB) sert de fallback. Le "0 r2.dev en DB" est donc normal : l'URL R2 n'est jamais stockée.

### Couverture (selon `has_image`)
| Langue | Total actif | Avec image | Couverture |
|---|---|---|---|
| JP | 44 608 | 43 846 | 98.3% |
| EN | 24 379 | 23 841 | 97.8% |
| FR | 21 947 | 21 310 | 97.1% |

- Échantillon de cartes réelles testé sur R2 : répond 200 (cohérence `has_image=true` ↔ fichier R2 confirmée).
- Bucket : `pub-1aade8805ea544358d85a303c1feef41.r2.dev`. Secrets R2 présents dans `sync-catalog.yml`, `sync-graded-ppt-jp.yml`, `scripts/sync-new-cards-to-r2.js`.

### Point d'attention : padding `local_id`
- R2 stocke les fichiers avec le `local_id` **brut, zéro de tête inclus** (ex : `030.webp`, `082.webp`). `getCardImageUrl` passe le `localId` tel quel → cohérent, fonctionne.
- **MAIS** `parseLocalId()` strippe les zéros de tête (`082` → `82`), pour le format `prices_v2` (`082/100`). 7 914 cartes actives ont un `local_id` à zéro de tête.
- **Risque** : si un chemin de code applique `parseLocalId` PUIS construit une URL R2, ces 7 914 images feraient 404 (et retomberaient sur le fallback CDN, invisible à l'œil). À vérifier : aucun `getCardImageUrl({ localId: parseLocalId(...) })` ne doit exister.

---

## Patches appliqués
1. `1b6ff81` — neutralisation crons ancien pipeline (tcgdex/tcgplayer/ebay/artofpkm)
2. décalage `portfolio-prices` → 04:30

---

## Recommandations Phase B (v1.0)
1. **Re-sync R2 des ~3% manquants** via `scripts/sync-new-cards-to-r2.js` (passer de 97-98% à ~100%).
2. **Suppression définitive** (pas juste neutralisation) des `.yml` + scripts de l'ancien pipeline, une fois confirmé sur quelques semaines qu'aucune dépendance ne subsiste.
3. **Vérifier le chemin `parseLocalId` → R2** : s'assurer qu'aucune construction d'URL R2 ne strippe le zéro de tête. Idéalement, harmoniser (R2 et URL utilisent le même format de localId).
4. **Nettoyage `image_url` artofpkm** : 44k URLs `active_storage/redirect` (fragiles) servent de fallback ; envisager de les repointer vers R2 ou de les vider une fois la couverture R2 à 100%.

---

## Baseline (snapshot 2026-06-05)
- Workflows actifs : 12 (6 prix/data + 6 PSA mensuels)
- Workflows neutralisés : 4 (ancien pipeline)
- `tcg_cards` actives avec image : ~89 000
- Couverture R2 : JP 98.3% / EN 97.8% / FR 97.1%
- `psa_pop_latest` : 70 972 lignes
- Sources vivantes : PPT (EN+JP gradés) + PokeTrace (FR) + PSA (pop)
