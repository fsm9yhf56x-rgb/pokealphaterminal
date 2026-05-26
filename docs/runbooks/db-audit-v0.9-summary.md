# Audit DB v0.9 — Synthèse Bedrock

> **Audit effectué le 2026-05-26 sur 1 journée (8 phases consécutives).**  
> **Résultat global : Bedrock-grade infrastructure validée pour v0.9 beta privée.**  
> 1 goulot perf identifié et documenté pour v1.0 Phase B.

## Verdict exécutif

| Pilier Bedrock | Statut | Score |
|---|---|---|
| **Backup & Recovery** | ✅ PITR testé E2E | 5/5 |
| **React state management** | ✅ 0 boucle infinie | 5/5 |
| **Type safety (NUMERIC)** | ✅ Coercion auto + manuelle | 5/5 |
| **Migrations idempotentes** | ✅ 10/10 patches | 5/5 |
| **Indexes critiques** | ✅ 100% WHERE indexés | 5/5 |
| **Sécurité multi-tenant** | ✅ Auth applicatif + 2 patches | 5/5 |
| **Performance sous charge** | 🟡 1 goulot v0.9-acceptable | 3/5 |
| **Documentation Bedrock** | ✅ 1012 lignes runbooks | 5/5 |

**Score global : 38/40 = 95% Bedrock-grade v0.9.**

Les 5% manquants concernent uniquement le goulot perf sur `/api/spotlight`, qui
sera traité en v1.0 Phase B avant ouverture publique.

## Synthèse des 8 phases

### Phase DB-1 — Backup PITR Neon ✅
- Test E2E PITR effectué : 25 tables, 587 534 rows, **100% match**
- Procédure documentée pour urgence + maintenance
- ⚠️ Plan Free Neon = 6h PITR (insuffisant Bedrock v1.0, upgrade Launch $19/mo requis)
- Commit : `3b03c4d`

### Phase DB-2 — Audit useEffect deps ✅
- 7 patterns dangereux recherchés : **tous à 0 occurrence**
- 14 `useEffect [user?.id]` sains sur 16 fichiers consommateurs
- Discipline préservée depuis migration Neon (11/05/26)
- Commit : `afda26e`

### Phase DB-3 — Audit NUMERIC coercion ✅
- 67 colonnes NUMERIC/DECIMAL sur 16 tables/vues
- 3 helpers `coerceNumerics` identiques (duplication à factoriser v1.0)
- Coercion auto + manuelle explicite dans 5 routes critiques
- 30 `.toFixed()` détectés : **tous safe**
- Commit : `724ee8d`

### Phase DB-4 — Migrations idempotentes ✅
- 10 migrations auditées, **3 patches CREATE OR REPLACE VIEW appliqués**
- Cleanup local 324 MB (3 dumps SQL migration Supabase→Neon)
- Doublons tables identifiés : `psa_card_mapping` (vide), `wishlist` (vide)
- 7 VIEW + 1 MATERIALIZED VIEW documentées
- Commit : `31ee207`

### Phase DB-5 — Indexes critiques ✅
- 89 indexes en prod sur 25 tables
- 100% des WHERE clauses fréquentes indexées
- 4 sur 5 queries < 5 ms
- **Patch préventif : `idx_alpha_signals_computed_at`** (78× plus rapide)
- Commit : `600a437`

### Phase DB-6 — RLS sécurité multi-tenant ✅
- 7 tables multi-tenant identifiées
- `/api/db/query` audité : architecture Bedrock exemplaire
- **2 patches sécurité appliqués** :
  - `/api/prices/tcgdex` : fonction `isAuthorizedCron` fail-open supprimée
  - `/api/prices/sync` : auth check ajouté (pattern fail-closed)
- Tests E2E : 4/4 anonymous + mauvais bearer = 401
- Commit : `1b217d9`

