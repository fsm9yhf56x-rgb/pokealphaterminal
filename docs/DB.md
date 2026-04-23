# Database Workflow

## Stack

- **Supabase Postgres** — prod DB
- **Types auto-générés** via `supabase gen types typescript --linked`
- **2 clients typés** dans `src/lib/db.ts` :
  - `getAnonClient()` — front, respecte RLS
  - `getAdminClient()` — API routes & scripts, bypass RLS

## Après toute modification de schema

```bash
npm run db:types
```

Ça regénère `src/lib/db/schema.ts` depuis la DB en live. Commit le diff :

```bash
git add src/lib/db/schema.ts
git commit -m "chore(db): regen types after schema change"
```

## Workflow safe pour un changement de schema

1. SQL `ALTER TABLE ...` dans Supabase SQL Editor
2. `npm run db:types && npm run build`
3. Si le build trouve des erreurs TS, les fixer AVANT de push
4. `git add -A && git commit -m "..." && git push`

## Observabilité

```sql
SELECT job_name, status, stats, started_at, finished_at
FROM sync_logs
ORDER BY started_at DESC LIMIT 5;
```
