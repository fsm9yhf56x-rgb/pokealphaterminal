# Phase DB-7 · Load test 100 queries concurrentes · v0.9 Bedrock

> Audit effectué le 2026-05-26 dans le cadre Audit DB v0.9 Phase 7/8.
> **Résultat : 2/3 endpoints Bedrock-grade. 1 goulot critique identifié sur `/api/spotlight`.**

## Contexte

Bedrock veut valider que Neon + Vercel + le code tiennent la charge **avant**
le trafic réel. Pour v0.9 beta privée (~30 users), trafic réel : ~2 req/sec
max sur un endpoint donné. Cible de validation : 50-100 req/sec en pic.

## Méthodologie

Outil : `autocannon` v8.0.0 (lib Bedrock-grade Node, HTTP load testing).

Tests effectués contre **localhost:3001** (`npm run dev`, mode dev Next.js
non-optimisé).

⚠️ Important : dev server est **10-50× plus lent** que build prod Vercel.
Les résultats mesurés ici sont des **lower bounds** de la perf réelle.

## Résultats

### Test 1 — `/api/spotlight?card_id=base1-4` × 10 connexions × 30s

| Métrique | Valeur | Verdict |
|---|---|---|
| Throughput | 2 req/sec | 🚨 GOULOT |
| Total requests | 57 | |
| Latency p50 | 3811 ms | |
| Latency p95 | 9855 ms | |
| Latency p99 | 9939 ms | |
| Errors | 3 timeouts | |

### Test 2 — `/api/prices/graded?tcg_card_id=en-base1-4` × 10 connexions × 20s

| Métrique | Valeur | Verdict |
|---|---|---|
| Throughput | 10 req/sec | 🟡 Acceptable beta |
| Total requests | 203 | |
| Latency p50 | 662 ms | |
| Latency p95 | 1580 ms | |
| Latency p99 | 1652 ms | |
| Errors | 0 | ✅ |

### Test 3 — `/api/pop-report?card_id=en-base1-4&lang=EN` × 10 connexions × 20s

| Métrique | Valeur | Verdict |
|---|---|---|
| Throughput | 164 req/sec | ✅ Bedrock |
| Total requests | 3272 | |
| Latency p50 | 50 ms | |
| Latency p95 | 169 ms | |
| Latency p99 | 237 ms | |
| Errors | 0 | ✅ |

### Test 4 — Stress `/api/spotlight` × 50 connexions × 30s

| Métrique | Valeur | Verdict |
|---|---|---|
| Throughput | 0.13 req/sec | 🚨 EFFONDREMENT |
| Total requests | 4 | |
| Latency p50 | 8034 ms | |
| Latency max | 8239 ms | |
| Errors | 146 timeouts | |

## Diagnostic root cause

EXPLAIN ANALYZE sur les 2 queries de `/api/spotlight` :

### Query 1 — Card info + JOIN tcg_sets : 0.041 ms ✅
Rapide, indexes parfaits.

### Query 2 — Latest prices DISTINCT ON via VIEW `prices_canonical` : **341.919 ms** 🚨
Unique  (cost=69600.41..70296.98 rows=216 width=63)
Gather Merge (Workers Planned: 2, Workers Launched: 2)
Parallel Hash Left Join (cost=47925.47..68469.38 rows=2341 width=63)
Filter: (COALESCE(CASE WHEN ((ps.card_ref ~~ 'en-%'::text) ...)
THEN ps.card_ref ELSE NULL END, ca_pt.tcg_card_id, ...))
Rows Removed by Filter: 124813

**Root cause** : la VIEW `prices_canonical` fait un `COALESCE(CASE WHEN ..., 
ca_pt.tcg_card_id, ca_tcg.tcg_card_id, ca_ebay.tcg_card_id)` pour résoudre
le `tcg_card_id` canonical depuis 4 sources d'aliases. Ce COALESCE empêche
PG d'utiliser un index direct sur `prices_snapshots.card_ref` — PG doit
**matérialiser le JOIN complet** (350k rows × 4 alias tables) avant de filter.

### Query 3 — History cardmarket : 175.807 ms 🚨

Même problème root, autre query.

## Investigation `prices_latest` (matérialized view existante)

Hypothèse initiale : on pourrait patcher `/api/spotlight` vers `prices_latest`
(0.037 ms). **Hypothèse invalidée** :

1. `prices_latest` n'a **pas de colonne `condition`** → casse l'UX multi-condition (NM/LP/MP/HP/DMG)
2. `prices_latest` indexée par `card_ref` direct (sans résolution alias) :
prices_canonical WHERE tcg_card_id = 'en-base1-4'    → 2 rows
prices_latest    WHERE card_ref    = 'en-base1-4'    → 0 rows
prices_snapshots WHERE card_ref    = 'en-base1-4'    → 0 rows

Les rows sont stockées avec un `card_ref` natif source (ex: `pt-XXX` PokeTrace),
et la résolution `en-base1-4` ne se fait **que** dans la VIEW `prices_canonical`
via COALESCE multi-aliases.

## Conclusion Bedrock pragmatique

✅ **2/3 endpoints validés Bedrock-grade.**
🚨 **`/api/spotlight` confirmé en goulot v1.0.**

### Décision v0.9 beta privée

Goulot **accepté** pour v0.9 car :
- Trafic réel beta : ~2 req/sec max → latency 340ms reste perçue mais OK
- Aucun timeout en condition réelle (ne tient pas 10 conn simultanées, mais on
  n'aura jamais 10 spotlight queries simultanées en beta 30 users)
- Refactor structural (1-2h + migration BDD) hors-scope v0.9

### Action obligatoire v1.0 Phase B (Perf)

**Avant ouverture publique v1.0**, le refactor est obligatoire. 3 options à
arbitrer en v1.0 :

#### Option A — Refactor `prices_canonical` VIEW pour permettre index usage

Repenser la VIEW pour que le COALESCE soit faisable côté JOIN (CTE par alias
source + UNION ALL au lieu de COALESCE imbriqué).

Effort : 2-3h, risque moyen (touche pricing core).

#### Option B — Étendre `prices_latest` matérialized view

Ajouter colonne `condition` + résolution `tcg_card_id` côté refresh RPC. Mise
à jour de `refresh_prices_latest()` + recrée indexes.

Effort : 1-2h, risque haut (touche pipeline pricing).

#### Option C — Cache HTTP Vercel CDN

Ajouter `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` sur
`/api/spotlight`. Vercel CDN cache la réponse 60s. La 2e+ requête sur la
même carte ne touche plus Neon.

Effort : 15 min, risque nul, reversible. Bedrock-acceptable même pour v1.0
(prix changent toutes les heures via cron, stale de 60s invisible UX).

**Recommandation Option C en priorité** (quick win), refactor structural en
Option A ou B en v2.0 (Phase B perf approfondie).

## Maintenance future

Avant chaque release majeure, runner le load test :

```bash
cd "/Users/alonguez/Dev/PokéAlpha Terminal"

# Spotlight endpoint critique
npx autocannon --connections 10 --duration 30 \
  "http://localhost:3001/api/spotlight?card_id=base1-4"

# Acceptable v1.0 : > 50 req/sec, p99 < 500ms, 0 timeouts
```

Si cible non atteinte → blocker release, appliquer Option C minimum.

## Notes sur les 15 vulnérabilités npm install
15 vulnerabilities (7 moderate, 8 high)

C'est dans deps transitives de `autocannon` (lib dev, pas runtime prod).
Pas critique v0.9, à auditer en v1.0 Phase B (audit deps complet).
