# eBay Marketplace Insights API — Demande d'acces

## Pourquoi cette API ?

Marketplace Insights (MI) retourne les sold listings (cartes reellement vendues) sur 90 jours, contrairement a Browse API qui ne donne que les listings actifs (ce que les vendeurs esperent obtenir).

Pour PokeAlpha Terminal, qui se positionne comme la "source de verite du marche TCG", les sold listings sont la vraie donnee de marche. Sans elles, l'utilisateur ne voit que les attentes des vendeurs, pas les transactions reelles.

## Statut

- Code pret : src/app/api/prices/ebay/route.ts supporte deja MI via le flag EBAY_USE_MARKETPLACE_INSIGHTS=true
- Bloque sur : approbation eBay (Limited Release API)
- Delai estime : 1 a 2 semaines apres soumission

## Procedure de demande

### 1. eBay Developer Program

URL : https://developer.ebay.com/my/keys

Compte requis : celui qui a EBAY_APP_ID et EBAY_CERT_ID configures sur Vercel.

### 2. Application Growth Check

URL : https://developer.ebay.com/my/auth/?env=production&index=0

### 3. Demande Marketplace Insights

URL : https://developer.ebay.com/api-docs/buy/static/api-marketplace-insights.html

Clique sur "Request Access to this API" (bouton en haut a droite).

### 4. Use Case a coller

PokeAlpha Terminal is a SaaS platform helping Pokemon TCG collectors and investors track the value of their collections in real time. We aggregate market data from multiple sources to provide an unbiased single source of truth for card prices.

The Marketplace Insights API will be used to:
1. Display historical sold prices on individual card pages (educational for users, helping them understand fair market value).
2. Power our Alpha Signals feature that detects undervalued cards based on actual transaction prices vs. listed prices.
3. Calculate accurate ROI metrics for users portfolio holdings.

We expect 5,000 to 20,000 API calls per day across our user base, fully respecting eBay rate limits and ToS.

### Volume estimation

- Daily: 5 000 to 20 000 calls
- Monthly: 150 000 to 600 000 calls

### Geographie

- US (EBAY_US)
- Possibly EU markets later (EBAY_GB, EBAY_DE, EBAY_FR)

### 5. Activation apres approbation

1. Verifier le scope dans https://developer.ebay.com/my/keys (doit voir https://api.ebay.com/oauth/api_scope/buy.marketplace.insights)
2. Activer le flag dans Vercel : Settings > Environment Variables > New > Name=EBAY_USE_MARKETPLACE_INSIGHTS, Value=true, Environments=Production. Save puis Redeploy.
3. Test live :

curl -s -X POST https://pokealphaterminal.vercel.app/api/prices/ebay -H "Content-Type: application/json" -d '{"cards":[{"name":"Charizard","set":"Base Set","number":"4","edition":"shadowless","setSlug":"base-set"}]}'

Verifier que prices_snapshots.source_meta.ebay_mode = sold.

## Plan B (si refus / retard)

1. Terapeak (eBay-owned) : pas de vraie API publique
2. Scraping eBay sold completed listings : fragile, risque de ban
3. Autres marketplaces sold : Goldin Auctions, PWCC

## Liens utiles

- API doc : https://developer.ebay.com/api-docs/buy/marketplace-insights/overview.html
- OAuth scopes : https://developer.ebay.com/api-docs/static/oauth-scopes.html

## Historique

- 2026-04-28 : Code MI ready to flip
- todo : Demande envoyee a eBay
- todo : Approbation recue
- todo : Flag active en prod
