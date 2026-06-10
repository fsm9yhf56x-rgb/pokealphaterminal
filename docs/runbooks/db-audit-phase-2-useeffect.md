# Phase DB-2 · Audit useEffect deps · v0.9 Bedrock

> Audit effectué le 2026-05-26 dans le cadre Audit DB v0.9 Phase 2/8.
> **Résultat : Bedrock pleinement confirmé.**

## Contexte

Bug pattern récurrent React + Better Auth : `useEffect(() => {...}, [user])` (objet)
crée des boucles infinies de re-render car la référence de l'objet `user` change à chaque
render Better Auth (même si l'ID utilisateur reste identique).

La correction Bedrock : utiliser `[user?.id]` (string stable) en deps array.

Impact d'un seul `[user]` mal écrit : potentiellement 1000+ requêtes/seconde par utilisateur,
ce qui peut ruiner Neon (network transfer) et freezer le navigateur.

Memory edit du 11/05/26 indiquait que la correction avait été faite sur 11 occurrences au
moment de la migration Supabase → Neon. Cet audit vérifie qu'il n'y a eu aucune régression.

## Méthodologie

7 patterns recherchés via grep récursif sur `src/` :

1. `useEffect.*[user]` ou `[user,` — pattern dangereux principal
2. `useEffect.*[session]` — variante session
3. `useEffect.*[profile]` — variante profile
4. `useEffect.*[rawSession]` — variante Better Auth raw session
5. `useCallback` avec `user.X` dans le corps — closures stales
6. `useMemo` avec `user.X` dans le corps — closures stales
7. `useEffect ... [], }` utilisant `user.X` — mount-only avec user (généralement bug)

## Résultats

| Pattern | Résultat |
|---|---|
| `useEffect.*[user]` | ✅ 0 occurrence |
| `useEffect.*[session]` | ✅ 0 occurrence |
| `useEffect.*[profile]` | ✅ 0 occurrence |
| `useEffect.*[rawSession]` | ✅ 0 occurrence |
| `useCallback` avec user | ✅ 0 occurrence |
| `useMemo` avec user | ✅ 0 occurrence |
| `useEffect []` avec user | ✅ 0 occurrence |
| `useEffect.*[user?.id]` (sain) | ✅ 14 occurrences |

**0 bug détecté sur 16 fichiers consommant useAuth/useSession.**

## Inventaire `[user?.id]` (patterns sains)

| Fichier | Ligne | Usage |
|---|---|---|
| `src/lib/useAuth.ts` | 85 | Fetch profile au mount/login |
| `src/lib/useIsAdmin.ts` | 40 | Check admin role |
| `src/lib/usePortfolio.ts` | 39 | Load portfolio cards |
| `src/lib/usePortfolio.ts` | 131 | Sync add card |
| `src/lib/usePortfolio.ts` | 148 | Sync update card |
| `src/lib/usePortfolio.ts` | 165 | Sync remove card |
| `src/lib/useGoals.ts` | 61 | Load goals + wishlist |
| `src/lib/useGoals.ts` | 120 | Sync update targets |
| `src/lib/useGoals.ts` | 129 | Sync remove target |
| `src/lib/useGoals.ts` | 155 | Sync add wishlist |
| `src/lib/useGoals.ts` | 164 | Sync update wishlist |
| `src/lib/useGoals.ts` | 173 | Sync remove wishlist |
| `src/components/features/portfolio/Holdings.tsx` | 196 | Initial portfolio load |
| `src/components/features/portfolio/Holdings.tsx` | 474 | Re-sync on portfolio change |

## 16 fichiers consommateurs de useAuth/useSession
src/app/(auth)/login/LoginClient.tsx
src/app/(auth)/signup/SignupClient.tsx
src/app/(dashboard)/alpha/deals/page.tsx
src/app/(dashboard)/alpha/dexy/page.tsx
src/app/(dashboard)/alpha/whales/page.tsx
src/components/auth/AuthForm.tsx
src/components/features/cartes/Encyclopedie.tsx
src/components/features/home/daily-hub/HubHeader.tsx
src/components/features/portfolio/Holdings.tsx
src/components/features/prices/PriceHistoryChart.tsx
src/components/layout/UserMenu.tsx
src/lib/auth/client.ts
src/lib/useAuth.ts
src/lib/useGoals.ts
src/lib/useIsAdmin.ts
src/lib/usePortfolio.ts

## Conclusion Bedrock

✅ **Audit réussi sans patch nécessaire.**

Le code respecte la règle "deps stables uniquement". La discipline Bedrock a été maintenue
depuis la migration Neon. Aucun risque de boucle infinie identifié.

## Maintenance future

Re-runner ces 7 grep avant chaque release majeure (v1.0, v2.0, v3.0).

À ajouter dans la checklist pre-release :

```bash
cd "/Users/alonguez/Dev/KodoCards"

grep -rn "useEffect.*\[user\]\|useEffect.*\[user," src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules
```

Attendu : 0 résultat. Si pas 0, fix avant release.
