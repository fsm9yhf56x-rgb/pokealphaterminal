# Lot E · Google OAuth · Reporté v1.0

> Décision Bedrock du 2026-05-26 : Lot E Google OAuth **reporté v1.0 Phase B**.

## Décision

Skip Lot E pour v0.9. Email/password (Better Auth) suffit pour beta privée
30 testeurs invitation-only.

## Justification

- **Bedrock**: focus sur les piliers critiques v0.9 (DB, auth core, sécurité, perf)
- **Gain Lot E** : +20% conversion signup (estimé) — pertinent pour ouverture publique, pas beta privée
- **Coût Lot E** : 1h30-2h (Google Cloud Console + Better Auth socialProviders + tests E2E)
- **Risque opportunité** : 0 — feature nice-to-have, retardable sans impact business

## Roadmap v1.0 Phase B — implémenter Lot E

Étapes documentées pour reprise ultérieure :

### E.1 — Setup Google Cloud Console (15 min)

1. https://console.cloud.google.com/
2. Créer projet `kodocards-oauth`
3. APIs & Services → OAuth consent screen
   - User type : External
   - App name : Kodo Cards
   - User support email : `contact@kodocards.com`
   - Authorized domains : `kodocards.com`
   - Developer contact : `contact@kodocards.com`
4. APIs & Services → Credentials → Create Credentials → OAuth client ID
   - Application type : Web application
   - Name : `kodocards-web`
   - Authorized JavaScript origins :
     - `http://localhost:3001`
     - `https://kodocards.com`
     - `https://*.vercel.app` (preview deployments)
   - Authorized redirect URIs :
     - `http://localhost:3001/api/auth/callback/google`
     - `https://kodocards.com/api/auth/callback/google`

### E.2 — Récupérer credentials (2 min)

Copier `Client ID` + `Client Secret` (ne pas les coller en chat).

### E.3 — Env vars (5 min)

`.env.local` :
GOOGLE_CLIENT_ID=<client-id>
GOOGLE_CLIENT_SECRET=<client-secret>
NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true

Vercel (Production + Preview + Development) :
```bash
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_ID preview
vercel env add GOOGLE_CLIENT_ID development
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GOOGLE_CLIENT_SECRET preview
vercel env add GOOGLE_CLIENT_SECRET development
vercel env add NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED production
vercel env add NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED preview
vercel env add NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED development
```

### E.4 — Better Auth config (10 min)

Patcher `src/lib/auth/server.ts` pour activer Google :

```typescript
import { betterAuth } from 'better-auth'
import { Pool } from '@neondatabase/serverless'

export const auth = betterAuth({
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  emailAndPassword: { enabled: true, ... },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  ...
})
```

### E.5 — Activer bouton dans AuthForm.tsx (2 min)

`AuthForm.tsx` a déjà le bouton Google conditionné par
`NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true` (memory edit Lot B).
Flip le flag à `true` en env var, le bouton apparait automatiquement.

### E.6 — Tests E2E (15-30 min)

**Local** :
1. Click "Continuer avec Google" sur /login
2. Redirect Google OAuth flow
3. Approve → redirect /api/auth/callback/google
4. Better Auth crée user dans table `user` + `account` (provider=google)
5. Redirect / (logged in)

**Prod** (après push) :
1. Idem sur https://kodocards.com
2. Vérifier que tu peux signup avec un email Google différent du tien
3. Logout puis re-login fonctionne

### E.7 — Commit + push

```bash
git commit -m "feat(auth): Lot E Google OAuth via Better Auth · v1.0 Phase B
- Setup Google Cloud Console + OAuth client
- Better Auth socialProviders.google active
- Env vars NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true
- Tests E2E valides local + prod
- Bouton Google visible dans AuthForm"
```

## Risques anticipés Lot E

### Risque 1 — Redirect URI mismatch (90% des cas)

**Symptôme** : Google retourne `redirect_uri_mismatch` error.

**Cause** : URI configuré en Google Console ne match pas exactement celui envoyé par Better Auth.

**Fix** : ajouter `http://localhost:3001/api/auth/callback/google` dans Google Console (sans trailing slash, port exact).

### Risque 2 — `account` table conflict

**Symptôme** : signup Google échoue si user existe déjà avec email/password.

**Fix** : Better Auth a une option `account.accountLinking` pour merger. À configurer.

### Risque 3 — Cookies / CORS en prod

**Symptôme** : OAuth marche local mais pas en prod.

**Cause** : `BETTER_AUTH_URL` doit être correct + cookies SameSite + secure.

**Fix** : memory edit Lot C — `baseURL = window.location.origin` côté client, server-side via env var. Déjà géré.

## Pourquoi pas v0.9

| Critère | v0.9 beta privée | v1.0 ouverture publique |
|---|---|---|
| Users cibles | 30 testers invitation-only | Public ouvert |
| Connaissance produit | Élevée (testers briefés) | Faible (visiteurs random) |
| Friction signup | Email/password OK | Doit être minimale |
| Conversion priorité | Faible (focus feedback) | Élevée (acquisition) |
| Bedrock priorité | DB + sécurité + perf | + UX premium + OAuth |

## Status

⏭️ **Reporté à v1.0 Phase B** (avant ouverture publique).
Doc complète pour reprise : 30 min à 1h de travail estimé.
