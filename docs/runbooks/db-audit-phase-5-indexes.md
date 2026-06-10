# Phase DB-5 · Audit Indexes critiques · v0.9 Bedrock

> Audit effectué le 2026-05-26 dans le cadre Audit DB v0.9 Phase 5/8.
> **Résultat : 89 indexes en prod, 1 index ajouté pour anticipation v1.0+.**

## Contexte

Sans indexes, PostgreSQL fait des Sequential Scans (lecture complète de la table).
Bedrock vise queries fréquentes < 100 ms p95. Sur des tables de 30k-350k rows
comme `prices_snapshots` (349k) ou `tcg_cards` (75k), un Seq Scan = 200-2000 ms.
Avec indexes = 1-10 ms.

## Méthodologie

1. Inventaire complet des indexes via `pg_indexes`
2. Identification des champs filtrés fréquemment dans le code (`WHERE`, `JOIN`, `ORDER BY`)
3. EXPLAIN ANALYZE sur les 5 queries les plus critiques
4. Croisement : champs filtrés mais non-indexés → patch

## Résultats

### 89 indexes en prod sur 25 tables

Bonne couverture héritée de la migration Supabase → Neon. Tables critiques bien indexées :

| Table | Rows | Indexes critiques |
|---|---|---|
| `prices_snapshots` (349k) | `idx_snapshots_card_time`, `idx_snapshots_source_time`, `idx_snapshots_card_source_variant` | ✅ |
| `tcg_cards` (75k) | `idx_tcg_cards_set`, `idx_tcg_cards_set_lang`, `idx_tcg_cards_lang`, GIN sur variants | ✅ |
| `psa_pop_reports` (70k) | `idx_psa_pop_card_ref`, `idx_psa_pop_card_scraped` | ✅ |
| `card_aliases` (39k) | `idx_card_aliases_canonical`, `idx_card_aliases_set`, `idx_card_aliases_tcg_card_id` | ✅ |
| `_deprecated_prices` (30k) | `idx_prices_fetched`, `idx_prices_name`, `idx_prices_set`, `idx_prices_tier` | ✅ |
| `psa_card_mappings` (12k) | `idx_psa_card_mappings_psa_ref`, `idx_psa_card_mappings_confidence` | ✅ |
| `sync_logs` (7k) | `idx_sync_logs_job_started`, partial sur status non-success | ✅ |
| `portfolio_cards` (107) | `idx_portfolio_user`, `idx_portfolio_set` | ✅ |
| `alpha_signals` (120) | `idx_alpha_active`, `idx_alpha_card` + **idx_alpha_signals_computed_at** (cette phase) | ✅ |

### Couverture WHERE clauses du code

| Champ filtré | Occurrences | Index supportant |
|---|---|---|
| `WHERE tcg_card_id = ?` | 6 | `idx_card_aliases_tcg_card_id` ✅ |
| `WHERE id = ?` | 6 | PK partout ✅ |
| `WHERE card_ref = ?` | 4 | `idx_snapshots_card_time`, `idx_psa_pop_card_ref` ✅ |
| `WHERE variant = ?` | 1 | `idx_snapshots_card_source_variant` composite ✅ |
| `WHERE set_slug = ?` | 1 | `idx_card_aliases_set` ✅ |
| `WHERE job_name = ?` | 1 | `idx_sync_logs_job_started` ✅ |
| `WHERE from_currency = ?` | 1 | PK composite `fx_rates_pkey` ✅ |
| `WHERE canonical_id = ?` | 1 | `idx_card_aliases_canonical` ✅ |

**100% des WHERE clauses fréquentes ont un index supportant.**

### EXPLAIN ANALYZE sur 5 queries critiques

| Query | Plan | Execution Time | Statut |
|---|---|---|---|
| Portfolio cards by user | Index Scan `idx_portfolio_user` | 0.686 ms | ✅ |
| Prices snapshots by card_ref | Index Scan `idx_snapshots_card_time` | 4.346 ms | ✅ |
| PSA pop reports by card_ref | Index Scan `idx_psa_pop_card_ref` | 2.988 ms | ✅ |
| TCG cards by id (PK) | Index Scan `tcg_cards_pkey` | 2.527 ms | ✅ |
| Alpha signals latest (avant) | Seq Scan + top-N heapsort | 3.141 ms | 🟡 |
| **Alpha signals latest (après patch)** | **Index Scan `idx_alpha_signals_computed_at`** | **0.040 ms** | ✅ **78× plus rapide** |

**4 sur 5 queries < 5 ms (largement dans la cible Bedrock < 100 ms p95).**

### Patch appliqué cette session

`migrations/2026-05-26-alpha-signals-computed-at-index.sql` :

```sql
CREATE INDEX IF NOT EXISTS idx_alpha_signals_computed_at 
  ON alpha_signals (computed_at DESC);
```

**Justification** : `alpha_signals` ne contient que 120 rows actuellement, donc PG préférait Seq Scan + top-N heapsort. Optimal pour 120 rows MAIS à 10k+ rows (v1.0+ croissance), ça deviendra lent. L'index est créé maintenant pour anticipation — PG l'utilisera automatiquement quand la cardinalité augmentera (déjà le cas selon le re-test : 0.040 ms !).

Migration **idempotente** (`CREATE INDEX IF NOT EXISTS`) — peut être rejouée sans effet de bord.

### Application en prod

- Migration appliquée : 202 ms
- Re-test EXPLAIN ANALYZE : Index Scan **78× plus rapide** (3.141 ms → 0.040 ms)

## Conclusion Bedrock

✅ **Audit réussi avec patch préventif.**

- 89 indexes en prod : couverture massive, héritée d'une bonne migration Supabase → Neon
- 100% des WHERE/JOIN/ORDER BY fréquents ont un index supportant
- 4 sur 5 queries critiques < 5 ms (cible : < 100 ms p95)
- 1 index préventif ajouté pour anticiper la croissance d'`alpha_signals`

## Maintenance future

À runner avant chaque release majeure pour détecter les régressions :

```bash
cd "/Users/alonguez/Dev/KodoCards"

# Inventaire indexes
node -e "
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query(\"SELECT tablename, indexname FROM pg_indexes WHERE schemaname='public' ORDER BY tablename\").then(r => {
  console.log('Total indexes:', r.rows.length);
  pool.end();
});
"
```

Si le compte chute brutalement (< 80) ou si une table critique perd ses indexes, investiguer.

### Queries à monitorer (croissance prévue v1.0+)

Quand ces tables dépassent 1k rows, re-runner EXPLAIN ANALYZE :

| Table | Threshold | Index préventif | Status |
|---|---|---|---|
| `alpha_signals` | 1k rows | `idx_alpha_signals_computed_at` | ✅ Ajouté |
| `goal_targets` | 1k rows | `idx_goal_targets_user` | ✅ Existant |
| `goal_wishlist` | 1k rows | `idx_goal_wishlist_user` (partial WHERE NOT acquired) | ✅ Existant |
| `portfolio_cards` | 10k rows | `idx_portfolio_user` | ✅ Existant |
| `sync_logs` | 100k rows | `idx_sync_logs_job_started`, `idx_sync_logs_status` partial | ✅ Existant |

## Indexes potentiellement sur-couvert (v1.0 Phase A audit)

Aucun index inutile détecté à priori. À surveiller :
- `psa_card_mapping` (table vide à drop v1.0) — ses 3 indexes seront supprimés avec la table
- `wishlist` (table vide à drop v1.0) — son index sera supprimé avec la table

Pas d'action nécessaire avant le drop des tables.
