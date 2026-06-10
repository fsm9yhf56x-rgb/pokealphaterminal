# Phase DB-4 · Audit Migrations idempotentes · v0.9 Bedrock

> Audit effectué le 2026-05-26 dans le cadre Audit DB v0.9 Phase 4/8.
> **Résultat : 10 migrations auditées, 3 patches Bedrock appliqués + cleanup 324 MB.**

## Contexte

Une migration **non-idempotente** ne peut pas être rejouée sans crash. Bedrock
exige que toutes les migrations puissent être appliquées N fois sans effet de
bord (pour restore PITR, setup dev, fork contributeur, etc.).

Patterns Bedrock :
- `CREATE TABLE IF NOT EXISTS` (au lieu de `CREATE TABLE`)
- `CREATE INDEX IF NOT EXISTS` (au lieu de `CREATE INDEX`)
- `CREATE OR REPLACE VIEW` (au lieu de `CREATE VIEW`)
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (PG 9.6+)
- `DROP TABLE IF EXISTS` (au lieu de `DROP TABLE`)

## Méthodologie

1. Inventaire des fichiers `migrations/*.sql`
2. Pour chaque fichier : ratio (clauses défensives / statements modifying)
3. Grep `CREATE TABLE/INDEX/VIEW` sans `IF NOT EXISTS` / `OR REPLACE`
4. Audit doublons tables (potentiels schemas redondants)
5. Inventaire vues / materialized views actives en prod

## Résultats

### 10 migrations auditées

| Fichier | Score | Statut |
|---|---|---|
| `2026-05-05-goals-tables.sql` | 6/8 | ✅ Bon |
| `2026-05-07-market-indices-v1.sql` | 2/3 → **3/3** | ⚠️ → ✅ patché |
| `2026-05-09-undervalued-signals-v1.sql` | 1/1 | ✅ OK |
| `2026-05-18-prices-v2-with-tcgdex-lang.sql` | 1/1 | ✅ OK |
| `2026-05-19-backfill-set-aliases.sql` | 1/3 | ⚠️ Backfill data |
| `2026-05-19-canonical-card-mapping.sql` | 2/2 | ✅ OK |
| `2026-05-19-extend-price-variants.sql` | 1/2 | ⚠️ À auditer v1.0 |
| `2026-05-19-prices-canonical-enriched.sql` | 1/2 → **2/2** | ⚠️ → ✅ patché |
| `2026-05-19-prices-canonical-view.sql` | 1/2 → **2/2** | ⚠️ → ✅ patché |
| `2026-05-22-psa-jp-set-mappings.sql` | 3/3 | ✅ Bedrock-grade |

### Patches appliqués cette session

3 `CREATE VIEW` → `CREATE OR REPLACE VIEW` :

1. `migrations/2026-05-07-market-indices-v1.sql` ligne 31 (`market_indices_v1`)
2. `migrations/2026-05-19-prices-canonical-enriched.sql` ligne 13 (`prices_canonical`)
3. `migrations/2026-05-19-prices-canonical-view.sql` ligne 8 (`prices_canonical`)

Note : ces migrations sont **déjà appliquées en prod**. Le patch garantit
qu'une future réexécution (restore PITR, dev setup, fork) ne crash pas.

### Vues actives en prod (8 au total)

**7 VIEW classiques** :
- `market_indices_v1` — indices marché agrégés
- `prices_by_condition` — prix par condition (NM/LP/MP/HP/DMG)
- `prices_canonical` — pricing résolu canonical_id
- `prices_v2` — pricing latest enrichi tcgdex_set_id + lang
- `prices_v2_by_condition` — prix par condition V2
- `psa_pop_latest` — pop reports latest
- `undervalued_signals_v1` — signaux spreads CM EU vs eBay US

**1 MATERIALIZED VIEW** :
- `prices_latest` — refresh fire-and-forget via `refresh_prices_latest()` RPC dans `writeSnapshots()`. Has indexes + populated.

### Tables doublonnées (à drop en v1.0 Phase A)

#### Doublon 1 : `psa_card_mapping` (vide) vs `psa_card_mappings` (12 334 rows)

Schémas **complètement différents** — pas un doublon technique mais 2 ébauches d'architecture :

| Colonne | `psa_card_mapping` (vide) | `psa_card_mappings` (prod) |
|---|---|---|
| `card_ref` | text | — |
| `tcg_card_id` | — | text |
| `psa_spec_id` | text | — |
| `psa_card_ref` | — | text |
| `confidence` | numeric | text |
| Colonnes total | 10 | 7 |

**Décision** : drop `psa_card_mapping` (vide, ébauche jamais utilisée) en v1.0 Phase A.

#### Doublon 2 : `wishlist` (vide) vs `goal_wishlist` (vide, 14 colonnes)

V1 legacy vs V2 enrichie. `goal_wishlist` est utilisée par `useGoals.ts` actuellement (mais aucun user n'a encore ajouté de wishlist d'après les compteurs).

**Décision** : drop `wishlist` (V1 legacy) en v1.0 Phase A.

### Cleanup `migrations/neon-migration/` (324 MB → 5 KB)

Suppression des 3 dumps SQL de la migration Supabase→Neon du 11/05/26 :
- `full-dump.sql` (113 MB) ✅ supprimé
- `full-dump.original.sql` (113 MB) ✅ supprimé
- `neon-ready.sql` (113 MB) ✅ supprimé

Conservés pour traceability :
- `clean-dump.py` (2 KB, tracké Git) — script de nettoyage
- `import.log` (2 KB) — log de l'import

Pattern `.gitignore` ajouté pour éviter futur push : `migrations/neon-migration/*.sql`.

## Décisions Bedrock pour v1.0

À traiter en v1.0 Phase A (DB cleanup) :

1. **Drop `psa_card_mapping`** (vide) → libère le nom pour usage cohérent
2. **Drop `wishlist`** (vide) → simplifie le schema
3. **Rename `_deprecated_prices` → `prices_master`** (30 min, sémantique)
4. **Audit `2026-05-19-extend-price-variants.sql`** : vérifier idempotence du 2e statement
5. **Audit `2026-05-19-backfill-set-aliases.sql`** : ajouter idempotence sur le backfill
6. **Factoriser 3 `coerceNumerics` identiques** → `src/lib/db/coerce.ts` (cf. Phase DB-3)

## Maintenance future

Avant chaque release majeure, exécuter :

```bash
cd "/Users/alonguez/Dev/KodoCards"

# Detecter CREATE sans IF NOT EXISTS / OR REPLACE
grep -rn "^CREATE TABLE [^I]\|^CREATE INDEX [^I]\|^CREATE UNIQUE INDEX [^I]\|^CREATE VIEW [^O]\|^CREATE MATERIALIZED VIEW [^I]" migrations/*.sql 2>/dev/null

# Detecter ALTER ADD COLUMN sans IF NOT EXISTS  
grep -rn "^ALTER TABLE.*ADD COLUMN [^I]" migrations/*.sql 2>/dev/null
```

Attendu : 0 résultat. Si pas 0, patcher avant release.
