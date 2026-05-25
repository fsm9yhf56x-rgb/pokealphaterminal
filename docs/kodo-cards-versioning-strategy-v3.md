# Kodo Cards — Stratégie de Versioning & Release Plan v3

> Document de référence pour le lancement progressif du produit.
> Version 3 · Mai 2026 · Confidentiel
> Complément au document `kodo-cards-pricing-oracle-spec-v2.md`
>
> **Évolutions vs v2** :
> - Ajout du standard **Bedrock** pour v1.0 (4 niveaux d'exigence, 0 compromis)
> - Ajout du standard **Infrastructure Solide** pour v0.9
> - Replan v0.9 : 2 semaines (audit infra) au lieu d'1 jour
> - Replan v1.0 : 13 semaines en 7 phases au lieu de 6 semaines
> - Section "Réalignement features actuelles" : produit prod mélange v1/v2/v3, à recadrer

---

## Sommaire

- [Philosophie : 4 produits autonomes, pas des incréments](#philosophie--4-produits-autonomes-pas-des-incréments)
- [Vue d'ensemble des 4 produits](#vue-densemble-des-4-produits)
- [v0.9 — Beta Privée (prélancement)](#v09--beta-privée-prélancement)
- [v1.0 — Le Tracker](#v10--le-tracker)
- [v2.0 — Le Terminal](#v20--le-terminal)
- [v3.0 — L'Oracle](#v30--loracle)
- [v4.0 — La Plateforme](#v40--la-plateforme)
- [Principes de versioning](#principes-de-versioning)
- [Tableau récapitulatif](#tableau-récapitulatif)
- [Roadmap visuelle](#roadmap-visuelle)
- [Mapping phases techniques ↔ versions](#mapping-phases-techniques--versions)
- [Communication & change management](#communication--change-management)
- [Annexes](#annexes)

---

## Philosophie : 4 produits autonomes, pas des incréments

### Principe fondamental

> **Chaque version est un produit complet, livrable, utilisable sans frustration, avec une promesse claire tenue à 100%.**

### L'erreur évitée

Une approche "v1.0 = ce qu'on a + 2 bug fixes" produit un **moignon de produit** : le user sent les trous, la promesse marketing est vague, le tier Pro n'a pas de sens autonome.

### L'approche choisie

Chaque version est **un produit fini sur son scope**. Si le développement s'arrêtait après n'importe quelle version, tu aurais un produit que tu peux pitcher, vendre, et faire vivre.

### Test de validité

Pour chaque version, on doit pouvoir répondre OUI à ces questions :

1. **Promesse claire** : peut-on résumer le produit en une phrase qui ne ment pas ?
2. **Audience définie** : sait-on précisément à quel persona on s'adresse ?
3. **Pricing justifié** : le tier payant a-t-il du sens *dans cette version* (pas dans une future) ?
4. **Pas de promesse cassée** : un user qui s'arrête à cette version n'est-il pas frustré ?
5. **Pitchable en l'état** : peut-on présenter ce produit à un investisseur sans excuses ?

Si une réponse est NON, la version est mal définie.

---

## Vue d'ensemble des 4 produits

```
v0.9 (Now)        Beta Privée        →  Validation audience (50-200 users)
v1.0 (M+1)        Le Tracker         →  Gestion de collection complète
v2.0 (M+5)        Le Terminal        →  Trading + market intelligence
v3.0 (M+10)       L'Oracle           →  Pricing professionnel multi-grade
v4.0 (M+18)       La Plateforme      →  Infrastructure du marché TCG
```

Chaque produit cible un **persona principal** différent et ajoute une **dimension nouvelle**, pas une feature isolée.

---

## Standards de qualité (Bedrock & Infrastructure Solide)

Cette section formalise les exigences qualité par version. Elle est **opposable**
à toute décision de "shipping prématuré" et sert de checklist obligatoire avant
release.

### Le principe fondateur

> La v1.0 Le Tracker est la **fondation** de tout le produit. Si elle est
> bancale, tout le reste s'effondre. Si elle est exceptionnelle, elle porte
> toute la trajectoire jusqu'à la Series A.

Cette conviction se traduit par deux standards explicites :

- **Standard "Infrastructure Solide"** appliqué à v0.9 (infrastructure-first)
- **Standard "Bedrock"** appliqué à v1.0 (qualité totale 4 niveaux)
- Pour v2.0 et au-delà : évaluation au cas par cas, probablement Bedrock
  assoupli sur certains points pour préserver la vélocité

---

### Standard "Infrastructure Solide" pour v0.9

v0.9 n'est pas juste "polish + community". C'est la **validation que les fondations
infrastructure tiennent** avant d'investir 3 mois sur v1.0 Bedrock. Si l'infra
craque sous 200 beta testeurs, on aura un problème.

Les features v2/v3 actuellement visibles en prod (Alpha Signals, Whale Tracker,
Deal Hunter, graded prices détaillés) **restent affichées en v0.9** puisque
les testeurs sont prévenus que c'est une beta. Le masquage propre se fera
en début de v1.0 Phase A.

#### Les 4 piliers infrastructure pour v0.9

**1. Auth & sessions (Better Auth)**
- Signup/login fonctionne 100% du temps (0 race condition)
- Reset password testé end-to-end avec email reçu
- Sessions persistent (refresh page, redémarrage navigateur, multi-device)
- Cookies HttpOnly + CSRF protection vérifiés
- Multi-onglet synchro testé (login dans tab 1 → tab 2 mis à jour)
- Edge cases : email déjà utilisé, password trop court, email invalide
- Logout propre (session DB invalidée, cookies cleared, redirect home)
- Rate limiting login (5 tentatives/15min via Upstash) sinon brute force possible
- Test de charge : 50 logins simultanés sans erreur

**2. Database (Neon + compat layer)**
- Backup PITR Neon vérifié (download test + restore staging réussi)
- Migrations 100% idempotentes et réversibles, dossier `migrations/` propre
- Audit complet `useEffect` deps (`[user?.id]` partout, jamais `[user]`)
- Audit `Number(x ?? 0)` sur tous les fetch BDD (NUMERIC string Neon)
- Audit `.or()` et `.not()` côté server bypass via `sql.query` direct
- Pas de table orphane, pas de FK cassée
- Indexes critiques en place (queries < 100ms p95)
- Connection pooling Neon serverless OK
- RLS testée : un user ne voit jamais les données d'un autre
- Test de charge : 100 queries concurrentes sans `connection limit reached`

**3. Pipeline data (prices_v2, sync_logs, workflows)**
- 2 workflows GH Actions (prices-poketrace 4h + prices-tcgdex 1×/h) verts 7+ jours
- 4 endpoints prix instrumentés sync_logs sans erreur
- `prices_latest` materialized view refresh auto via RPC
- `prices_v2_by_condition` à jour
- `prices_canonical` à 94.5% résolu, pas de régression
- Admin `/admin/sync-status` lit les vraies métriques
- Sentry capture les erreurs cron sans flood
- Status page publique opérationnelle sur status.kodocards.com (Better Stack free)

**4. Storage R2 + images**
- R2 bucket public accessible avec latence < 100ms
- `cleanLegacyUrl()` rewrite Supabase URLs → R2 partout
- `getCardImageUrl({lang, setId, localId})` retourne URL valide pour 100% catalogue
- Audit catalogue : 0 carte avec image cassée (404)
- Cache headers Cloudflare optimaux (Cache-Control public, max-age=31536000)
- Fallback "image missing" propre (placeholder Snow+ designed)

#### Checklist v0.9 finale (obligatoire avant ouverture beta)

**Infrastructure (priorité absolue)** :
- [ ] Auth flow end-to-end testé (signup, login, reset password, logout, multi-device)
- [ ] Rate limiting login en place
- [ ] Backup Neon PITR testé avec restore staging
- [ ] Audit `useEffect [user?.id]` complet
- [ ] Audit `Number(x ?? 0)` complet sur tous les fetch BDD
- [ ] Sentry actif sur 100% des routes API
- [ ] Status page status.kodocards.com en ligne
- [ ] 2 workflows GH Actions verts 7 jours consécutifs
- [ ] Audit images R2 cassées (catalogue complet)
- [ ] Test de charge 50 users simultanés (k6 ou Artillery)

**Polish minimum (pour ne pas effrayer les testeurs)** :
- [ ] Fix bug JP dropdown Holdings
- [ ] Fix Daily Hub glitch
- [ ] Page `/beta` avec waitlist + code d'accès

**Community** :
- [ ] Discord Kodo Cards (5 channels)
- [ ] Brevo waitlist configuré
- [ ] 30 ambassadeurs identifiés et contactés
- [ ] Disclaimer beta visible partout (header beta badge)

#### Durée v0.9 réajustée

| Activité | Effort |
|---|---|
| Audit infrastructure (auth + DB + pipeline + storage) | 3-4 jours |
| Fix bugs critiques (JP dropdown, Daily Hub) | 1 jour |
| Page `/beta` + Discord + Brevo | 1 jour |
| Tests de charge + monitoring setup | 1-2 jours |
| Outreach ambassadeurs | continu |

**Total : ~2 semaines** au lieu de "1 jour" initialement prévu. Cohérent avec
l'exigence d'infrastructure solide qui doit tenir jusqu'à v1.0 Bedrock.

---

### Standard "Bedrock" pour v1.0

> **Bedrock = la fondation rocheuse sur laquelle tout est construit.**

Bedrock signifie **4 niveaux d'exigence simultanés**. La v1.0 ne peut être
lancée qu'après avoir validé les checklists des 4 niveaux. Aucun compromis.

#### Niveau 1 : Solidité technique (0 dette technique tolérée)

Pas de "on patchera plus tard". Tout ce qui est livré en v1.0 doit pouvoir
tenir 30000 users sans refacto.

- 100% des composants critiques testés (E2E + unit)
- Lighthouse score > 95 sur toutes les pages publiques
- 0 erreur Sentry par jour en P50 (acceptable : <5 P95)
- Latency p95 < 200ms sur 100% des endpoints
- 0 race condition connue (audit `useEffect` deps, `usePortfolio` synchro)
- Migrations DB toutes idempotentes et réversibles
- Backup PITR Neon actif et testé (restore drill mensuel)
- Monitoring sur 100% des routes API critiques
- Documentation interne complète (chaque module a son README)

#### Niveau 2 : Solidité UX (0 frustration tolérée)

Le Gardien doit pouvoir utiliser Kodo Cards comme il utilise Apple Notes :
intuitif, fluide, sans friction.

- 0 état "vide" non designé (chaque empty state a son illustration + CTA)
- 0 état "loading" non géré (skeletons partout, jamais de spinner moche)
- 0 état "error" non géré (chaque erreur a son message + action de récupération)
- Mobile responsive parfait sur iPhone SE → iPad Pro
- Dark mode complet et testé (Snow+ dark variant)
- Animations 60fps garanties (audit React DevTools Profiler)
- Accessibilité WCAG 2.1 AA (contrastes, ARIA, keyboard nav)
- 0 typo / 0 string en anglais oubliée si UI française
- Microcopy léché sur tous les CTA, modals, toasts

#### Niveau 3 : Solidité produit (0 promesse cassée)

Tout ce qui est annoncé fonctionne à 100%. Pas de "feature en cours",
pas de "beta" dissimulée.

- Tous les features Free fonctionnent sans bug
- Tous les features Pro fonctionnent et apportent la valeur promise
- Pricing graded supprimé proprement (pas de moignon, pas de N/A bizarre)
- Master Sets calcule correctement sur 100% du catalogue (pas de set buggué)
- Export CSV donne un fichier propre, exploitable, parsable
- Email recap arrive vraiment et est lisible (mobile + desktop)
- Onboarding mène à un état utile (premier card ajoutée, pas vide)
- Aucune feature v2/v3 visible sans badge "Bientôt"

#### Niveau 4 : Solidité business (0 ambiguïté sur la valeur)

Un Gardien comprend en 30 secondes pourquoi payer 9,99€/mo.

- Landing page hero claire : "Le Tracker que ta collection mérite"
- Pricing page transparente, sans dark pattern
- Comparison Free vs Pro explicite et juste
- Trial Pro 7 jours sans CB, désabonnement 1-click
- CGV/CGU à jour (rédaction LegalStart ou avocat)
- Conformité RGPD vérifiée (data export + delete fonctionnels)
- Stripe configuration nickel (TVA UE auto, factures conformes)
- Support email <24h (Crisp ou Front gratuit)
- Page roadmap publique honnête (montre v2.0/v3.0 à venir)

#### Le Test Bedrock (à passer avant tout lancement v1.0)

Avant de lancer v1.0 publiquement, on doit pouvoir cocher **TOUTES** ces cases.
**Règle absolue** : si une seule case est non-cochée, on ne lance pas. On itère.

**Niveau Technique** :
- [ ] Lighthouse > 95 sur 10 pages échantillonnées
- [ ] 100 utilisateurs simulés (k6 ou Artillery) tiennent sans dégradation
- [ ] Migration rollback testée en staging avec restore réussi
- [ ] Sentry zéro erreur P50 pendant 7 jours consécutifs
- [ ] Status page publique opérationnelle
- [ ] Backup automatique vérifié (téléchargement test + restore staging)
- [ ] Pas de console.log oublié, pas de TODO/FIXME en code

**Niveau UX** :
- [ ] 5 power users testent sans tutoriel et accomplissent tâche-test "Ajouter 10 cartes + créer wishlist + voir valeur portfolio"
- [ ] Mobile test sur 5 devices réels (iPhone, Android budget, iPad)
- [ ] Dark mode validé pixel-perfect
- [ ] Tour guide testé par 3 non-techniques
- [ ] 0 string anglaise dans UI FR (audit grep complet)
- [ ] Empty states designés (0 carte, 0 wishlist, 0 set, 0 search result)

**Niveau Produit** :
- [ ] 100% catalogue 30k cartes pricé (1 prix unique consensus simple)
- [ ] 0 carte avec prix aberrant > 5× la médiane détecté (audit anomalie)
- [ ] Master Sets calculés correctement sur 50 sets test
- [ ] Export CSV ouvert dans Excel + Google Sheets + Numbers sans corruption
- [ ] Email recap reçu et rendu correctement dans Gmail + Outlook + Mail.app
- [ ] Onboarding complété par 10 testeurs sans aide
- [ ] Audit features v2/v3 fait (liste de tout ce qui doit être masqué/badge)

**Niveau Business** :
- [ ] Stripe testé en production avec carte test puis carte réelle
- [ ] Désabonnement testé et fonctionnel (cancel + reactivate)
- [ ] CGV/CGU/Politique conf en ligne et conformes
- [ ] Page Pricing claire et A/B testée (3 variantes mesurées)
- [ ] Trial Pro 7 jours fonctionnel (auto-conversion + reminder J-2)
- [ ] Factures Stripe conformes (TVA UE, mentions légales FR)
- [ ] Politique de remboursement clarifiée (30 jours satisfait ou remboursé)

#### Planning v1.0 Bedrock (13 semaines, 7 phases)

| Phase | Durée | Activités |
|---|---|---|
| **Phase A** : Audit & cleanup | 2 sem | Audit features v2/v3, masquage propre, audit tech debt, suppression code mort |
| **Phase B** : Features v1.0 build | 4 sem | Polish Holdings, Stripe, Master Sets robust, Email recap, Theme creator |
| **Phase C** : Polish UX | 2 sem | Empty states, loading states, dark mode, accessibilité, microcopy |
| **Phase D** : Tests & QA | 1 sem | k6 load test, Lighthouse audit, 5 power user tests, anomalie audit |
| **Phase E** : Legal & business | 1 sem | CGV/CGU, RGPD audit, Stripe production test |
| **Phase F** : Beta privée finale | 2 sem | 50-200 testeurs invités, feedback loop, hotfix critiques avant launch |
| **Phase G** : Launch v1.0 | 1 sem | Communication multi-canal, monitoring renforcé, support actif J+1 à J+7 |

**Total : 13 semaines = 3 mois** pour livrer v1.0 vraiment Bedrock.

**Justification du planning long** : mieux vaut livrer v1.0 en M+3 et qu'elle
tienne 5 ans, que livrer en M+1.5 et faire du firefighting permanent les mois
suivants. La fondation est ce qui porte toute la trajectoire jusqu'à la Series A.

---

### Standard pour v2.0 et au-delà

Évaluation au cas par cas après livraison v1.0. Hypothèses :
- v2.0 Le Terminal : standard Bedrock potentiellement assoupli sur Niveau 2 (UX
  polish moins critique sur features de niche comme Whale Tracker) mais maintenu
  sur Niveaux 1 et 3 (technique + produit doivent rester impeccables)
- v3.0 L'Oracle : standard Bedrock voire **plus exigeant** sur Niveau 3 (la
  fiabilité du pricing est l'essence du produit Oracle, 0 tolérance sur
  données erronées)
- v4.0 La Plateforme : Bedrock sur Niveau 1 (API publique exige stabilité)
  + Niveau 2 sur mobile app (App Store standards)

Décisions à prendre en début de chaque version, documentées dans un addendum
à ce document.

---

## Réalignement features actuelles avec versioning

La prod actuelle (kodocards.com) mélange des features de v1.0, v2.0, et v3.0.
Pour respecter le principe d'autonomie produit, un **audit + recadrage**
est nécessaire en **Phase A de v1.0**.

### Inventaire features actuelles → versions cibles

| Feature en prod | Version réelle | Action en v1.0 |
|---|---|---|
| Holdings, Master Sets, Wishlist | v1.0 Le Tracker | ✅ Garder, polisher |
| Daily Hub (streaks, XP, missions) | v1.0 Le Tracker | ✅ Garder, recadrer sur Gardien |
| Explorer (recherche carte) | v1.0 Le Tracker | ✅ Garder |
| Spotlight (analyse carte) | v1.0 Le Tracker | ✅ Garder, simplifier pricing |
| Alpha Signals | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Whale Tracker | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Deal Hunter | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Spreads / Sous-évalués | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Dexy AI | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Market Terminal (ticker, indices) | v2.0 Le Terminal | 🔜 Badge "Soon · v2.0" + preview activée |
| Graded prices détaillés (6 graders) | v3.0 L'Oracle | 🔜 Badge "Soon · v3.0" + preview désactivée (qualité insuffisante) |
| Listings actifs eBay (asks) | Bug à corriger | ❌ MASQUER TOTAL (asks pas sold, qualité non acceptable même en preview) |
| Conditions raw (NM/LP/MP/HP/DMG) | v2.0+ | 🔜 Badge "Soon · v2.0" + preview désactivée (simplifier à 1 prix consensus en v1.0) |

### Stratégie "Soon" pour features v2/v3 (DÉCISION ACTÉE)

**Principe** : les features v2 et v3 actuellement en prod **restent visibles**
en v1.0, **avec un badge "Soon" et un petit descriptif** qui annonce la version
cible.

**Aucun masquage**. Cette approche est délibérée :
- Build anticipation pour les traders/investisseurs (capture leads waitlist v2.0)
- Démontre l'ambition produit (Kodo Cards a une roadmap claire)
- Évite la frustration "j'avais cette feature avant, elle a disparu"
- Récupère email pour notifier au launch v2.0/v3.0

### Format du badge "Soon"

Visuellement, chaque feature hors-v1.0 affiche :

```
┌──────────────────────────────────────────────────────────┐
│  Alpha Signals             [SOON · v2.0 Le Terminal]    │
│  ─────────────────────────────────────────────────────  │
│  Détection automatique des cartes sous-évaluées par     │
│  l'IA. Tu reçois un signal d'achat avant le marché.     │
│                                                          │
│  [ Me notifier au lancement → ]                          │
└──────────────────────────────────────────────────────────┘
```

**Éléments du badge** :
- **Pill "SOON · v2.0 Le Terminal"** : couleur distincte (orange Snow+), positionnée en haut à droite
- **Descriptif 1-2 phrases** : explique la value prop concrète de la feature
- **CTA "Me notifier"** : capture email Brevo waitlist version
- **État visuel "locked"** : opacity réduite ou overlay subtil pour différencier des features actives

### Comportement au clic

Quand un user clique sur une feature "Soon" :

**Option preview désactivée** :
- Modal qui s'ouvre avec :
  - Titre : "Alpha Signals · Disponible en v2.0 Le Terminal"
  - Description longue (3-4 phrases) avec usage typique
  - Screenshot/mockup de la feature
  - ETA approximatif : "Lancement prévu en septembre 2026"
  - CTA "Me notifier" → ajout à la liste Brevo "waitlist-v2"
  - Lien vers `/roadmap` publique

**Option preview activée (recommandée pour features quali)** :
- L'user peut voir la feature en lecture seule (peut explorer l'interface)
- Mais les actions critiques (créer alerte, sauvegarder deal, etc.) déclenchent
  la modal "Soon"
- Permet de tester l'UX et susciter l'envie

### Mapping features → traitement Soon

| Feature en prod | Version cible | Descriptif Soon | Comportement |
|---|---|---|---|
| **Alpha Signals** | v2.0 Le Terminal | "Détection IA des cartes sous-évaluées. Tu reçois un signal avant le marché." | Preview activée (voir signals existants en read-only) |
| **Whale Tracker** | v2.0 Le Terminal | "Suis les plus gros collectionneurs européens en temps réel. Vois ce qu'ils achètent." | Preview activée |
| **Deal Hunter** | v2.0 Le Terminal | "Scanner automatique eBay + Cardmarket pour trouver les listings sous valeur marché." | Preview activée (voir 3 deals demo) |
| **Spreads** | v2.0 Le Terminal | "Arbitrage cross-marché US/EU/JP. Trouve les écarts de prix exploitables." | Preview activée |
| **Dexy AI** | v2.0 Le Terminal | "Assistant IA expert TCG. Pose toutes tes questions sur les cartes, prix, gradation, investissement." | Preview activée (5 questions/jour demo) |
| **Market Terminal** (ticker, indices) | v2.0 Le Terminal | "Vue Bloomberg-style du marché : ticker live, top movers, indices propriétaires." | Preview activée (data delayed) |
| **Graded prices détaillés** (PSA/CGC/BGS/SGC/PCA/CCC) | v3.0 L'Oracle | "Prix par grade pour chaque carte, avec score de confiance et POP reports." | Preview désactivée (qualité actuelle insuffisante) |
| **Conditions raw** (NM/LP/MP/HP/DMG) | v2.0+ | "Prix par condition exacte de la carte raw." | Preview désactivée (simplification v1.0 = NM seul) |

**Cas spéciaux à preview désactivée** :
- Les features avec données actuellement non fiables (graded détaillés)
- Les features qui pourraient frustrer si lecture seule mais avec mauvaises données
- → Modal "Soon" + descriptif + capture email uniquement

### Avantages business de cette approche

1. **Capture waitlist** : chaque "Me notifier" cliqué = email Brevo segmenté par version cible. Au launch v2.0, tu as une liste chaude de plusieurs centaines/milliers de personnes.

2. **Validation demande** : compteur de clics "Me notifier" par feature = data précieuse sur ce qui intéresse vraiment les users. Si Deal Hunter a 3× plus de clicks que Whale Tracker → priorité dev v2.0 dans cet ordre.

3. **Signal d'ambition** : un visiteur qui découvre Kodo Cards voit "ce produit a une vision claire et une roadmap exécutée". Différenciateur vs concurrents qui ont juste un MVP.

4. **Effet "tease"** : créer l'envie chez les traders pendant la phase Gardien. Quand v2.0 sort, l'audience est pré-construite.

5. **Pas de breaking change** : un user qui utilisait Alpha Signals en beta continue de voir l'UI. La transition vers "Soon" est moins brutale que la disparition pure.

### Audit technique nécessaire (Phase A de v1.0)

Au lieu de "masquer", on doit "wrapper" les features hors-v1.0 :

| Fichier / Zone | Action |
|---|---|
| `src/lib/constants/navigation.ts` | Ajouter flag `availableIn: 'v1.0' \| 'v2.0' \| 'v3.0'` par entrée |
| `src/lib/constants/feature-flags.ts` | Nouveau fichier listant chaque feature avec son metadata Soon |
| `SubMenu.tsx` | Render badge "Soon" sur entries non-v1.0 |
| Drawer Holdings (`SpotDrawer.tsx`) | Wrap `ConditionPriceTable` + `GradedPriceTable` dans `<SoonOverlay />` |
| Drawer Encyclopedie | Idem |
| Daily Hub | Sections Alpha/Whale/Deal Hunter avec badge "Soon" inline |
| `/market/*` routes | Restent accessibles mais avec banner "Soon · v2.0" en haut |
| `/alpha/*` routes | Idem |
| Spotlight | Bloc pricing avec disclaimer "Détail par grade disponible en v3.0 L'Oracle [En savoir plus →]" |
| Composant `<SoonBadge />` | Nouveau composant Snow+ réutilisable |
| Composant `<SoonModal />` | Modal réutilisable avec descriptif + CTA notifier |
| API route `/api/waitlist/subscribe` | Endpoint pour ajouter email à liste Brevo segmentée |

### Composant `<SoonBadge />` spec

```tsx
interface SoonBadgeProps {
  version: 'v2.0' | 'v3.0' | 'v4.0';
  versionName: string;  // "Le Terminal", "L'Oracle", etc.
  featureName: string;
  description: string;
  previewEnabled: boolean;
  eta?: string;  // "Septembre 2026"
}

<SoonBadge
  version="v2.0"
  versionName="Le Terminal"
  featureName="Alpha Signals"
  description="Détection IA des cartes sous-évaluées..."
  previewEnabled={true}
  eta="Septembre 2026"
/>
```

Snow+ design : pill orange avec icône clock, hover → tooltip avec ETA, click → modal détaillée.

Cette audit est la **première activité de Phase A de v1.0** et conditionne
tout le reste.

### Statut
**Beta privée fermée** · Accès sur invitation uniquement · 2-3 semaines

### Objectif
Pas un produit commercial. Une **phase de validation** avant de lancer v1.0 Le Tracker. Recruter 50-200 beta testeurs FR engagés pour valider la stabilité du Tracker, identifier les bugs critiques, et créer une première communauté.

### Pour qui ?
Communauté FR existante d'Alon (Discord, réseau perso, ambassadeurs identifiés). Pas de marketing public, pas de pricing.

### Le produit en v0.9

Tout ce qui existe en prod aujourd'hui sur kodocards.com, sans tier payant, avec un disclaimer beta visible. Les features sont là, mais pas "marketées" comme produit fini.

**Limitations explicites communiquées** :
- Bugs en cours de correction
- Pricing graded non fiable (asks eBay, sera retiré en v1.0)
- Pas encore d'onboarding propre
- Stabilité non garantie

### Que faut-il faire ?

v0.9 applique le standard **Infrastructure Solide** détaillé dans la section
"Standards de qualité" plus haut. Les 4 piliers infrastructure (Auth, DB,
Pipeline, Storage) doivent être validés avant ouverture beta.

Voir checklist v0.9 complète dans la section Standards. Résumé effort :

| Activité | Effort |
|---|---|
| Audit infrastructure (auth + DB + pipeline + storage) | 3-4 jours |
| Fix bugs critiques (JP dropdown, Daily Hub) | 1 jour |
| Page `/beta` + Discord + Brevo | 1 jour |
| Tests de charge + monitoring setup | 1-2 jours |
| Outreach ambassadeurs | continu |

**Total** : ~2 semaines de dev concentrées + outreach continu.

Note importante : v0.9 garde les features v2/v3 visibles (Alpha Signals, Whale
Tracker, etc.) puisque c'est une beta privée et les testeurs sont prévenus.
Le masquage propre se fait en début de v1.0 Phase A.

### Pricing v0.9
**Aucun**. Tout est gratuit, accès limité par invitation.

Promesse aux beta testeurs : "Tu garderas 50% de réduction à vie sur Pro v1.0 si tu restes actif pendant la beta."

### Success criteria v0.9

| Métrique | Cible |
|---|---|
| Beta testeurs invités | 50-200 |
| DAU/MAU ratio | > 30% |
| Bugs P0 identifiés et corrigés | 10+ |
| Feedback features remontées | 20+ |
| NPS preview | > 30 |

### Durée totale
**2 semaines** d'audit infrastructure + bug fixes + community setup.

À l'issue de v0.9, les 4 piliers infrastructure (Auth, DB, Pipeline, Storage)
doivent être validés selon la checklist Infrastructure Solide. Cela conditionne
le démarrage de v1.0.

---

## v1.0 — Le Tracker

### Promesse complète

> *"L'outil de référence pour gérer ta collection Pokemon TCG en français. Ajoute tes cartes, organise-les, suis leur valeur, progresse vers tes goals de complétion."*

### Statut
**Public · Premier produit commercial** · Lancement officiel

### Pour qui ?

**Le Gardien** (collectionneur passionné). C'est la **seule cible** v1.0. On ne parle pas aux traders ni aux investisseurs encore.

Caractéristiques de la cible :
- 1500-5000€ budget annuel
- Cherche à compléter des sets / master sets
- Veut suivre la valeur sentimentale et financière de sa collection
- Tient son catalogue actuellement sur Excel ou apps basiques
- Utilise Pokécardex ou Cardmarket pour les données

### Le produit complet livré

#### Gestion de collection

- **Ajout de cartes** par recherche full-text, scan code-barres (PWA), ou import CSV
- **Organisation en binders** : 3, 4, 5, ou 6 colonnes au choix
- **Conditions par carte** : NM / LP / MP / HP / DMG ou Graded (avec grader + grade)
- **Quantités multiples** par carte avec différentiation condition
- **Notes personnelles** par carte
- **Tags personnalisés** (ex: "à vendre", "à garder", "à grader", "cadeau papy")
- **Statut** vendable / non-vendable par carte

#### Visualisation collection

- **Valeur totale** du portfolio en EUR (mise à jour quotidienne)
- **Répartition** par set, par langue, par rareté (charts)
- **Top 10** cartes les plus valuables
- **Évolution** de la valeur sur 30/90/365 jours
- **Performance** vs moyenne marché

#### Suivi de complétion (Master Sets) — feature signature v1.0

- **Tracking** pourcentage par set
- **Cartes manquantes** listées avec prix actuel
- **Wishlist** auto-générée depuis les manquantes
- **Badges** de complétion (50%, 75%, 100%, Master)
- **Sets recommandés** à compléter (proches de 90%)
- **Coût estimé** pour compléter chaque set

#### Pricing simple et honnête

- **1 prix unique par carte** : consensus simple (moyenne Cardmarket EU + eBay sold US via PokeTrace)
- Mise à jour quotidienne
- Disclaimer transparent : "Prix indicatif, marché volatile"
- **Pas de bloc graded mensonger** : si data insuffisante, message "Prix gradé en cours de calcul — détail complet arrive en v3.0 Oracle"

#### Alertes basiques

- Alerte prix sur cartes en wishlist (-X% configurable)
- Email hebdomadaire : top movers de ta collection
- Récap mensuel : valeur portfolio + progression goals

#### Daily Hub adapté Gardien

- Streak quotidien (motivation collectionneur)
- XP / badges progression
- "Card of the day" suggérée selon ses goals
- Top movers de **sa collection** (pas du marché global)

#### Données disponibles

- **Catalogue** : 30 000+ cartes EN/FR/JP indexées
- **Prix raw** Cardmarket EU quotidien (toutes langues EU)
- **Prix raw** eBay sold US via PokeTrace
- **Pas de prix graded affiché** (assumé et expliqué)
- **Images** R2 Cloudflare haute qualité

### Tier Pro v1.0 (9,99€/mo)

Le Pro v1.0 doit **avoir du sens en v1.0**, pas pour une feature future. Il débloque :

- **Collections illimitées** (Free = 1 binder, Pro = illimité)
- **Cartes illimitées** (Free = 500 cartes max, Pro = illimité)
- **Wishlists illimitées** (Free = 1, Pro = illimité)
- **Alertes prix illimitées** (Free = 3, Pro = illimité)
- **Export CSV** complet du portfolio (et import enrichi)
- **Historical chart** sur ta collection (Free = current value only)
- **Multi-currency display** (Free = EUR only, Pro = EUR/USD/JPY/GBP)
- **Recap email quotidien** (Free = hebdo)
- **Theme customization** (5 thèmes Free, créer son propre thème Pro)
- **Discord Pro role** : channels privés
- **Statut "Founding Member"** pour les 200 premiers

**Promesse Pro v1.0** : *"Aucune limite pour gérer ta collection."*

### Tier Beta Lifetime (4,99€/mo à vie)

Réservé aux beta testeurs v0.9. Toutes features Pro. Badge "Founding Member" visible.

### Ce qui n'est PAS dans v1.0 (clairement communiqué)

- ❌ Pas d'Alpha Signals → arrive en v2.0
- ❌ Pas de Whale Tracker → arrive en v2.0
- ❌ Pas de Deal Hunter → arrive en v2.0
- ❌ Pas de prix par grade détaillé → arrive en v3.0
- ❌ Pas de Reprint Risk / Grade-or-Sell → arrive en v3.0
- ❌ Pas de prédictions ML → arrive en v4.0
- ❌ Pas d'app mobile native → arrive en v4.0

Cette transparence est **un atout marketing**, pas un défaut. Le user qui veut trader sait qu'il faut attendre v2.0 et peut s'abonner à la waitlist.

### Que faut-il construire ?

v1.0 applique le standard **Bedrock** détaillé dans la section "Standards de
qualité" plus haut. **13 semaines en 7 phases**, aucun compromis sur les
4 niveaux d'exigence (Technique, UX, Produit, Business).

**Phases A à G** (détail dans section Standards Bedrock) :

| Phase | Durée | Focus |
|---|---|---|
| **Phase A** Audit & cleanup | 2 sem | Masquer features v2/v3, recadrer prod sur Gardien |
| **Phase B** Features v1.0 build | 4 sem | Polish Holdings, Stripe, Master Sets, Email, Theme |
| **Phase C** Polish UX | 2 sem | Empty/loading/error states, dark mode, a11y, microcopy |
| **Phase D** Tests & QA | 1 sem | Load tests, Lighthouse, power user tests, anomalie audit |
| **Phase E** Legal & business | 1 sem | CGV/CGU, RGPD, Stripe prod test |
| **Phase F** Beta privée finale | 2 sem | 50-200 testeurs, feedback loop, hotfix critiques |
| **Phase G** Launch v1.0 | 1 sem | Communication multi-canal, monitoring renforcé, support actif |

**Total** : 13 semaines = 3 mois.

**Le Test Bedrock complet** doit être passé avant ouverture publique. Voir
checklist 4 niveaux (Technique / UX / Produit / Business) dans section
Standards. Une seule case non-cochée = on ne lance pas.

### Pricing structure complète v1.0

```
Free            0€/mo       Gardien découverte (limites raisonnables)
Pro             9,99€/mo    Gardien sérieux (no limits)
Pro Annual      99€/an      Pro -17%
Beta Lifetime   4,99€/mo    Récompense beta testeurs v0.9
```

### Stratégie acquisition v1.0

- **Discord Kodo Cards** : croissance organique depuis beta
- **Newsletter Brevo** : 2/mois avec recap marché collectionneurs
- **Blog SEO** : 1 article/sem sur recherches collectionneurs ("Combien vaut un Dracaufeu Base Set ?", "Comment commencer le Master Set Base Set ?", etc.)
- **YouTube** : 1 vidéo/2 sem "Le mois du collectionneur Pokemon"
- **TikTok** : 3 vidéos/sem démos features Tracker
- **Micro-influenceurs FR** : 5 partenariats avec ambassadeurs identifiés (Lucas TCG, Atomik 7, Jakson Cards, etc.)
- **Pages SEO partageables** : chaque carte = 1 page indexable Google
- **Embeddable widget** : "Ajoutez le prix Kodo Cards à votre blog" (viralité)

### Success criteria v1.0

| Métrique | Cible |
|---|---|
| Users inscrits cumulés | 1500 |
| DAU | 350 |
| Pro users | 60 |
| Beta Lifetime actifs | 50 |
| MRR | 600€ (60 × 9,99€) + 250€ (50 × 4,99€) = 850€ |
| NPS | > 50 |
| Discord membres | 600 |
| Conversion Free → Pro | > 4% (Gardien serious convertit bien) |
| Churn Pro mensuel | < 8% |
| Pages indexées Google | 15 000+ |

### Pourquoi ces cibles ?

- **4% conversion** : un Gardien avec 2000 cartes paye 9,99€/mo sans hésiter pour les collections illimitées et l'export CSV. C'est une utility réelle.
- **NPS > 50** : on parle à un seul persona, avec une promesse précise. Le NPS doit être très bon.
- **Churn < 8%** : un collectionneur ne quitte pas son outil de gestion sans raison.

### Durée totale
**13 semaines** de prépa Bedrock (Phases A→G) + **3 mois** de croissance commerciale post-launch.

Mieux vaut livrer v1.0 en M+3 et qu'elle tienne 5 ans que livrer en M+1.5 et
faire du firefighting permanent. La fondation porte toute la trajectoire
jusqu'à la Series A.

---

## v2.0 — Le Terminal

### Promesse complète

> *"Le terminal de trading Pokemon TCG. Identifie les opportunités d'arbitrage, suis les baleines, reçois des signaux d'achat, et gère ta thèse d'investissement."*

### Statut
**Public · Deuxième produit commercial · Le Tracker continue d'exister**

### Pour qui ?

**Le Chasseur** (trader opportuniste) + **La Baleine** (investisseur long terme).

Le **Gardien** existant garde son v1.0 boosté avec les améliorations transverses (pricing meilleur, Daily Hub plus riche). Il n'est pas forcé d'utiliser Le Terminal.

Caractéristiques des cibles :
- Chasseur : 5000-20000€ budget, ROI court terme, prêt à payer pour la vitesse
- Baleine : 5000€+/an, gestion d'actifs long terme, cherche outils professionnels

### Le produit complet livré

**Tout v1.0 conservé et amélioré** (collection management toujours premier-tier, Gardien ne perd rien).

#### Market Intelligence

- **Market Terminal** : ticker live, top movers temps réel, layout Bloomberg-style
- **4 indices** propriétaires : Vintage US, Modern FR, Modern EN, Japan
- **Heatmap des sets** : performance 7d/30d/90d en couleurs
- **Volume tracker** : cartes les plus échangées
- **Liquidity Score** par carte (0-100)

#### Alpha Signals — feature signature v2.0

- **Détection automatique** cartes sous-évaluées
- **Scoring S/A/B** avec confidence percentage
- **Raison du signal expliquée** (gap CM EU vs eBay US, etc.)
- **Historique des signals** avec performance trackée (post-hoc validation)
- **Notifications push** (Pro) ou email digest (Free)
- **Filter** par tier, par set, par langue, par budget

#### Deal Hunter

- **Scanner eBay + Cardmarket** en continu
- **Listings sous valeur marché** identifiés
- **Filtres avancés** (Pro) : condition, vendeur feedback, langue, set, prix max
- **Estimateur ROI net** (post-fees + shipping)
- **Save deals** for later, marquer comme suivi

#### Spreads (arbitrage cross-market)

- **Comparaison** US vs EU vs JP par carte
- **Détection écarts** > 15% avec liquidité confirmée
- **Scoring de l'opportunité** (gap × liquidity × time-to-arbitrage)
- **"Pour toi" personnalisé** selon ton portfolio

#### Whale Tracker

- **10+ whales** européens/US trackés
- **Mouvements en temps réel** observés
- **Composition** de leurs portfolios (estimée)
- **"Whale Signal"** auto-généré quand un mouvement détecté
- **Custom whale lists** (Premium si tier lancé)

#### Pricing v2.0 (amélioré vs v1.0)

- **5 conditions raw exposées** (NM/LP/MP/HP/DMG) avec prix par condition
- **Bloc graded général** v2.0 : un seul prix "Graded (toutes notes confondues)" basé sur les sold confirmés via PokemonPriceTracker
- **Disclaimer "Détail par grade arrive en v3.0 - Oracle"**
- **Confidence indicator simple** (basé sur sample size)

#### Dexy AI v2

- **Trading-aware** : peut analyser un Deal Hunter listing et donner verdict
- **Investment-aware** : peut expliquer un Alpha Signal en thèse
- **Comparative analysis** : comparer 2 cartes en investment thesis

#### Données disponibles en v2.0

- Cardmarket EU (raw, holo, reverse) — quotidien
- eBay sold US via PokeTrace
- eBay sold premium via PokemonPriceTracker (graded général)
- Limitless TCG (tournament impact via meta share)
- Whale Tracker observations propriétaires
- Indices market_indices_v1 propriétaires

### Tier Pro v2.0 (toujours 9,99€/mo, valeur ×3 depuis v1.0)

- **Tout Pro v1.0**
- **Alpha Signals illimités** (Free = 1/jour visible, Pro = tous)
- **Deal Hunter accès complet** (Free = 3 deals/jour, Pro = illimité)
- **Whale Tracker complet** (Free = 1 whale, Pro = toutes + custom lists)
- **Notifications push instantanées** (Free = digest email quotidien)
- **Filtres avancés** sur Deal Hunter et Spreads
- **Spreads "Pour toi"** personnalisé selon portfolio
- **Dexy AI illimité** (Free = 10 questions/jour)
- **Export Alpha Signals history** CSV
- **Discord Pro Plus** : channels stratégie privés + 1 call/mois avec Alon

**Promesse Pro v2.0** : *"Tu vois ce que les autres ne voient pas."*

### Tier Premium v2.0 (19,99€/mo) — *optionnel, à tester*

Lancement uniquement si v2.0 montre forte demande Pro et upsell pull-from-users. Sinon on garde Pro unique tier jusqu'en v3.0.

Contenu si lancé :
- **Real-time pricing** (Pro = updates toutes les 15min, Premium = instantané)
- **Custom alerts** ultra-précises (Pro = conditions standards, Premium = combiner critères)
- **Priority Dexy AI** (queue faster)
- **Early access** features v3.0

### Ce qui n'est PAS dans v2.0 (clairement communiqué)

- ❌ Pas de prix par grade détaillé → v3.0
- ❌ Pas de Grade-or-Sell Calculator → v3.0
- ❌ Pas de Reprint Risk Indicator → v3.0
- ❌ Pas de POP reports affichés → v3.0
- ❌ Pas de couverture Mercari/Yahoo JP native → v3.0
- ❌ Pas de prédictions ML → v4.0
- ❌ Pas d'app mobile native → v4.0
- ❌ Pas d'API publique → v4.0

### Que faut-il construire ?

| Tâche | Effort |
|---|---|
| Inngest setup + migration crons stable | 1 sem |
| Phase 1 PokemonPriceTracker (graded général v2.0) | 1 sem |
| Phase 11 (partial) — Observability complète | 1 sem |
| Refonte Market Terminal + indices (UI Bloomberg-style) | 2 sem |
| Alpha Signals engine v2 avec scoring | 2 sem |
| Deal Hunter avec filtres avancés | 2 sem |
| Spreads avec "Pour toi" personnalisé | 1 sem |
| Whale Tracker custom lists | 1 sem |
| Dexy AI v2 prompts (trading-aware) | 3 jours |
| Push notifications (PWA) | 3 jours |
| Polish UX cross-features | 1 sem |
| Marketing assets v2.0 (positionnement Le Terminal) | 1 sem |

**Total** : ~12 semaines = 3 mois de travail.

### Stratégie acquisition v2.0

- **Repositionnement marketing** : ajout d'une page produit "Le Terminal" sur kodocards.com
- **Communication massive aux users v1.0** : "Vous avez Le Tracker, voici Le Terminal en complément"
- **Content axé trading** : "Comment j'ai fait 500€ en 24h avec un Alpha Signal Kodo Cards" (testimonials)
- **Reddit/Discord traders** : présence active sur r/PokemonTCG_Investing et serveurs trading
- **Webinaire mensuel** : "Trading Pokemon TCG - Analyse marché live"
- **Partenariats** avec influenceurs trading TCG (différents de ceux du Tracker)

### Success criteria v2.0

| Métrique | Cible |
|---|---|
| Users inscrits cumulés | 6000 |
| DAU | 1600 |
| Pro users | 300 |
| Premium users (si lancé) | 30 |
| MRR | 3000€ Pro + 600€ Premium = 3600€ |
| Churn Pro | < 10% |
| NPS | > 55 |
| Alpha Signal click-through | 15%+ |

### Durée totale
**12 semaines** de dev + **5 mois** de croissance jusqu'à v3.0.

---

## v3.0 — L'Oracle

### Promesse complète

> *"L'oracle de pricing du marché Pokemon TCG. Connais le vrai prix de chaque carte, dans chaque condition, à chaque grade, avec un score de confiance transparent. Prends des décisions de gradation, d'achat et de vente avec la précision d'un fonds professionnel."*

### Statut
**Public · Troisième produit commercial · Le Tracker + Le Terminal continuent d'exister**

### Pour qui ?

**Le Grading Hunter** (arbitrage de gradation) + **Le Seller** (revendeur professionnel) + **La Baleine premium** (investisseur sophistiqué).

Les Gardiens et Chasseurs continuent d'utiliser leurs tiers, avec un upsell possible vers Premium pour accéder à Grade-or-Sell.

Caractéristiques des cibles :
- Grading Hunter : 3000-10000€ budget, recherche ROI de gradation, technique
- Seller : 50k-200k€ CA, besoin source de vérité pour business
- Baleine premium : exige rigueur financière professionnelle

### Le produit complet livré

**Tout v2.0 conservé et amélioré** (Terminal + Tracker toujours premier-tier).

#### Le shift majeur : Pricing Oracle propriétaire

- **Multi-source consensus** : chaque prix est calculé sur 6-8 sources avec algos VWAP + MAD + decay exponentiel
- **Confidence score 0-100 affiché** : transparence totale sur la fiabilité
- **Multi-source breakdown** : drawer card montre quelles sources ont contribué et combien
- **Historical chart avec sold data** : graphes 90j/1y/All avec vraies ventes (pas asks)
- **Sample size transparency** : "Basé sur 47 ventes 30 derniers jours, 4 sources concordantes"
- **Source health indicator** : badges live/delayed sur chaque source dans le drawer

#### Pricing par grade complet (nouveau majeur)

- **9 graders supportés** : PSA, BGS, CGC, SGC, ACE, TAG, PCA, CCC, MNT
- **Prix par grade** (10, 9.5, 9, 8.5, 8, etc.) avec couleurs distinctives
- **Sub-grades** quand pertinent (PSA 10 Black Label, BGS Pristine, PSA OC)
- **POP reports** affichés (rareté du grade observée)
- **Évolution prix** par grade dans le temps (graphiques séparés)

#### Couverture EU/FR via Cardmarket API officielle

- **100% catalogue** couvert (vs 60-70% en v2.0)
- **Données officielles** (Price Trend, AVG30, AVG7, AVG1)
- **Conformité légale totale** (API officielle, pas scrape)
- **Latence améliorée** (refresh 6h au lieu de 24h)

#### Card Variants propre

- **1st Edition, Shadowless, Unlimited, Reverse Holo** détectés automatiquement
- **Cosmos Holo, Crystal Holo, Master Ball Holo** séparés
- **Stamps** (Pre-release, Staff, Championship, Pokemon Center)
- **Errors et signatures** comme variants distincts avec pricing dédié

#### Features collectible-specific (les killer features v3.0)

**1. Grade or Sell Calculator** (Premium-only)
- Input : carte raw + condition + grader cible
- Output : probabilité par grade (PSA 10 / 9 / 8 / lower) basée sur POP
- Coûts (envoi + grading + commission revente) inclus
- ROI net en € avec verdict "Grade", "Sell raw", "Hold"

**2. Cross-Grader Equivalence**
- Table dans drawer : PSA 10 = 14000€ · BGS 9.5 = 11000€ · CGC 10 = 9500€
- Permet arbitrage cross-grader pour les Hunters

**3. Reprint Risk Indicator**
- Badge vert/orange/rouge sur chaque carte
- Tooltip explicatif : "Set vieux de 7 ans, anniversaire dans 18 mois → 72% risk"
- Mise à jour dynamique avec annonces officielles Pokemon Company

**4. POP Reports intégrés**
- Scarcity multiplier auto-appliqué au pricing
- POP visible dans drawer card
- Time-series POP (évolution sur 12 mois) avec graphique

**5. Master Set Completion Bonus** (le Bonus existait, maintenant pricé)
- Bonus prix sur les dernières 5% de cartes manquantes
- Calculé via observation marché (cartes complétant un set vendent +20-300%)

**6. Lifecycle Phase Indicator**
- Badge `RELEASE PEAK` / `CRASH` / `FLOOR` / `RECOVERY` / `MATURE` / `LEGACY`
- Graphique de la courbe attendue + position actuelle

**7. Buylist Optimizer** (Pro+)
- Calcul prix d'achat optimal avec marge cible
- Export CSV pour TPV des sellers
- Configuration marge cible par set/rareté

#### Couverture JP native (nouveau)

- **Mercari JP + Yahoo Auctions JP** intégrés
- **Vraies ventes JP** (pas via eBay US listings)
- **Cartes Pokemon Center exclusives** trackées
- **Yahoo Auctions** pour vintage JP rare

#### KCI — Kodo Card Index (nouveau)

- **5 indices propriétaires** : Global, Vintage, Modern, Japan, Sealed
- **Le "S&P500 du Pokemon"**
- **Hero metric** Daily Hub
- **Page dédiée** `/market/indices/kci` avec historique long-terme
- **Customisation Premium** : créer ton propre KCI

### Tier Pro v3.0 (toujours 9,99€/mo, valeur ×6 depuis v1.5)

- **Tout Pro v2.0**
- **Buylist Optimizer**
- **Multi-currency advanced** (EUR/USD/JPY/GBP/CAD)
- **Pricing history extended** (5 ans vs 1 an Free)
- **Confidence score detailed breakdown**
- **POP reports access full** (Free = top 100 cards only)
- **Cross-Grader Equivalence**
- **Lifecycle Phase Indicator** détaillé

### Tier Premium v3.0 (19,99€/mo) — désormais justifié

- **Tout Pro**
- **Grade or Sell Calculator** (la killer feature Premium)
- **Custom KCI indices** (créer ton propre indice)
- **API access limited** (10k req/mois)
- **Real-time pricing instant** (vs 15min Pro)
- **Premium reports mensuels** PDF inclus (sinon 19€/issue)
- **Calls 1:1 avec Alon** (1×/trimestre)
- **Discord Premium private** : focus group, accès direct roadmap
- **Tournament Impact Alerts** custom
- **Anomaly detection** (mouvements suspects flaggés)

### Tier B2B v3.0 (299€/mo) — nouveau

Pour les boutiques :
- **Tout Premium**
- **Multi-user** (jusqu'à 5 comptes)
- **API access étendu** (100k req/mois)
- **Buylist export** automatique programmable
- **White-label dashboard** simple
- **Support email prioritaire**
- **Données conditions** (NM/LP/MP/HP/DMG) en API
- **Contrat annuel** avec SLA

### Ce qui n'est PAS dans v3.0 (clairement communiqué)

- ❌ Pas d'app mobile native → v4.0
- ❌ Pas de prédictions ML publiques → v4.0
- ❌ Pas d'API publique full → v4.0
- ❌ Pas de scan caméra carte → v4.0
- ❌ Pas de white-label cross-game (Lorcana, OPCG) → v4.0+

### Que faut-il construire ?

| Tâche | Effort |
|---|---|
| Phase 0 Foundation (TimescaleDB + 10 tables) | 1 sem |
| Phase 3 Cardmarket API officielle (setup OAuth + adapter) | 2 sem |
| Phase 4 Oracle Engine v1 (VWAP + MAD + Confidence) | 2 sem |
| Phase 5 Card Variants schema enrichi | 2 sem |
| Phase 8 PSA Public API + POP reports | 1 sem |
| Phase 6 Apify eBay sold pipeline | 1 sem |
| Phase 7 Mercari + Yahoo JP pipeline | 2 sem |
| Phase 12 Collectible Features Pack 1 (Reprint Risk, Lifecycle, Fake Risk) | 2 sem |
| Phase 13 Collectible Features Pack 2 (Grade-or-Sell, Cross-Grader, Master Set Bonus) | 2 sem |
| Phase 14 KCI & Market Indices V2 | 1 sem |
| Phase 9 Limitless TCG + Tournament Impact | 1 sem |
| B2B tier setup (multi-user, API limited) | 1 sem |
| Migration UX + whitepaper + communication massive | 2 sem |

**Total** : ~18 semaines = 4-5 mois de travail.

### Stratégie acquisition v3.0

- **Whitepaper public** : "How Kodo Cards Pricing Oracle Works" (PDF asset SEO + PR)
- **Comparison page** : Kodo Cards vs PriceCharting vs Cardmarket Trend (montrer la supériorité technique)
- **Conférence/talk** : Paris Games Week, FIJM, meetup TCG FR
- **Podcast guest spots** : Pokebip Show, Plomb Foudre, podcasts Trading FR
- **Reddit AMA** : "I built Kodo Cards Oracle, ask me anything"
- **B2B outreach direct** : 50 boutiques FR contactées
- **Programme ambassadeurs** : 10 Pro/Premium users les plus engagés deviennent "Kodo Card Insiders"

### Success criteria v3.0

| Métrique | Cible |
|---|---|
| Users inscrits cumulés | 15000 |
| DAU | 4500 |
| Pro users | 900 |
| Premium users | 150 |
| B2B contracts | 5 |
| MRR | 9000€ Pro + 3000€ Premium + 1500€ B2B = 13500€ |
| Churn Pro | < 7% |
| NPS | > 60 |
| Couverture pricing top 5k cartes | > 95% |
| Confidence moyenne | > 70 |

### Durée totale
**18 semaines** de dev + **8 mois** de croissance jusqu'à v4.0.

---

## v4.0 — La Plateforme

### Promesse complète

> *"L'infrastructure du marché Pokemon TCG. Accède aux prédictions ML, utilise l'app mobile native, connecte ton business via API. Prends part à un écosystème complet : collectionneurs, traders, boutiques, fonds, plateformes."*

### Statut
**Public · Forme finale du produit · Infrastructure de référence**

### Pour qui ?

Tous les personas existants + **Développeurs** + **Fonds collectibles** + **Plateformes concurrentes** (via white-label) + **Boutiques avancées**.

### Le produit complet livré

**Tout v3.0 conservé et amélioré** (Oracle + Terminal + Tracker maintenus à leur meilleur niveau).

#### AI/ML Layer activé

- **Predicted Fair Value** (Premium) : "Predicted 30d: 14500€ (vs current 11200€)" → undervalued signal
- **Time-series Forecasting** : prédictions 7d/30d/90d sur top 1000 cartes
- **Anomaly Detection** : auto-flag mouvements suspects (wash trades, data quality issues)
- **AI Title Parser** : Claude Haiku transforme tout listing eBay/Mercari en variant structuré (precision 95%+)
- **Card Similarity Embeddings** : pricing initial des nouveautés basé sur cartes similaires
- **Sentiment analysis** sur Reddit/TikTok/YouTube

#### Mobile native

- **App iOS + Android** (React Native ou Flutter)
- **Scan caméra carte** : ajoute au portfolio en photographiant (effet wow massif)
- **Push notifications native**
- **Offline mode** (portfolio consultable sans connexion)
- **Apple Wallet integration** (sealed products comme passes)
- **Apple Watch companion** (alertes prix au poignet)

#### Real-time everywhere

- **WebSocket live pricing** via Pusher Channels
- **Live ticker** sur Market Terminal
- **Live whale moves**
- **Live Alpha Signals**
- **No refresh nécessaire**, tout update en temps réel

#### Social Momentum complet

- **TikTok + Reddit + YouTube tracking** actif
- **Influencer detection** (Logan Paul, Rudy Ayoub, influenceurs FR)
- **Social adjustment** intégré dans le consensus
- **"Trending now" section** dans Daily Hub avec social pulse

#### Tournament Impact mature

- **Limitless TCG real-time**
- **Auto-detection** des cartes du deck gagnant
- **Alerts personnalisées** si portfolio impacté
- **Meta archetype tracking** avec part de play %

#### API publique B2B

- **`api.kodocards.com`** documenté publiquement
- **4 tiers d'API** :
  - **Free dev** : 1000 req/jour
  - **Starter** : 99€/mo, 50k req/mois (boutiques petites)
  - **Pro** : 299€/mo, 500k req/mois (boutiques moyennes)
  - **Enterprise** : sur devis (boutiques grandes, fonds, plateformes)
- **SDK officiels** : JavaScript, Python, PHP
- **Webhooks** pour événements (price change, alpha signal, whale move)
- **GraphQL endpoint** alternative

#### White-label exploratoire

- **Conversations actives** avec partenaires Lorcana / One Piece TCG
- **Architecture game-agnostic** confirmée et testée
- **Premier deal** signé probablement en v4.1 ou v4.2

### Tiers v4.0 (structure finale)

```
Free               0€/mo       Hook collectionneur (limites raisonnables)
Pro                9,99€/mo    Power collectionneur + trader light
Premium            19,99€/mo   Power trader + investisseur sérieux  
B2B Starter        99€/mo      API + dashboard léger (boutiques petites)
B2B Pro            299€/mo     API étendue + multi-user (boutiques moyennes)
B2B Enterprise     Sur devis   Custom (fonds, plateformes, white-label)
```

### Promesse Premium v4.0
> *"Tu accèdes à des prédictions ML avant les autres."*

### Promesse B2B v4.0
> *"L'infrastructure pricing de ton business."*

### Que faut-il construire ?

| Tâche | Effort |
|---|---|
| Phase 16 AI Title Parser (Claude Haiku) | 1 sem |
| Phase 17 Forecasting ML (Prophet/Modal) | 3 sem |
| Phase 18 Anomaly detection (Isolation Forest) | 1 sem |
| Phase 19 Real-time push WebSocket (Pusher) | 2 sem |
| Phase 15 Social Momentum complet | 2 sem |
| Mobile app native (React Native ou Flutter) | 8 sem |
| API publique + docs + SDK | 4 sem |
| Apple Wallet + push notifications native | 2 sem |
| Phase 11 Observability full + Better Stack paid | 1 sem |
| White-label architecture validation | 2 sem |
| Marketing Series A + pitch deck v4 | 2 sem |

**Total** : ~26 semaines = 6-7 mois.

Probablement avec aide externe à ce stade (CTO ou freelance React Native).

### Stratégie acquisition v4.0

- **Mobile app launch** : campagne dédiée TestFlight beta puis App Store / Play Store
- **API publique launch** : Hacker News, Product Hunt, Dev.to
- **B2B sales scaled** : commercial dédié pour boutiques + fonds
- **Series A pitch** : Kima Ventures, eFounders, Otium Capital, Daphni
- **Cross-game teasing** : annonces Lorcana / OPCG en preview
- **Press tier 1** : Numerama, Frandroid, BFM Tech, Les Echos

### Success criteria v4.0

| Métrique | Cible |
|---|---|
| Users inscrits cumulés | 35000 |
| DAU | 9000 |
| Pro users | 2800 |
| Premium users | 500 |
| B2B contracts | 15 |
| MRR total | 28000€ + 10000€ + 4500€ = 42500€ |
| ARR | 510k€ |
| Mobile app installs | 8000 |
| Devs registered API | 200 |
| Levée OU profitabilité | Choix stratégique |

### Diversification revenue détaillée v4.0

| Source | MRR |
|---|---|
| Pro subscriptions (2800 × 9,99€) | 28000€ |
| Premium subscriptions (500 × 19,99€) | 10000€ |
| B2B subscriptions (15 contrats moyens) | 4500€ |
| Affiliate eBay/Cardmarket | 2000€ |
| Premium reports PDF | 1000€ |
| API access (devs payants) | 1000€ |
| **Total MRR** | **46500€** |
| **ARR** | **558k€** |

### Stratégie Series A

- **Metrics required** : 30000+ users, 2500+ Pro, 25000€+ MRR, croissance > 15%/mo
- **Investisseurs ciblés** : eFounders, Kima Ventures, Otium Capital, Daphni
- **Use of funds** : équipe (CTO + Growth + Designer), expansion EU étendue, mobile app native polish, marketing
- **Range tour** : 500k-1M€ seed extended ou pre-Series A
- **Pitch deck v4** : metrics + moat data + diversification + roadmap cross-game

### Durée totale
**26 semaines** de dev étalées sur 6-7 mois.

---

## Principes de versioning

### Règles fondamentales

1. **Chaque version est un produit complet et autonome** sur son scope. Si le développement s'arrête, le produit existe.

2. **Une version = une promesse unique** clairement formulable en une phrase.

3. **Le tier payant a du sens dans la version courante**, pas dans une future hypothétique.

4. **Communication transparente** sur ce qui n'est PAS dans la version (les ❌). C'est un atout marketing.

5. **Grandfathering systématique** : tout user qui souscrit à un tarif le **conserve à vie** tant qu'il maintient son abonnement actif.

6. **Itérer sous le regard des users**, pas en chambre. Discord = focus group permanent.

7. **Une version est livrée et observée avant de commencer la suivante.** Pas de multitasking entre versions.

### Règle de focus produit

À tout moment, **une seule version est en développement actif**. La version en cours est livrée, observée, validée (cibles atteintes ou ajustées), puis on enchaîne avec la suivante.

### Règle de rollback

Chaque version a une stratégie de rollback documentée. Feature flags + migrations DB réversibles. Si v3.0 introduit un bug critique, retour à v2.0 en 1h.

### Règle de coexistence

Les produits coexistent. Un Gardien sur v1.0 Le Tracker n'est pas obligé d'utiliser Le Terminal de v2.0. Les nouvelles features s'ajoutent sans casser les anciennes.

### Règle du persona principal

Chaque version a **un persona principal** dont l'expérience est optimisée à 100%. Les autres personas peuvent en bénéficier mais ne sont pas la priorité du release.

| Version | Persona principal | Personas bénéficiaires |
|---|---|---|
| v1.0 Le Tracker | Le Gardien | (aucun, focus 100%) |
| v2.0 Le Terminal | Le Chasseur + La Baleine | Le Gardien (pricing amélioré) |
| v3.0 L'Oracle | Le Grading Hunter + Le Seller | Tous les autres (Oracle global) |
| v4.0 La Plateforme | Tous + Devs + Boutiques | - |

---

## Tableau récapitulatif

| Version | M+ | Statut | Persona principal | Users cumulés | DAU | Pro | Premium | B2B | MRR | Effort dev |
|---|---|---|---|---|---|---|---|---|---|---|
| **v0.9 Beta** | 0 | Beta privée (Infrastructure Solide) | Beta testeurs FR | 200 | 60 | 0 | 0 | 0 | 0€ | 2 sem |
| **v1.0 Le Tracker** | 3 | Public 1er produit (Bedrock) | Le Gardien | 1500 | 350 | 60 | 0 | 0 | 850€ | 13 sem |
| **v2.0 Le Terminal** | 7 | Public 2e produit | Chasseur + Baleine | 6000 | 1600 | 300 | 30* | 0 | 3600€ | 12 sem |
| **v3.0 L'Oracle** | 12 | Public 3e produit | Grading Hunter + Seller | 15000 | 4500 | 900 | 150 | 5 | 13500€ | 18 sem |
| **v4.0 La Plateforme** | 20 | Forme finale | Tous + Devs | 35000 | 9000 | 2800 | 500 | 15 | 46500€ | 26 sem |

*Premium v2.0 optionnel, lancé seulement si demande prouvée*

---

## Roadmap visuelle

```
                v0.9          v1.0              v2.0              v3.0              v4.0
                Beta          Le Tracker        Le Terminal       L'Oracle          La Plateforme
                ────          ──────────        ───────────       ────────          ─────────────
                Now           M+3               M+7               M+12              M+20
                │             │                 │                 │                 │
STANDARD        Infra Solide  BEDROCK           À évaluer         À évaluer         À évaluer
                (4 piliers)   (4 niveaux)       (probablement     (Niveau 3 plus    (Niveau 1+2
                              0 compromis        Bedrock          exigeant : data   sur API + mobile
                                                 assoupli L2)     fiability)         standards)
                │             │                 │                 │                 │
PRODUIT         Beta test     Gestion           Trading +         Pricing pro       Infrastructure
                avec 200      collection        market intel      multi-grade       complète
                testeurs      complète                            + features        + mobile + API
                              (Master Sets)                       collectibles
                │             │                 │                 │                 │
PERSONA         (community)   LE GARDIEN        LE CHASSEUR       LE GRADING        TOUS PERSONAS
                              (collectionneur)  + LA BALEINE      HUNTER + LE       + DEVS +
                                                (trader/invest)   SELLER (pro)      BOUTIQUES
                │             │                 │                 │                 │
USERS           200           1500              6000              15000             35000
                │             │                 │                 │                 │
PRO             0             60                300               900               2800
                │             │                 │                 │                 │
MRR             0€            850€              3600€             13500€            46500€
                │             │                 │                 │                 │
EFFORT DEV      2 sem         13 sem            12 sem            18 sem            26 sem
                              (7 phases A→G)
                │             │                 │                 │                 │
KILLER          Audit infra   Master Set        Alpha Signals     Pricing Oracle    Mobile App +
FEATURE         + auth +      Completion        + Deal Hunter     + Grade-or-Sell   ML predictions
                pipeline      + Bedrock                           + Reprint Risk    + API publique
                stable        quality
                │             │                 │                 │                 │
PROMESSE        Validation    "Gère ta          "Tu vois ce       "Le vrai prix     "L'infrastructure
                infrastructure collection        que les autres    de chaque carte   du marché TCG"
                              parfaitement"     ne voient pas"    avec confiance"
                │             │                 │                 │                 │
PRICING         Gratuit       Free / Pro        Free / Pro        Free / Pro /      Free / Pro /
                              9,99€             9,99€             Premium 19,99€ /  Premium /
                                                                  B2B 299€          B2B (3 tiers)
```

---

## Mapping phases techniques ↔ versions

Référence vers `kodo-cards-pricing-oracle-spec.md` qui contient le détail technique des 20 phases.

| Phase | Description technique | Version cible |
|---|---|---|
| Phase 0 | Foundation (TimescaleDB + 10 tables) | v3.0 |
| Phase 1 | Inngest setup | v2.0 |
| Phase 2 | PokemonPriceTracker (graded général) | v2.0 |
| Phase 3 | Cardmarket API officielle | v3.0 |
| Phase 4 | Oracle Engine v1 (VWAP + MAD) | v3.0 |
| Phase 5 | Card Variants schema enrichi | v3.0 |
| Phase 6 | Apify eBay sold pipeline | v3.0 |
| Phase 7 | Mercari + Yahoo JP | v3.0 |
| Phase 8 | PSA Public API | v3.0 |
| Phase 9 | Limitless TCG + Tournament | v3.0 |
| Phase 10 | Smart refresh dynamique | v3.0 |
| Phase 11 (partial) | Observability basique | v2.0 |
| Phase 11 (full) | Better Stack paid + dashboards | v4.0 |
| Phase 12 | Collectible Features Pack 1 (Reprint Risk, Lifecycle, Fake Risk) | v3.0 |
| Phase 13 | Collectible Features Pack 2 (Grade-or-Sell, Cross-Grader) | v3.0 |
| Phase 14 | KCI & Market Indices V2 | v3.0 |
| Phase 15 | Social Momentum | v4.0 |
| Phase 16 | AI Title Parser | v4.0 |
| Phase 17 | Time-series Forecasting | v4.0 |
| Phase 18 | Anomaly Detection | v4.0 |
| Phase 19 | Real-time push WebSocket | v4.0 |
| Phase 20 | Vision AI pre-grading | v4.5+ (post Series A) |

### Mapping inverse (phases par version)

**v0.9 Beta** : aucune phase technique, juste polish + bug fixes

**v1.0 Le Tracker** :
- Bug fixes (JP dropdown, Daily Hub)
- Polish Holdings (limites Free, multi-binders, tags)
- Stripe + Better Auth subscriptions
- Onboarding 3 slides
- Email hebdo recap
- Theme creator Pro
- Status page + Sentry
- Landing refonte axée Tracker
- Master Sets system robuste

**v2.0 Le Terminal** :
- Phase 1 (Inngest)
- Phase 2 (PokemonPriceTracker pour graded général)
- Phase 11 partial (Observability)
- Refonte Market Terminal
- Alpha Signals engine v2
- Deal Hunter avancé
- Spreads "Pour toi"
- Whale Tracker custom lists
- Dexy AI v2

**v3.0 L'Oracle** :
- Phase 0 (Foundation)
- Phase 3 (Cardmarket API)
- Phase 4 (Oracle Engine)
- Phase 5 (Card Variants)
- Phase 6 (Apify eBay)
- Phase 7 (Mercari + Yahoo JP)
- Phase 8 (PSA Public API)
- Phase 9 (Limitless TCG)
- Phase 10 (Smart refresh)
- Phase 12 (Features Pack 1)
- Phase 13 (Features Pack 2)
- Phase 14 (KCI)
- B2B tier setup

**v4.0 La Plateforme** :
- Phase 11 full (Better Stack paid)
- Phase 15 (Social Momentum)
- Phase 16 (AI Title Parser)
- Phase 17 (Forecasting ML)
- Phase 18 (Anomaly Detection)
- Phase 19 (Real-time push)
- Mobile app native (React Native)
- API publique + SDK
- White-label architecture validation

---

## Communication & change management

### Pour chaque version, communication multi-canal

1. **Blog post officiel** : "Introducing Kodo Cards [Version Name]" sur kodocards.com/blog
2. **Email aux users** : Brevo campagne segmentée par tier
3. **Discord announcement** : channel #announcements avec @everyone (modéré)
4. **Twitter/X thread** : 8-12 tweets avec screenshots
5. **LinkedIn post** : version professionnelle
6. **YouTube video** : 5-10 min walkthrough des nouveautés
7. **In-app modal** : tour guide 3 slides au premier login post-update

### Roadmap publique

Sur `kodocards.com/roadmap` :
- ✅ Versions livrées (avec date)
- 🚧 Version en cours (avec ETA approximative)
- 🔮 Versions futures (sans date)
- Voting board : users peuvent voter sur les features futures (modèle Linear ou Cron)

### Gestion des breaking changes

Aucune version ne doit casser l'expérience d'un user existant sans :
1. Annonce 14 jours avant
2. Communication multi-canal
3. Migration assistée si nécessaire
4. Période de grâce 30 jours

### Feedback collection systématique

À chaque release :
- **NPS survey** : 7 jours après la release, ciblé sur les users qui ont utilisé les nouvelles features
- **Discord poll** : "Vous aimez la nouvelle version ?"
- **Hotjar surveys** : 3 questions ciblées sur les nouveaux écrans
- **5 calls 30min** : avec des power users représentatifs

### Communication par version (exemples)

**v1.0 Le Tracker** :
> *"Kodo Cards Le Tracker est officiellement lancé. Pour la première fois, les collectionneurs français disposent d'un outil dédié à la gestion complète de leur collection Pokemon TCG. Master Sets, valorisation quotidienne, wishlists illimitées. À partir d'aujourd'hui."*

**v2.0 Le Terminal** :
> *"Le Terminal arrive. Au-delà de la gestion de collection, Kodo Cards devient l'outil de trading des cartes Pokemon. Alpha Signals, Deal Hunter, Whale Tracker. Si tu cherches l'edge, tu l'as trouvé."*

**v3.0 L'Oracle** :
> *"L'Oracle est en ligne. Le pricing Kodo Cards n'est plus un wrapper de données tierces. C'est désormais un oracle propriétaire calculé sur 8 sources, avec un score de confiance transparent. La référence pricing du marché Pokemon FR/EU/JP."*

**v4.0 La Plateforme** :
> *"La Plateforme. Kodo Cards devient l'infrastructure complète du marché Pokemon TCG. App mobile native, API publique, prédictions ML. De l'outil au standard de l'industrie."*

---

## Annexes

### A. Décisions stratégiques clés

**Pourquoi 4 produits autonomes et pas 6 incréments ?**
Parce qu'un incrément n'est pas un produit. Un user paye pour un produit complet, pas pour une promesse de complétion future. Chaque version doit tenir debout seule.

**Pourquoi Le Tracker en premier et pas Le Terminal ?**
Le Gardien est le persona le plus engagé long-terme (rétention naturelle élevée), avec le moins de friction d'usage (pas besoin d'expertise marché). C'est la fondation utilisateur la plus saine.

**Pourquoi L'Oracle si tard (M+10) ?**
Parce que c'est 18 semaines de dev. Tenter de le livrer plus tôt revient à livrer un demi-Oracle, ce qui contredit le principe d'autonomie produit. Mieux vaut Le Terminal complet en M+5 que demi-Oracle en M+6.

**Pourquoi le Premium tier seulement en v3.0 ?**
Parce qu'avant v3.0, il n'y a pas de feature qui justifie 19,99€ vs 9,99€. Grade-or-Sell, Predicted Fair Value, Custom KCI : ces features arrivent en v3.0+. Lancer un Premium vide est une promesse cassée.

**Pourquoi le B2B en v3.0 et pas plus tôt ?**
Parce qu'avant v3.0, on n'a pas de pricing fiable + multi-condition à fournir aux boutiques. Le Buylist Optimizer requiert le Cardmarket API officielle + Oracle Engine. Lancer un B2B sur du pricing approximatif tue la réputation.

### B. Risques par version

| Version | Risque principal | Mitigation |
|---|---|---|
| v0.9 | Pas d'audience | Recruter manuellement 30 ambassadeurs avant de lancer |
| v1.0 | Conversion Pro < 1% | Targeting très fin Gardien + onboarding excellent |
| v2.0 | Alpha Signals pas fiables | Validation post-hoc transparente + opt-out facile |
| v3.0 | Cardmarket API refuse | Backup multi-sources solide, scrape légal en fallback |
| v4.0 | Mobile app retard | Démarrer dev dès v3.0 livraison, externaliser si besoin |

### C. Ressources nécessaires par version

| Version | Time founder | Budget infra | Budget marketing | Total cash |
|---|---|---|---|---|
| v0.9 | 30h/sem × 3 sem | 0€ | 100€ (Brevo + Discord boost) | 100€ |
| v1.0 | 30h/sem × 6 sem | 5€/mo | 500€ (ads test + content + influencers) | 800€ |
| v2.0 | 30h/sem × 12 sem | 15€/mo | 1500€ (PR + content + ambassadors) | 2200€ |
| v3.0 | 30h/sem × 18 sem | 30€/mo | 3000€ (whitepaper PR + conférences) | 4500€ |
| v4.0 | Full-time × 26 sem | 80€/mo | 10000€ (Series A prep + mobile launch + PR tier 1) | 15000€ |

### D. Checklist pré-lancement par version

- [ ] Tous les success criteria de la version précédente atteints ou ajustés
- [ ] Documentation interne mise à jour (changelog, ADR)
- [ ] Migrations DB testées en staging
- [ ] Rollback procedure documentée et testée
- [ ] Communication multi-canal préparée (7 canaux minimum)
- [ ] Roadmap publique mise à jour
- [ ] Email Brevo segmenté préparé
- [ ] Blog post écrit et relu
- [ ] Twitter thread préparé
- [ ] YouTube video tournée et montée
- [ ] In-app modal designed et testé
- [ ] Sentry alerts configurées sur les nouvelles routes
- [ ] Status page mise à jour
- [ ] Discord announcement préparé
- [ ] Tests E2E passants sur les flows critiques
- [ ] Mobile responsive vérifié
- [ ] Lighthouse score > 90 sur les nouvelles pages
- [ ] Page produit "Le X" créée et SEO-optimisée
- [ ] Pricing page à jour avec nouveaux tiers si applicable
- [ ] Onboarding mis à jour avec nouvelles features

### E. Évolution des promesses produit

| Version | Promesse | Tagline marketing |
|---|---|---|
| v1.0 | Gère ta collection parfaitement | "Le Tracker que ta collection mérite" |
| v2.0 | Tu vois ce que les autres ne voient pas | "Le Terminal des traders Pokemon" |
| v3.0 | Le vrai prix de chaque carte | "L'Oracle des prix TCG" |
| v4.0 | L'infrastructure du marché TCG | "Le Bloomberg du Pokemon" |

### F. Logiques de pricing évolutives

**v1.0** : Pro 9,99€ = collections illimitées (utility pure)

**v2.0** : Pro 9,99€ = Alpha Signals + Deal Hunter + Whale Tracker (intelligence)

**v3.0** : 
- Pro 9,99€ = tout v2.0 amélioré + POP + Buylist
- Premium 19,99€ = Grade-or-Sell + Custom KCI + API limited
- B2B 299€ = multi-user + API étendue

**v4.0** : 
- Pro 9,99€ = tout v3.0 + ML predictions limited
- Premium 19,99€ = ML predictions full + real-time + mobile premium features
- B2B 99€/299€/Enterprise = API tier ladder

**Note importante** : les anciens Pro 9,99€ restent à 9,99€ à vie (grandfathering), même si le prix Pro de v3.0 monte à 12,99€ pour les nouveaux. C'est le contrat de confiance.

---

## Conclusion

Ce document v3 ajoute le standard **Bedrock** pour v1.0 (et **Infrastructure Solide**
pour v0.9) au principe **"produits autonomes, pas incréments"** établi en v2.

Les deux documents Kodo Cards à lire conjointement :
- **Spec technique** (`kodo-cards-pricing-oracle-spec-v2.md`) : *quoi construire et comment*
- **Versioning strategy** (ce doc, v3) : *dans quel ordre, à qui, pour quel ROI, avec quel niveau de qualité*

**Prochaine action recommandée** :
1. Démarrer v0.9 (2 semaines) en mode Infrastructure Solide : audit auth + DB + pipeline + storage
2. Recruter 50-200 beta testeurs FR pendant cette période
3. À l'issue de v0.9, valider la checklist Infrastructure Solide complète
4. Si tout vert → démarrer v1.0 Phase A (audit & cleanup des features v2/v3)
5. 13 semaines plus tard, Test Bedrock complet passé → launch v1.0 publique

**Timeline globale révisée** :
- v0.9 → M+0 à M+0.5 (2 semaines infrastructure)
- v1.0 Le Tracker → M+0.5 à M+3 (13 semaines Bedrock)
- v2.0 Le Terminal → M+3 à M+7
- v3.0 L'Oracle → M+7 à M+12
- v4.0 La Plateforme → M+12 à M+20

**Soit ~20 mois** du démarrage à v4.0 Series A. C'est plus long que v2 mais
infiniment plus solide. La vitesse ne sert à rien si la fondation craque.

L'objectif n'est jamais de tout construire avant de lancer. L'objectif est de
**livrer un produit complet et solide à chaque étape**, et de bâtir une fan
base qui grandit avec le produit.

---

*Document préparé en mai 2026 pour Alon, founder de Kodo Cards. Version 3, à réviser à chaque livraison de version majeure.*
