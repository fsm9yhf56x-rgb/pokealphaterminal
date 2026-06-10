# Phase DB-3 · Audit Number coercion NUMERIC · v0.9 Bedrock

> Audit effectué le 2026-05-26 dans le cadre Audit DB v0.9 Phase 3/8.
> **Résultat : Bedrock pleinement confirmé.**

## Contexte

`@neondatabase/serverless` retourne les colonnes NUMERIC/DECIMAL/BIGINT comme
**strings** (préservation de précision), pas comme numbers natifs comme le
faisait Supabase.

Sans coercion explicite, les bugs typiques sont :
- `.toFixed()` crash silencieusement sur une string
- Multiplication = concatenation de strings
- Charts Recharts affichent des valeurs bizarres
- Tri par prix : ordre alphabétique au lieu de numérique
- Calculs ROI retournent NaN

L'audit vérifie que chaque valeur NUMERIC sortant de Neon est explicitement
convertie en number avant utilisation côté JS.

## Méthodologie

### 1. Inventaire colonnes DB
Query `information_schema.columns` pour lister toutes les colonnes
data_type = 'numeric' | 'decimal' | 'double precision' | 'real'.

### 2. Inventaire helpers de coercion
Grep `coerceNumerics` pour identifier les helpers existants et leurs points
d'application.

### 3. Inventaire bypasses
Grep `sql.query` et `` await sql` `` pour trouver les routes qui n'utilisent
PAS le compat layer (donc ne bénéficient pas de la coercion auto).

### 4. Audit ciblé route par route
Pour chaque route qui bypass, vérifier que la coercion est appliquée
manuellement (`Number(r.X)`).

## Résultats

### Colonnes NUMERIC en prod

**67 colonnes numeric/decimal sur 16 tables/vues**. Tables principales avec
NUMERIC :
- `_deprecated_prices`, `prices_v2`, `prices_canonical`, `prices_snapshots`,
  `prices_by_condition`, `prices_v2_by_condition`
- `alpha_signals`, `market_indices_v1`, `undervalued_signals_v1`
- `portfolio_cards`, `goal_targets`, `goal_wishlist`, `wishlist`
- `fx_rates`, `psa_card_mapping`, `psa_pop_latest`

### Helpers `coerceNumerics`

**3 implémentations identiques** (duplication à factoriser en v1.0 Phase A) :
- `src/app/api/db/query/route.ts` ligne 284
- `src/app/api/psa/pop/route.ts` ligne 70
- `src/lib/db/supabase-compat.ts` ligne 234

Tous ont la même logique : iter les keys de row, regex `/^-?\d+(\.\d+)?$/`
sur les strings, conversion via `Number()`.

### Application coercion

| Path | Application | Status |
|---|---|---|
| `supabase-compat` (`db.from(...).select()`) | Auto ligne 186 | ✅ |
| `/api/db/query` (browser → server) | Auto ligne 104 | ✅ |
| `/api/psa/pop` | Auto ligne 43 | ✅ |
| `sql.query(...)` direct (14 fichiers) | **Manuelle dans chaque caller** | ✅ |
| `` sql`...` `` template literal (12 fichiers) | **Manuelle dans chaque caller** | ✅ |

### Audit routes critiques (consommées par front)

| Route | Pattern | Status |
|---|---|---|
| `/api/prices/graded` | `Number(r.price_avg)` explicite ligne par ligne | ✅ |
| `/api/spotlight` | `Number(r.price_avg)` dans `bySource.push()` et `historyRows.map()` | ✅ |
| `/api/activity` | `Number(s.price_avg)` dans `events.map()`, `Number(a.market_target)` | ✅ |
| `/api/pop-report` | `Number(r[k])` dans la boucle `grades` | ✅ |
| `/api/profile` | Pas de NUMERIC dans le schema | ✅ N/A |

### Inventaire `.toFixed()` (30 occurrences)

Analysis :
- **Calculs JS purs** (pct, roi, etc. dérivés en mémoire) : safe, valeurs déjà numbers
- **Lecture DB direct** : audit confirmé safe car coercion auto OU manuelle dans chaque route
- **Aucun crash potentiel détecté**

## Conclusion Bedrock

✅ **Audit réussi sans patch nécessaire.**

Le code applique la coercion NUMERIC de manière disciplinée :
- **Auto** pour les paths génériques (compat layer, db query)
- **Manuel explicite** pour les paths sql direct (14+ fichiers vérifiés)

Aucune valeur NUMERIC ne peut arriver au front sous forme de string non
coerced. Les 30 `.toFixed()` détectés peuvent tous s'exécuter en sécurité.

## Dette technique notée (v1.0 Phase A)

Factoriser les 3 helpers `coerceNumerics` identiques dans un seul fichier
`src/lib/db/coerce.ts` :

```typescript
// src/lib/db/coerce.ts
export function coerceNumerics<T = any>(row: any): T {
  if (row === null || typeof row !== 'object') return row
  const out: any = {}
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)) {
      const n = Number(v)
      out[k] = Number.isFinite(n) ? n : v
    } else {
      out[k] = v
    }
  }
  return out
}
```

Puis remplacer les 3 implémentations locales par `import { coerceNumerics } from '@/lib/db/coerce'`.

## Maintenance future

À ajouter dans la checklist pre-release :

```bash
cd "/Users/alonguez/Dev/KodoCards"

# Lister tout caller direct sql sans coerceNumerics
grep -rn "await sql\`" src/ --include="*.ts" 2>/dev/null | grep -v node_modules | while read line; do
  file=$(echo "$line" | cut -d: -f1)
  # Verifier que le fichier contient Number(r. OU coerceNumerics
  if ! grep -q "Number(r\.\|Number(s\.\|coerceNumerics" "$file"; then
    echo "POTENTIAL BYPASS: $line"
  fi
done
```

À runner avant chaque release majeure pour détecter les nouveaux bypasses.

## Cleanup audit-numeric.cjs

Le script `audit-numeric.cjs` créé pour cet audit reste dans le repo pour
re-utilisation lors des futurs audits Phase DB-3 (release majeure).