### Phase DB-7 — Load test ✅ (avec goulot documenté)
- `/api/pop-report` : **164 req/sec**, p99 237ms [Bedrock-grade]
- `/api/prices/graded` : 10 req/sec, p99 1652ms [Acceptable beta]
- `/api/spotlight` : 2 req/sec, p99 9939ms [🚨 Goulot v1.0]
- Root cause : `prices_canonical` VIEW avec COALESCE multi-aliases empêche index usage
- Commit : `f98b500`

### Phase DB-8 — Documentation finale ✅
- 7 runbooks détaillés (1012 lignes)
- Ce document : synthèse + roadmap v1.0 + procédure maintenance
- Commit : *en cours*

## Patches appliqués en prod (cette session)

| Patch | Phase | Type | Impact |
|---|---|---|---|
| `idx_alpha_signals_computed_at` | DB-5 | CREATE INDEX | Perf : 3.141ms → 0.040ms (78×) |
| 3 `CREATE VIEW` → `OR REPLACE` | DB-4 | Migration | Idempotence |
| Suppression `isAuthorizedCron` fail-open | DB-6 | Security | Bedrock fail-closed |
| Auth check `/api/prices/sync` | DB-6 | Security | Anti-DDoS + quotas |
| Auth check `/api/prices/tcgdex` | DB-6 | Security | Anti-DDoS + quotas |

**5 patches Bedrock appliqués.** Tous testés E2E.

## Baseline DB v0.9 (snapshot)

### Tables (25 total, 587 534 rows)

Tables critiques par volumétrie :

| Table | Rows | Volume |
|---|---|---|
| `prices_snapshots` | 349 370 | 60% |
| `tcg_cards` | 75 601 | 13% |
| `psa_pop_reports` | 70 888 | 12% |
| `card_aliases` | 39 767 | 7% |
| `_deprecated_prices` | 30 129 | 5% |
| `psa_card_mappings` | 12 334 | 2% |
| `sync_logs` | 7 211 | 1% |
| Autres | 638 | <1% |

### Vues actives (8)

7 VIEW classiques + 1 MATERIALIZED VIEW :
- `prices_canonical`, `prices_v2`, `prices_v2_by_condition`, `prices_by_condition`
- `market_indices_v1`, `undervalued_signals_v1`
- `psa_pop_latest`
- `prices_latest` (MAT VIEW, populated, auto-refresh fire-and-forget)

### Indexes (89 total)

- Couverture massive héritée migration Supabase → Neon
- 100% des WHERE clauses fréquentes indexées
- 1 ajout cette session : `idx_alpha_signals_computed_at`

### Infrastructure

- **DB** : Neon PG 17.10 Frankfurt (`lucky-water-64635288`)
- **Plan** : Free (6h PITR window, 5GB transfer/mois, 0.5GB storage)
- **Latency moyenne** : 50-340ms selon endpoint
- **Network transfer** : 84.5% du quota mensuel ⚠️

## Roadmap v1.0

### Phase A — DB cleanup (1-2 jours)

Dette technique cumulée à traiter en début v1.0 :

1. **Drop `psa_card_mapping`** (vide, ébauche non-utilisée) — 15 min
2. **Drop `wishlist`** (V1 legacy, vide, V2 = `goal_wishlist`) — 15 min
3. **Rename `_deprecated_prices` → `prices_master`** (semantic only) — 30 min
4. **Factoriser 3 `coerceNumerics`** → `src/lib/db/coerce.ts` unique — 30 min
5. **Audit idempotence** :
   - `2026-05-19-extend-price-variants.sql` (statement 2/2 à vérifier)
   - `2026-05-19-backfill-set-aliases.sql` (ajouter idempotence backfill)
6. **Cleanup `node_modules/` tracked** (Git ls-files montre fichiers tracked) — 15 min
7. **Audit deps npm** : 15 vulnerabilités détectées par autocannon install — 1h

**Total Phase A : ~4h.**

### Phase B — Performance & sécurité hardening (3-5 jours)

Avant ouverture publique v1.0 :

