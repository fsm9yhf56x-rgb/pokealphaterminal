# Runbook · Restore DB Neon (Point-In-Time Recovery)

> Procédure validée le 26 mai 2026 lors de l'audit DB v0.9 Phase DB-1.
> **Restore PITR est testé et fonctionnel.**

## Contexte

- **DB** : Neon PG 17.10, projet `pokealphaterminal` (`lucky-water-64635288`)
- **Région** : Frankfurt (eu-central-1)
- **Plan actuel** : Free
- **Fenêtre PITR** : **6 heures** (limitation plan Free)
- **Baseline** : 25 tables, ~587 534 rows (snapshot 2026-05-26)

⚠️ **Upgrade Neon requis avant v1.0 Bedrock** : plan Launch ($19/mo) = 7 jours PITR. Free 6h insuffisant.

## Quand utiliser ce runbook

- Suppression accidentelle de table ou rows critiques
- Corruption détectée dans les dernières 6h
- Migration foireuse en prod
- Attaque malveillante avec destruction de données

## Procédure d'urgence (15-20 min)

### Étape 1 — Identifier le point-in-time cible

1. Détermine **quand** le problème a commencé
2. Choisis un point-in-time **5-10 minutes AVANT** ce moment
3. Note l'heure exacte (UTC ou local)

### Étape 2 — Créer la branche restore

1. Va sur https://console.neon.tech/app/projects/lucky-water-64635288
2. Sidebar gauche → **Branches**
3. Click **Create branch**
4. Configuration :
   - **Name** : `restore-incident-YYYY-MM-DD-HHmm` (ex: `restore-incident-2026-05-26-1430`)
   - **Parent branch** : `main`
   - **Include data** : sélectionne **Point in time** (pas "Current state" ni "Empty")
   - **Time** : ton point-in-time cible
5. Click **Create new branch**
6. Attends 10-30 sec (provisioning compute)

### Étape 3 — Récupérer connection string branche restore

1. Sur la page de la branche créée
2. **Connection details** ou **Connect**
3. Rôle : `neondb_owner`, Database : `neondb`
4. Copie la **connection string** complète (commence par `postgresql://`)

### Étape 4 — Valider la branche restore

```bash
cd "/Users/alonguez/Dev/KodoCards"

# Crée le fichier env temporaire (gitignored)
echo "DATABASE_URL_RESTORE=$(pbpaste)" > .env.restore-test

# Vérifie que la URL est bien collée
grep "^DATABASE_URL_RESTORE=" .env.restore-test | sed 's/postgresql:\/\/[^@]*@/postgresql:\/\/***@/'

# Lance le script de validation
node validate-restore.cjs
```

Attendu : 25 tables, ~587 534 rows.

### Étape 5 — Récupérer les données

3 options selon le scénario :

#### Option A — Restore complet (replace prod par restore branch)

⚠️ **DESTRUCTIF** : remplace la prod par la branche restore.

1. Dashboard Neon → projet
2. **Settings** → **Branches** → la branche restore
3. Click **Promote to default** ou **Make primary**
4. L'ancienne main devient une branche secondaire (récupérable 6h)
5. Mettre à jour `DATABASE_URL` dans Vercel si l'URL change

#### Option B — Restore partiel (table par table)

Plus safe, pour rattraper une table corrompue sans toucher au reste.

```bash
# Dump la table depuis branche restore (exemple : portfolio_cards)
pg_dump "$DATABASE_URL_RESTORE" --table=portfolio_cards --data-only > /tmp/restore-portfolio.sql

# Drop la table corrompue en prod (BACKUP D'ABORD !)
psql "$DATABASE_URL" -c "TRUNCATE portfolio_cards CASCADE"

# Restore les données
psql "$DATABASE_URL" -f /tmp/restore-portfolio.sql
```

#### Option C — Restore lecture seule (consultation forensique)

Si tu veux juste **inspecter** ce qu'il y avait avant sans rien restaurer en prod, la branche reste là, accessible via son URL séparée. Pas de modif prod.

### Étape 6 — Cleanup post-incident

```bash
# Supprimer le fichier env temporaire
rm .env.restore-test

# Supprimer la branche restore (économise compute Neon)
# Via dashboard : Branches → la branche → "..." → Delete
```

### Étape 7 — Post-mortem

Documenter dans `docs/incidents/YYYY-MM-DD-XXX.md` :
- Quand a commencé le problème (timestamp)
- Quand détecté (timestamp)
- Quand restored (timestamp)
- Cause racine
- Données affectées
- Actions correctives pour éviter la récurrence

## Limites du plan Free Neon

- **Fenêtre PITR** : 6 heures seulement
- **Network transfer** : 5 GB/mois (cf. alerte 84.5% du 25/05)
- **Storage** : 0.5 GB/mois inclus
- **Compute hours** : 191h/mois

→ Migration Launch ($19/mo) prévue pour v1.0 Bedrock : 24 GB transfer, 10 GB storage, 7 jours PITR, 300h compute.

## Tests de restore réguliers

Bedrock recommande : test restore **mensuel** minimum.

Procédure rapide (5 min) :
1. Créer branche `restore-monthly-test-YYYY-MM`
2. Lancer `node validate-restore.cjs`
3. Vérifier 25 tables, ~587k rows
4. Cocher dans tracker mensuel
5. Supprimer la branche test

## Historique des tests restore

| Date | Type | Résultat | Notes |
|---|---|---|---|
| 2026-05-26 | Audit v0.9 Phase DB-1 | ✅ 100% match | Baseline 25 tables / 587 534 rows |