1. **Upgrade Neon Free → Launch ($19/mo)** : 7 jours PITR, 24 GB transfer, 10 GB storage, 300h compute
2. **Patch goulot `/api/spotlight`** (1 sur 3 options arbitrées) :
   - Option A : Refactor `prices_canonical` VIEW pour permettre index usage (2-3h)
   - Option B : Étendre `prices_latest` mat view avec colonne `condition` (1-2h)
   - **Option C recommandée** : Cache HTTP Vercel CDN 60s + stale-while-revalidate (15 min)
3. **Activer RLS PostgreSQL** sur 4 tables Kodo Cards (filet sécurité 2e ligne) :
   - `portfolio_cards`, `goal_targets`, `goal_wishlist`, `badges`
   - Pattern Neon : `SET LOCAL app.user_id` + policies (1 jour effort)
4. **Strict mode CSP** (Lot H : actuellement Report-Only)
5. **Monitoring Sentry** : alertes pic 401 (DDoS detection)
6. **Load test prod** (k6/artillery contre kodocards.com)

## Procédure maintenance régulière

### Tous les mois — Test PITR

```bash
cd "/Users/alonguez/Dev/PokéAlpha Terminal"

# Voir docs/runbooks/db-restore.md
# 1. Créer branche restore-monthly-test-YYYY-MM
# 2. Lancer node validate-restore.cjs
# 3. Vérifier 25 tables / ~587k rows match
# 4. Cocher dans tracker
# 5. Supprimer branche test
```

### Avant chaque release majeure (v1.0, v2.0, v3.0)

1. **useEffect audit** :
```bash
grep -rn "useEffect.*\[user\]\|useEffect.*\[user," src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules
```
Attendu : 0 résultat.

2. **NUMERIC coercion audit** :
```bash
node audit-numeric.cjs
```
Inventaire colonnes, croiser avec routes `sql.query` direct.

3. **Migrations idempotentes** :
```bash
grep -rn "^CREATE TABLE [^I]\|^CREATE INDEX [^I]\|^CREATE VIEW [^O]" migrations/*.sql
```
Attendu : 0 résultat.

4. **Indexes inventaire** :
```bash
node -e "
const { Pool } = require('@neondatabase/serverless');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT COUNT(*) FROM pg_indexes WHERE schemaname=$1', ['public']).then(r => {
  console.log('Total indexes:', r.rows[0].count);
  pool.end();
});
"
```
Si compte chute < 80, investiguer.

5. **Load test critique** :
```bash
npx autocannon --connections 10 --duration 30 \
  "http://localhost:3001/api/spotlight?card_id=base1-4"
```
v1.0+ cible : > 50 req/sec, p99 < 500ms, 0 timeouts.

### Tous les 3 mois — Audit DB complet

Re-runner ce protocole complet sur les 7 phases. Documenter les résultats dans
un nouveau `db-audit-vX.Y-summary.md`.

## Liens

- **Runbook restore** : `docs/runbooks/db-restore.md`
- **Phase 2 useEffect** : `docs/runbooks/db-audit-phase-2-useeffect.md`
- **Phase 3 NUMERIC** : `docs/runbooks/db-audit-phase-3-numeric-coercion.md`
- **Phase 4 Migrations** : `docs/runbooks/db-audit-phase-4-migrations.md`
- **Phase 5 Indexes** : `docs/runbooks/db-audit-phase-5-indexes.md`
- **Phase 6 RLS** : `docs/runbooks/db-audit-phase-6-rls.md`
- **Phase 7 Load test** : `docs/runbooks/db-audit-phase-7-load-test.md`

## Conclusion

**v0.9 Infrastructure Solide — Audit DB Bedrock-grade complété.**

7 commits propres, 1012 lignes de runbooks, 5 patches en prod, 1 goulot
documenté pour v1.0. La DB Kodo Cards est solide, sécurisée et traçable.

Prêt pour beta privée 30 testeurs.
