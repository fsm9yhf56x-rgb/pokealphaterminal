# Kodo Cards — Pricing Oracle Specification v4

> Document de référence pour l'implémentation du moteur de pricing propriétaire.  
> Version 4 · Mai 2026 · Confidentiel  
> Repo : `github.com/fsm9yhf56x-rgb/pokealphaterminal` · Projet : Kodo Cards (`kodocards.com`)
>
> **À lire conjointement avec** `kodo-cards-versioning-strategy-v2.md` qui décrit
> comment les phases ci-dessous sont regroupées en 4 produits autonomes
> (Le Tracker, Le Terminal, L'Oracle, La Plateforme).

---

## Sommaire

- [0. Executive Summary](#0-executive-summary)
- [1. Vision & Positionnement](#1-vision--positionnement)
- [2. Spécificités du marché Pokemon TCG](#2-spécificités-du-marché-pokemon-tcg)
- [3. Architecture cible (5 couches)](#3-architecture-cible-5-couches)
- [4. Sources de données](#4-sources-de-données)
- [5. Schema database](#5-schema-database)
- [6. Oracle Engine — algorithmes](#6-oracle-engine--algorithmes)
- [7. Features différentiantes (12)](#7-features-différentiantes-12)
- [8. AI/ML Layer](#8-aiml-layer)
- [9. Infrastructure transverse](#9-infrastructure-transverse)
- [10. Performance & Edge caching](#10-performance--edge-caching)
- [11. Roadmap d'exécution (20 phases)](#11-roadmap-dexécution-20-phases)
- [12. Budget détaillé](#12-budget-détaillé)
- [13. Métriques de succès](#13-métriques-de-succès)
- [14. Risques & mitigation](#14-risques--mitigation)
- [15. Monétisation diversifiée](#15-monétisation-diversifiée)
- [16. Benchmark concurrentiel](#16-benchmark-concurrentiel)
- [17. Resilience & DR](#17-resilience--dr)
- [18. Sécurité & compliance](#18-sécurité--compliance)
- [Annexes](#annexes)

---

## 0. Executive Summary

**Problème actuel** : le bloc "Listings actifs eBay" affiche des asks non vendus (Dracaufeu FR CGC 10 = 21199€ basé sur 2 listings non vendus). eBay Marketplace Insights refusé. Pas de plan API payant.

**Vision** : ne pas être un wrapper d'API tiers, mais construire un **price oracle propriétaire** qui devient *la* source de vérité du marché Pokemon TCG en EU/FR/JP. Position "Bloomberg du TCG" structurellement ancrée par la propriété des données.

**Différenciateurs** :
- Multi-source aggregation (8 sources, redundancy totale)
- Algorithmes propriétaires (VWAP + MAD + scarcity + reprint + lifecycle + social)
- Couverture EU/FR/JP unique sur le marché
- 12 features collectible-specific que zéro concurrent ne propose
- Moat data exponentiel (5M+ transactions/an accumulées)

**Budget** : 15€/mo démarrage → 27€/mo cruise → scale avec revenus.

**Timeline** : 20 phases d'implémentation, ~22-26 sessions de travail.

**Success criteria** :
- Couverture sold prices > 95% du catalogue top 30k cartes
- Confidence score > 70 sur top 5000 cartes
- Latency p95 API pricing < 100ms
- 0 single point of failure (résilience 8 sources)

---

## 1. Vision & Positionnement

### 1.1 Vision

> *"Kodo Cards est l'infrastructure de pricing du marché Pokemon TCG. Là où nos concurrents affichent des prix tiers, nous calculons les nôtres à partir d'observations multi-source agrégées. Notre prix consensus devient progressivement la référence du marché EU/FR/JP."*

### 1.2 Trois piliers stratégiques

| Pilier | Description | Moat |
|---|---|---|
| **Data Moat** | 5M+ transactions historiques accumulées sur 18 mois, multi-source, multi-marché | Impossible à reconstruire pour un nouvel entrant |
| **Algorithm Moat** | Oracle propriétaire avec 8 algos calibrés sur le comportement réel du marché Pokemon | Propriété intellectuelle, paramètres affinés par observation |
| **Geographic Moat** | Seul acteur avec coverage native EU (Cardmarket API officielle) + JP (Mercari/Yahoo) + US | Concurrents US-first ou US-only |

### 1.3 Pourquoi pas juste prendre PokeTrace Pro à 20$/mo ?

Tentation initiale écartée. Justification :

| Critère | PokeTrace Pro | Kodo Oracle propriétaire |
|---|---|---|
| Time-to-market | 1 session | 12-15 sessions |
| Coût | 240€/an | 180-320€/an |
| Dépendance | 100% sur un tiers | 0% |
| Différenciation produit | Aucune (concurrents peuvent l'acheter aussi) | Maximale |
| Asset stratégique | Aucun | Dataset propriétaire = potentiel acquisition |
| Vendor lock-in | Total (si PokeTrace ferme/augmente, on meurt) | Aucun (8 sources, fallback) |
| Series A pitch | "On consomme PokeTrace" | "On a notre oracle propriétaire" |

**Décision** : budget alloué à l'infrastructure propre (Apify ciblé, Inngest, observability) qui renforce le moat.

---

## 2. Spécificités du marché Pokemon TCG

Le marché Pokemon TCG n'est pas un marché financier classique. 14 spécificités structurantes pour l'architecture :

### 2.1 La gradation est le système nerveux

Une Dracaufeu Base Set raw = 800€. Même carte PSA 10 = 14000€. Multiplier **×17** purement basé sur un slab plastique.

- **9 graders majeurs** : PSA, BGS, CGC, SGC, ACE, TAG, PCA (FR), CCC (EU), MNT (JP)
- **Sub-grades** : PSA 9 OC (off-center), PSA 10 Black Label, BGS 9.5 vs 10 Pristine
- **Cross-grader equivalences non triviales** : PSA 10 ≈ BGS 9.5+ ≈ CGC 10 Perfect
- **Une carte peut avoir 60-80 prix distincts** par combinaison grader × grade × sub-grade

**Impact archi** : indexation `prices_consensus` sur `(card_ref, lang, condition, grader, grade, sub_grade)`.

### 2.2 Variants explosent la complexité combinatoire

Une "carte Dracaufeu Base Set" n'existe pas. Variants tradables distincts :

| Axe | Valeurs possibles |
|---|---|
| Édition | 1st Edition / Shadowless / Unlimited / 4th print |
| Holo | Cosmos / Crystal / Reverse / Master Ball / Poké Ball Reverse |
| Stamp | Pre-release / Staff / Championship / Tournament / Pokemon Center |
| Error | Missing symbol / Wrong color / Miscut / No rarity / Ink errors |
| Signature | Signed by artist (Mitsuhiro Arita, Ken Sugimori...) |
| Langue | EN / FR / DE / IT / ES / PT / PL / RU / JP / CN / KR |

**Combinatoire réelle** : Charizard Base Set ≈ 30 variants en EN seul, ~80 toutes langues.

### 2.3 Population reports = facteur pricing critique

PSA 10 sur POP 50 vaut 5× plus que PSA 10 sur POP 5000. Le POP est un **input pricing**, pas une métadonnée.

- **PSA Public API** disponible (100 req/jour gratuit)
- **CGC, BGS, SGC** ont aussi leurs pop reports publics (scraping ciblé)
- POP évolue dans le temps → impact sur le pricing

### 2.4 Sealed vs Singles = deux marchés inversement corrélés

Quand une chase card monte, le booster box monte (Expected Value calculée). Quand les boxes sont reprint, les singles gagnent en stabilité relative.

### 2.5 Cycles de vie distincts par carte

```
J+0       │ Hype peak (release day)
J+7-30    │ Crash -40% à -60% ("dump phase")
J+30-180  │ Floor (accumulation smart money)
J+180-1y  │ Recovery si chase card
J+1-3y    │ Maturation (fluctue avec meta)
J+3y+     │ Legacy (appreciation linéaire si pas reprint)
```

Algos de pricing **différents par phase**. Pricing d'une carte en "crash" ne se calcule pas comme une carte "mature".

### 2.6 Tournament & event impact

Worlds finale → carte du deck gagnant +200% en 48h. Pre-release stamped → spike pendant 1 semaine. Pokemon Center exclusive → drop hebdo avec rotations Japon time zone.

### 2.7 Asymétrie géographique = vrai arbitrage

| Marché | Comportement | Prime/Discount typique vs US baseline |
|---|---|---|
| **US** (eBay/TCGplayer) | Hype-driven, premium PSA | 0% baseline |
| **EU** (Cardmarket) | Discount sur hype US, premium sur FR/IT | -15% sur hype US, +20% sur cartes FR/IT |
| **JP** (Mercari/Yahoo) | Origine, premium sur Master Ball/Special Art | -30% sur cartes EN, +50% sur exclusives JP |

### 2.8 Conditions raw plus subtiles que NM/LP

PSA évalue 4 critères : **Centering, Corners, Edges, Surface** (1-10 chacun). Whitening sur vintage = -30%. Back vs front damage = impact différent.

### 2.9 Effet Master Set & "Last card to complete"

Dernière carte qui complète un master set se vend 2-3× sa valeur "marché". **Aucun pricing tool ne track ça.** Énorme opportunité pour ton persona "Gardien".

### 2.10 Reprint risk = pricing factor first-class

Pokemon Company annonce reprint → -30 à -50% en 48h. Risque prédictible :
- Set >5 ans : risk élevé (anniversary reprint)
- Chase card de set populaire : risk élevé
- Sets Wizards (1999-2003) : risk zéro (licence terminée)
- Sets récents (<2 ans) : risk faible
- Sets anniversary (Celebrations, 25th) : risk déjà actualisé

### 2.11 Pump-and-dump par influenceurs

Logan Paul achète Pikachu Illustrator = +30% en 1 semaine. Rudy Ayoub showcase un Dracaufeu = +15%. **Le marché Pokemon est influencer-driven**, pas fundamentals-driven.

### 2.12 Fakes pollution

30%+ des "cartes Pokemon" sur eBay budget = contrefaçons. PSA grade authentifie → pricing PSA "fakes-cleaned" mais raw price est pollué. Filtrage critical.

### 2.13 Sub-marchés gold mine ignorés par tous

- Pokemon Center exclusives JP (marché vivant, refresh weekly)
- Trophy cards (Worlds, Tropical Mega Battle) — 6-7 chiffres
- Pre-release stamped (stable, prévisible)
- Test/prototype cards (Pikachu Illustrator = $16.5M en 2026)
- Singapore/Asia exclusive promos (émergent)

### 2.14 6 personas avec besoins pricing distincts

| Persona | Pricing besoin spécifique |
|---|---|
| Gardien (collectionneur) | "Prix d'achat fair" pour compléter sa collection |
| Chasseur (trader) | "Prix de vente net après frais" pour arbitrer |
| Baleine (investisseur) | "VWAP 90j" pour decisions long-terme |
| Grading Hunter | "Grade or Sell calculator" POP-based ROI |
| Seller (revendeur pro) | "Buylist optimisée" (achat -30% market) |
| Trend Follower | "Momentum signal" avec social score |

Une seule donnée consensus exposée via 6 vues différentes selon persona détecté.

---

## 3. Architecture cible (5 couches)

```
┌──────────────────────────────────────────────────────────────────┐
│  COUCHE 5 — APPLICATION (Kodo Cards UI)                          │
│  Holdings · Spotlight · Explorer · Daily Hub · Alpha Signals     │
│  Whale Tracker · Dexy AI · Grade-or-Sell · Reprint Risk · KCI    │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  COUCHE 4 — API & SERVING                                        │
│  Next.js Route Handlers · Vercel Edge Functions · Cache L1/L2/L3 │
│  Real-time WebSocket (Pusher) · Search (Meilisearch)             │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  COUCHE 3 — ORACLE ENGINE (le différenciateur propriétaire)      │
│  VWAP · MAD outlier · Confidence scoring · Reconciliation        │
│  Scarcity · Reprint discount · Lifecycle · Social momentum       │
│  AI/ML : forecasting · anomaly detection · embeddings            │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  COUCHE 2 — STORAGE (TimescaleDB on Neon)                        │
│  prices_sold_raw (hypertable) · prices_aggregated · consensus    │
│  card_variants · pop_reports · tournament_results · social       │
│  fx_rates_daily · reprint_status · set_completion_index          │
└────────────────────────────┬─────────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│  COUCHE 1 — INGESTION (event-driven via Inngest)                 │
│  PokeTrace · PokemonPriceTracker · Cardmarket API officielle     │
│  Apify (eBay/Mercari/Yahoo JP) · PSA API · Limitless TCG         │
│  SerpAPI (social) · Heritage/Goldin scrape · TCGdex backup       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.1 Principes architecturaux

1. **Source-agnostic** : aucune source n'est obligatoire. Chaque couche fonctionne même si N-1 sources tombent.
2. **Event-driven** : Inngest orchestrates tout. Crons GitHub Actions deviennent simples triggers.
3. **Idempotent** : chaque ingestion a une idempotency key. Replay safe.
4. **Time-series first** : TimescaleDB hypertables pour `prices_sold_raw`, compression auto après 30j.
5. **Edge-cached** : reads pricing servis depuis Vercel Edge (latency < 50ms global).
6. **Observability built-in** : Sentry + Better Stack + dashboard `/admin/data-quality` intégré.
7. **Composable** : chaque feature consomme `prices_consensus` via une interface stable. Refactor d'une couche n'impacte pas les autres.

---

## 4. Sources de données

### 4.1 Matrix complète

| # | Source | Type données | Coverage | Coût | Fréquence | Status actuel |
|---|---|---|---|---|---|---|
| 1 | **PokeTrace Free** | eBay sold 90j US + conditions | 30k cartes US raw | 0€ (250/j) | 4h | ✅ En place |
| 2 | **PokemonPriceTracker Free** | PSA 8/9/10 eBay sold EN+JP | Top premium graded | 0€ (100/j) | daily | ❌ À intégrer |
| 3 | **Cardmarket API officielle** | "Price Trend" (avg 30j sold), Sellers, Available | 100% catalogue EU | 0€ (5k/j) | daily | ❌ À setup |
| 4 | **Apify eBay sold** | Sold direct `LH_Sold=1` toutes langues | Top 5k cartes | ~$0.0035/listing | 6h top / daily long tail | ❌ À setup |
| 5 | **Apify Mercari JP** | Sold natif Japon | JP premium | $4/1k listings | weekly initial | ❌ À setup |
| 6 | **Apify Yahoo Auctions JP** | Sold auctions JP | JP vintage/rare | $4/1k listings | weekly | ❌ À setup |
| 7 | **PSA Public API** | POP reports officiels | Tous PSA-graded | 0€ (100/j) | weekly | ❌ À intégrer |
| 8 | **Limitless TCG API** | Tournament results, meta share | Compétitif | 0€ | daily | ❌ À intégrer |
| 9 | **SerpAPI** (TikTok/Reddit/YT) | Social momentum tracking | Cartes hype | ~5€/mo | 6h | ❌ À setup |
| 10 | **Heritage Auctions scrape** | Ventes premium documentées | Vintage haut de gamme | 0€ (lent) | weekly | ❌ À setup |
| 11 | **Goldin Auctions scrape** | Auctions haut de gamme | Trophy/iconic | 0€ (lent) | weekly | ❌ À setup |
| 12 | **PWCC scrape** | Vintage premium US | Slabbed premium | 0€ | weekly | ❌ Optionnel |
| 13 | **TCGdex** (en place) | Cardmarket trends backup | Tout EN/FR/JP | 0€ | daily | ✅ En place |
| 14 | **exchangerate.host** | FX rates daily | EUR/USD/JPY | 0€ illimité | daily | ❌ À intégrer |
| 15 | **PokemonTCG.io v2** (backup) | TCGPlayer + Cardmarket cross-check | Tout EN | 0€ | daily | ⚠️ Backup |

### 4.2 Détails par source

#### Source 3 — Cardmarket API officielle (CRITIQUE)

C'est le **gros débloquage** EU/FR. Setup :

1. Compte Cardmarket Personal (gratuit)
2. Dedicated App registration (`https://www.cardmarket.com/en/Pokemon/Account/API`)
3. OAuth signature HMAC-SHA1 (RFC 5849)
4. Endpoints utiles :
   - `GET /games/6/products?search={query}` — recherche carte
   - `GET /products/{idProduct}` — détails + prices (`AVG`, `LOW`, `TREND`, `TREND_FOIL`)
   - `GET /products/{idProduct}/articles` — listings actifs (pour cross-check)

Données critiques retournées par produit :
```json
{
  "priceGuide": {
    "AVG":  4.50,   // moyenne pondérée toutes ventes
    "LOW":  3.00,   // plus basse vente récente
    "TREND": 4.20,  // tendance 30j (= vrai sold)
    "TREND-foil": 6.10,
    "AVG1":  4.30,  // moyenne 1 jour
    "AVG7":  4.40,  // moyenne 7 jours
    "AVG30": 4.55   // moyenne 30 jours
  }
}
```

**`TREND` et `AVG30` = sold data EU officielle.** C'est ça qui débloque ta couverture FR.

#### Source 7 — PSA Public API (POP reports)

```
GET https://api.psacard.com/publicapi/cert/{certNumber}
```

POP reports par card :
```
GET https://api.psacard.com/publicapi/spec/{specId}/pop
→ {"PSA 10": 47, "PSA 9": 312, "PSA 8": 891, ...}
```

100 req/jour gratuit. Suffit pour rafraîchir POP des top 100 cartes premium weekly.

#### Source 8 — Limitless TCG

`https://limitlesstcg.com/api/` — gratuit, sans auth pour reads publics.

Données utiles :
- Tournament results (winner deck list)
- Deck archetypes meta share
- Card play rate (combien de % du top 8 joue cette carte)

Permet `meta_relevance_score` qui pondère le pricing.

#### Source 9 — SerpAPI (social momentum)

`https://serpapi.com/` — 100 req gratuit puis ~$50/mo.

**Alternative moins chère** : scraping direct TikTok/Reddit via `youtube-search-api` + `reddit.com/r/PokemonTCG/.json` (Reddit JSON est gratuit et public).

Décision : commencer avec scraping direct gratuit, passer SerpAPI si volume devient un blocker.

---

## 5. Schema database

### 5.1 Nouvelles tables (10)

```sql
-- 1. Variants enrichis
CREATE TABLE card_variants (
  id              TEXT PRIMARY KEY,                -- ex: "base1-4-1st-shadowless"
  card_id         TEXT REFERENCES tcg_cards(id),
  edition         TEXT,                            -- '1st_edition' | 'shadowless' | 'unlimited' | '4th_print'
  holo_type       TEXT,                            -- 'normal' | 'reverse' | 'cosmos' | 'crystal' | 'master_ball' | 'poke_ball_reverse'
  stamp           TEXT,                            -- 'none' | 'pre_release' | 'staff' | 'championship' | 'pokemon_center'
  signature       BOOLEAN DEFAULT FALSE,
  signature_by    TEXT,                            -- 'mitsuhiro_arita' | 'ken_sugimori' | ...
  error_type      TEXT,                            -- NULL | 'missing_symbol' | 'wrong_color' | 'miscut' | ...
  lang            TEXT NOT NULL,                   -- 'EN' | 'FR' | 'JP' | ...
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX ON card_variants (card_id, edition, holo_type, stamp, signature, error_type, lang);

-- 2. Sold transactions raw (HYPERTABLE TimescaleDB)
CREATE TABLE prices_sold_raw (
  observation_id  TEXT PRIMARY KEY,                -- idempotency key
  source          TEXT NOT NULL,                   -- 'poketrace' | 'ppt' | 'cardmarket' | 'apify_ebay' | 'mercari' | 'yahoo_jp' | ...
  variant_id      TEXT REFERENCES card_variants(id),
  card_id         TEXT NOT NULL,                   -- denormalized for query speed
  lang            TEXT NOT NULL,
  condition       TEXT NOT NULL,                   -- 'NEAR_MINT' | 'LIGHTLY_PLAYED' | ... | 'GRADED'
  grader          TEXT,                            -- NULL si raw, sinon 'PSA' | 'BGS' | 'CGC' | ...
  grade           NUMERIC(3,1),                    -- 10.0 | 9.5 | 9.0 | ...
  sub_grade       TEXT,                            -- NULL | 'black_label' | 'pristine' | 'oc'
  price_amount    NUMERIC(12,2) NOT NULL,
  currency        TEXT NOT NULL,                   -- 'EUR' | 'USD' | 'JPY'
  price_eur       NUMERIC(12,2),                   -- converti via fx_rates_daily
  market          TEXT NOT NULL,                   -- 'US' | 'EU' | 'JP'
  seller_feedback NUMERIC(5,2),                    -- 0-100 (pour weighting)
  sold_at         TIMESTAMPTZ NOT NULL,
  observed_at     TIMESTAMPTZ DEFAULT NOW(),
  metadata        JSONB                            -- {title, url, image_url, shipping, fees, ...}
);
SELECT create_hypertable('prices_sold_raw', 'sold_at');
SELECT add_compression_policy('prices_sold_raw', INTERVAL '30 days');
CREATE INDEX ON prices_sold_raw (card_id, lang, condition, sold_at DESC);
CREATE INDEX ON prices_sold_raw (variant_id, grader, grade, sold_at DESC);

-- 3. Aggregated par fenêtre (refresh continu)
CREATE TABLE prices_aggregated (
  variant_id      TEXT NOT NULL,
  lang            TEXT NOT NULL,
  condition       TEXT NOT NULL,
  grader          TEXT,
  grade           NUMERIC(3,1),
  market          TEXT NOT NULL,
  window          TEXT NOT NULL,                   -- '7d' | '30d' | '90d' | '1y'
  vwap            NUMERIC(12,2),
  median          NUMERIC(12,2),
  mad             NUMERIC(12,2),
  sample_size     INTEGER,
  source_count    INTEGER,
  std_dev         NUMERIC(12,2),
  computed_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (variant_id, lang, condition, grader, grade, market, window)
);

-- 4. Consensus = le "vrai" prix exposé UI
CREATE TABLE prices_consensus (
  variant_id          TEXT NOT NULL,
  lang                TEXT NOT NULL,
  condition           TEXT NOT NULL,
  grader              TEXT,
  grade               NUMERIC(3,1),
  market              TEXT NOT NULL,
  consensus_price_eur NUMERIC(12,2),
  consensus_price_usd NUMERIC(12,2),
  confidence_pct      INTEGER,                     -- 0-100
  scarcity_multiplier NUMERIC(4,3) DEFAULT 1.0,
  reprint_adjustment  NUMERIC(4,3) DEFAULT 1.0,
  lifecycle_factor    NUMERIC(4,3) DEFAULT 1.0,
  social_adjustment   NUMERIC(4,3) DEFAULT 1.0,
  liquidity_score     INTEGER,                     -- 0-100
  volatility_30d      NUMERIC(6,4),                -- annualized
  last_sold_at        TIMESTAMPTZ,
  computed_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (variant_id, lang, condition, grader, grade, market)
);

-- 5. POP reports time-series
CREATE TABLE pop_reports_timeseries (
  variant_id      TEXT NOT NULL,
  grader          TEXT NOT NULL,                   -- 'PSA' | 'CGC' | 'BGS' | 'SGC'
  grade           NUMERIC(3,1) NOT NULL,
  pop_count       INTEGER NOT NULL,
  observed_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (variant_id, grader, grade, observed_at)
);
SELECT create_hypertable('pop_reports_timeseries', 'observed_at');

-- 6. Tournament results
CREATE TABLE tournament_results (
  tournament_id   TEXT PRIMARY KEY,
  tournament_name TEXT,
  date            DATE,
  format          TEXT,                            -- 'standard' | 'expanded' | 'historic'
  winner_deck     JSONB,                           -- {cards: [{card_id, count}]}
  top8_decks      JSONB,
  meta_share      JSONB,                           -- {archetype: percentage}
  ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Social momentum
CREATE TABLE social_momentum (
  card_id         TEXT NOT NULL,
  source          TEXT NOT NULL,                   -- 'tiktok' | 'reddit' | 'youtube' | 'twitter'
  mention_count   INTEGER,
  sentiment       NUMERIC(3,2),                    -- -1 to 1
  reach_estimated INTEGER,
  influencer_flag BOOLEAN DEFAULT FALSE,
  influencer_name TEXT,
  observed_at     TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (card_id, source, observed_at)
);
SELECT create_hypertable('social_momentum', 'observed_at');

-- 8. Reprint status & risk
CREATE TABLE reprint_status (
  card_id             TEXT PRIMARY KEY,
  reprint_announced   BOOLEAN DEFAULT FALSE,
  reprint_announced_at TIMESTAMPTZ,
  reprint_set_id      TEXT,
  risk_score          INTEGER,                     -- 0-100 (calculé)
  reasoning           TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Set completion index (pour bonus pricing)
CREATE TABLE set_completion_index (
  set_id              TEXT PRIMARY KEY,
  total_cards         INTEGER,
  avg_completion_pct  NUMERIC(5,2),                -- moyenne usagers
  last_card_bonus_pct NUMERIC(5,2),                -- bonus appliqué aux 5% dernières cartes
  computed_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 10. FX rates
CREATE TABLE fx_rates_daily (
  date            DATE NOT NULL,
  from_currency   TEXT NOT NULL,
  to_currency     TEXT NOT NULL,
  rate            NUMERIC(12,6) NOT NULL,
  PRIMARY KEY (date, from_currency, to_currency)
);
```

### 5.2 Modifications tables existantes

```sql
-- Card aliases : ajouter colonnes variant tracking
ALTER TABLE card_aliases 
  ADD COLUMN variant_id TEXT REFERENCES card_variants(id),
  ADD COLUMN fake_risk_score INTEGER DEFAULT 0;  -- 0-100

-- Portfolio cards : tracking variant + grade precis
ALTER TABLE portfolio_cards
  ADD COLUMN variant_id TEXT REFERENCES card_variants(id),
  ADD COLUMN grader TEXT,
  ADD COLUMN grade NUMERIC(3,1),
  ADD COLUMN sub_grade TEXT,
  ADD COLUMN cert_number TEXT;  -- pour verif PSA cert
```

### 5.3 Vues matérialisées (refresh continu)

```sql
-- Consensus enrichi prêt à servir UI
CREATE MATERIALIZED VIEW v_prices_consensus_enriched AS
SELECT 
  pc.*,
  cv.holo_type,
  cv.edition,
  cv.stamp,
  rs.risk_score AS reprint_risk,
  COALESCE(sci.last_card_bonus_pct, 0) AS completion_bonus,
  (SELECT COUNT(*) FROM prices_sold_raw psr 
    WHERE psr.variant_id = pc.variant_id 
      AND psr.sold_at > NOW() - INTERVAL '30 days') AS sales_30d,
  (SELECT MAX(pop_count) FROM pop_reports_timeseries pop 
    WHERE pop.variant_id = pc.variant_id 
      AND pop.grader = pc.grader 
      AND pop.grade = pc.grade) AS pop_current
FROM prices_consensus pc
LEFT JOIN card_variants cv ON cv.id = pc.variant_id
LEFT JOIN reprint_status rs ON rs.card_id = cv.card_id
LEFT JOIN set_completion_index sci ON sci.set_id = (SELECT set_id FROM tcg_cards WHERE id = cv.card_id);

CREATE UNIQUE INDEX ON v_prices_consensus_enriched (variant_id, lang, condition, grader, grade, market);
```

### 5.4 Indexes critiques

```sql
-- Pour les queries time-window
CREATE INDEX idx_sold_raw_recent ON prices_sold_raw (card_id, lang, sold_at DESC) 
  WHERE sold_at > NOW() - INTERVAL '90 days';

-- Pour la recherche full-text
CREATE INDEX idx_cards_search ON tcg_cards USING gin (to_tsvector('english', name));

-- Pour les jointures fréquentes
CREATE INDEX idx_consensus_card ON prices_consensus (variant_id);
CREATE INDEX idx_aliases_variant ON card_aliases (variant_id) WHERE variant_id IS NOT NULL;
```

---

## 6. Oracle Engine — algorithmes

### 6.1 VWAP avec decay exponentiel

```python
def vwap_with_decay(observations, half_life_days):
    """
    Volume-Weighted Average Price with exponential time decay.
    
    half_life_days: 7 (raw modern) | 30 (raw vintage/graded) | 90 (graded vintage)
    """
    now = utcnow()
    weighted_sum = 0
    weight_total = 0
    
    for obs in observations:
        age_days = (now - obs.sold_at).days
        time_weight = exp(-age_days / half_life_days)
        feedback_weight = obs.seller_feedback / 100  # 0.0 to 1.0
        weight = time_weight * feedback_weight
        
        weighted_sum += obs.price_eur * weight
        weight_total += weight
    
    return weighted_sum / weight_total if weight_total > 0 else None
```

### 6.2 MAD outlier rejection

```python
def reject_outliers(observations, threshold=3.0):
    """
    Median Absolute Deviation outlier rejection.
    Excludes observations where |x - median| > threshold × MAD × 1.4826
    
    threshold: 3.0 normal, 2.5 conservative, 4.0 permissive
    """
    if len(observations) < 4:
        return observations  # too few to detect outliers
    
    prices = [obs.price_eur for obs in observations]
    median_price = median(prices)
    abs_deviations = [abs(p - median_price) for p in prices]
    mad = median(abs_deviations) * 1.4826  # scale factor for normal distribution
    
    if mad == 0:
        return observations  # all same, no outliers
    
    return [obs for obs in observations 
            if abs(obs.price_eur - median_price) <= threshold * mad]
```

### 6.3 Confidence score (0-100)

```python
def confidence_score(observations, sources):
    """
    Multi-factor confidence scoring.
    """
    sample_size = len(observations)
    source_count = len(set(o.source for o in sources))
    
    # Factor 1: Sample weight (log scale, 0-30)
    sample_weight = min(30, 10 * log10(sample_size + 1))
    
    # Factor 2: Source diversity (0-25)
    source_weight = min(25, 8 * source_count)
    
    # Factor 3: Freshness (0-20)
    if observations:
        latest = max(o.sold_at for o in observations)
        age_days = (utcnow() - latest).days
        freshness_weight = max(0, 20 - age_days / 3)  # decays over 60 days
    else:
        freshness_weight = 0
    
    # Factor 4: Consistency (cross-source variance penalty, -25 to 0)
    if source_count >= 2:
        source_avgs = group_by_source_avg(observations)
        cov = coefficient_of_variation(source_avgs)
        consistency_penalty = -min(25, cov * 100)
    else:
        consistency_penalty = -10  # penalty for single source
    
    # Baseline
    baseline = 10
    
    score = baseline + sample_weight + source_weight + freshness_weight + consistency_penalty
    return clamp(int(score), 0, 100)
```

### 6.4 Scarcity multiplier (POP-based)

```python
def scarcity_multiplier(pop_count, grade, total_pop_set):
    """
    Adjust price based on POP report rarity.
    Tighter pop = higher price multiplier.
    """
    if pop_count is None or pop_count == 0:
        return 1.0
    
    # Relative rarity: ratio compared to set-wide average
    relative_rarity = total_pop_set / (pop_count * 100)
    
    # Grade premium: higher grades get more multiplier
    grade_factor = 1.0 + (grade - 8) * 0.15  # PSA 10 gets +30% vs PSA 8
    
    # Combine, cap at 2.5x
    return min(2.5, 1.0 + relative_rarity * grade_factor * 0.1)
```

### 6.5 Reprint risk adjustment

```python
def reprint_risk_score(card):
    """
    Heuristic 0-100 risk that a card will be reprinted soon.
    """
    score = 0
    
    # Age factor
    set_age_years = (now - card.set_release_date).years
    if 5 <= set_age_years <= 10:
        score += 30  # anniversary reprint window
    elif set_age_years > 25:
        score = 0  # too old, IP transferred, won't reprint
        return score
    
    # Set series
    if card.set_series in ['Wizards', 'Original-e']:
        return 0  # Wizards license ended
    
    # Card popularity
    if card.search_rank_30d < 100:
        score += 25  # chase cards more likely reprint candidate
    
    # Anniversary years approaching
    if card.next_anniversary_year - current_year <= 2:
        score += 20
    
    # Recent reprint history
    if card.was_reprinted_in_last_3y:
        score -= 30  # less likely to be reprint again soon
    
    # Pokemon Company recent strategy
    if card.set_series == 'Scarlet-Violet':
        score += 10  # ongoing series, more likely reprinted
    
    return clamp(score, 0, 100)

def reprint_adjustment(risk_score):
    """
    Price multiplier based on reprint risk.
    Risk 80+ → -20% adjustment.
    """
    if risk_score < 30:
        return 1.0
    elif risk_score < 60:
        return 1.0 - (risk_score - 30) * 0.005  # -0.5% per point
    else:
        return 0.85 - (risk_score - 60) * 0.0025  # -0.25% per point above 60
```

### 6.6 Lifecycle factor

```python
def lifecycle_phase(card):
    """
    Determine current phase of card's life cycle.
    """
    days_since_release = (now - card.release_date).days
    
    if days_since_release <= 7:
        return 'release_peak'
    elif days_since_release <= 30:
        return 'crash'
    elif days_since_release <= 180:
        return 'floor'
    elif days_since_release <= 365:
        return 'recovery'
    elif days_since_release <= 1095:  # 3 years
        return 'mature'
    else:
        return 'legacy'

def lifecycle_factor(phase, is_chase_card):
    """
    Adjust expected consensus price based on lifecycle.
    During crash, we discount expected mean reversion.
    """
    factors = {
        'release_peak': 1.05 if is_chase_card else 0.95,
        'crash': 0.85 if is_chase_card else 0.75,    # expect further down
        'floor': 0.95,
        'recovery': 1.05 if is_chase_card else 1.0,
        'mature': 1.0,
        'legacy': 1.02,  # slight appreciation premium
    }
    return factors.get(phase, 1.0)
```

### 6.7 Social momentum adjustment

```python
def social_adjustment(card_id, days=7):
    """
    Boost or discount based on recent social momentum.
    """
    recent = query_social_momentum(card_id, since=now - days)
    
    if not recent:
        return 1.0
    
    # Aggregate signals
    total_mentions = sum(r.mention_count for r in recent)
    avg_sentiment = mean(r.sentiment for r in recent)
    has_influencer = any(r.influencer_flag for r in recent)
    
    # Baseline mention rate for this card (30d average)
    baseline = avg_mentions_30d(card_id)
    momentum_ratio = total_mentions / (baseline * (days / 30) + 1)
    
    # Adjustment
    if momentum_ratio < 1.5:
        return 1.0  # normal activity
    elif momentum_ratio < 3.0:
        adj = 1.0 + (momentum_ratio - 1.5) * 0.04  # +2-6% boost
    else:
        adj = 1.06 + min(0.1, (momentum_ratio - 3) * 0.02)  # cap at +16%
    
    # Sentiment modifier
    if avg_sentiment < -0.3:
        adj *= 0.95  # negative buzz = mild discount
    elif avg_sentiment > 0.5:
        adj *= 1.02
    
    # Influencer kick
    if has_influencer:
        adj *= 1.03
    
    return adj
```

### 6.8 Final consensus formula

```python
def compute_consensus(variant_id, lang, condition, grader, grade, market):
    # 1. Fetch recent observations
    obs = query_sold_observations(variant_id, lang, condition, grader, grade, market, since=now - 90d)
    
    # 2. Reject outliers
    clean_obs = reject_outliers(obs)
    
    # 3. Compute VWAP
    half_life = pick_half_life(grader, age_of_card)
    base_vwap = vwap_with_decay(clean_obs, half_life)
    
    # 4. Apply multipliers
    scarcity = scarcity_multiplier(pop_count, grade, total_pop_set)
    reprint_adj = reprint_adjustment(reprint_risk_score(card))
    lifecycle = lifecycle_factor(lifecycle_phase(card), is_chase_card)
    social = social_adjustment(card_id)
    
    consensus = base_vwap * scarcity * reprint_adj * lifecycle * social
    
    # 5. Apply set completion bonus if applicable
    if is_last_card_in_set(variant_id):
        completion_bonus = set_completion_index(set_id).last_card_bonus_pct
        consensus *= (1 + completion_bonus / 100)
    
    # 6. Compute confidence
    confidence = confidence_score(clean_obs, sources=obs)
    
    return ConsensusResult(
        price_eur=consensus,
        confidence_pct=confidence,
        scarcity_multiplier=scarcity,
        reprint_adjustment=reprint_adj,
        lifecycle_factor=lifecycle,
        social_adjustment=social,
        sample_size=len(clean_obs),
        sources=list(set(o.source for o in clean_obs))
    )
```

---

## 7. Features différentiantes (12)

### 7.1 Grade or Sell Calculator

**UI** : drawer dans Holdings + Spotlight.

**Inputs** : carte raw + condition + grader cible.

**Output** : 
- Probabilité PSA 10 / PSA 9 / PSA 8 / lower (basé sur POP distribution)
- Prix attendu pondéré par probabilité
- Coûts (envoi + grading + commission revente)
- ROI net en €
- Verdict : "Grade", "Sell raw", "Hold"

### 7.2 Reprint Risk Indicator

**UI** : badge vert/orange/rouge sur chaque card display.

- Vert (risk 0-30) : "Reprint unlikely"
- Orange (31-60) : "Reprint possible"
- Rouge (61-100) : "Reprint risk high"

Tooltip explique : "Set vieux de 7 ans, anniversaire dans 18 mois, popularité forte → 72% risk."

### 7.3 Master Set Completion Bonus

**UI** : section dans Holdings showing "Sets en cours" avec :
- Pourcentage de complétion
- Cartes manquantes (avec prix consensus actuel)
- Bonus "Last 5%" en jaune (carte qui complète un set se vend +20-300%)

### 7.4 Cross-Grader Equivalence

**UI** : table dans drawer card showing prix par grader équivalent.

| Grade | PSA price | BGS equiv | CGC equiv |
|---|---|---|---|
| 10 | 14000€ | BGS 9.5 = 11000€ | CGC 10 = 9500€ |
| 9 | 1800€ | BGS 9 = 1400€ | CGC 9 = 1200€ |

Permet à un user d'évaluer s'il vaut mieux acheter BGS 9.5 et vendre en PSA 10 (cross-grader arbitrage).

### 7.5 Tournament Impact Alerts

**UI** : notification push + flag dans Daily Hub.

Trigger : Limitless TCG renvoie un nouveau tournament result. Si le winner deck contient des cartes en portfolio user → alert.

Message : "🏆 Roaring Moon ex a remporté Worlds 2026. Tu en possèdes 3, valeur estimée +25% dans les 7 prochains jours."

### 7.6 Lifecycle Phase Indicator

**UI** : badge dans Spotlight et Explorer.

Badges : `RELEASE PEAK` (rouge), `CRASH` (orange), `FLOOR` (jaune), `RECOVERY` (vert clair), `MATURE` (gris), `LEGACY` (or).

Avec graphique showing courbe attendue + position actuelle.

### 7.7 Buylist Optimizer (B2B / Sellers)

**UI** : feature Pro+ pour persona Seller.

Calcule prix d'achat optimal : `consensus_price × (1 - target_margin) × condition_factor`.

Export CSV de la buylist pour import dans son TPV.

### 7.8 Social Momentum Score

**UI** : index 0-100 dans Spotlight.

Avec sparkline 7j et breakdown sources :
- TikTok mentions : 1240 (+87% vs baseline)
- Reddit posts : 32 (+22%)
- YouTube videos : 4 (+0%)
- Top influencer : @username (12M views)

### 7.9 Submarket Premium Flag

**UI** : badge dans Spotlight pour cartes spéciales.

Badges : `TROPHY CARD`, `POKEMON CENTER`, `PRE-RELEASE STAMP`, `STAFF ONLY`, `PROTOTYPE`.

Chaque badge tooltips avec historique et data spécifique.

### 7.10 Fake Risk Score

**UI** : warning dans Deal Hunter sur listings suspects.

Calcul :
- Title contient `proxy|custom|fake|orica|holo upgrade` → 90+ risk
- Prix < 30% du consensus → 60+ risk
- Seller feedback < 95% → +20 risk
- Origine "Hong Kong" + "Asia exclusive" claim → +30 risk

### 7.11 Kodo Card Index (KCI)

**UI** : hero metric dans Daily Hub (à la place ou en plus de S&P-like Vintage Index actuel).

KCI = indice pondéré par "market cap" (= POP × consensus_price) des Top 100 cartes par marché.

Variantes :
- KCI-Global
- KCI-Vintage (Wizards era)
- KCI-Modern (Scarlet-Violet+)
- KCI-Japan
- KCI-Sealed

C'est **ton S&P500 du Pokemon**.

### 7.12 Predicted Fair Value (ML)

**UI** : tooltip "🤖 Predicted fair value: 12500€ (vs current 11200€)" → undervalued signal.

ML modèle (Phase tardive) : régression XGBoost ou LightGBM sur features card (set, rarity, lifecycle, POP, social, meta_relevance) → predicted price.

Confidence interval affiché.

---

## 8. AI/ML Layer

### 8.1 Use cases prioritaires

| Use case | Complexité | Impact | Priorité |
|---|---|---|---|
| **Title parsing eBay** (multi-variant detection) | Medium | High | P1 |
| **Time-series forecasting** (predicted prices) | Medium | High | P2 |
| **Anomaly detection** (outlier surveillance) | Low | Medium | P2 |
| **Card similarity embeddings** (pour cartes illiquides) | High | Medium | P3 |
| **Vision AI pre-grading** (analyse photo) | Very High | Very High | P4 |
| **Reinforcement learning** (Alpha Signal tuning) | Very High | Low | P5 |

### 8.2 Title parsing eBay (P1)

Le challenge : transformer `"2022 POKEMON JPN SWORD & SHIELD DARK PHANTASMA #073 FULL ART/PIKACHU PSA 10"` en :
```json
{
  "card_id": "swsh11-073",
  "lang": "JP",
  "variant": "full_art",
  "grader": "PSA",
  "grade": 10
}
```

**Solution** : LLM léger (Claude Haiku 4.5) avec prompt structuré JSON output, ou modèle fine-tuné Llama 3.2 hosted sur Modal/Replicate.

**Cost** : ~$0.0003 par title → 10000 titles/day = $1/jour.

**Alternative free** : Pokemon Price Tracker offre une "parse-title" endpoint dans son free tier (100/day).

### 8.3 Time-series forecasting (P2)

**Modèle** : Prophet ou NeuralProphet sur historical `prices_consensus` par carte.

Outputs :
- Predicted price 7d / 30d / 90d
- Confidence interval
- Trend direction (bull/bear/sideways)

**Cost** : 0€ (compute local, batch nightly via Modal free tier).

### 8.4 Anomaly detection (P2)

**Modèle** : Isolation Forest sur features :
- `price_change_24h`
- `volume_change_24h`
- `cross_source_variance`
- `social_mentions_change`

Outputs anomalies pour investigation (peut être bug, hype réelle, ou wash trade).

### 8.5 Card similarity embeddings (P3)

**Use case** : nouvelle carte released → 0 historique. Trouver 10 cartes les plus similaires (même set, même rareté, même artiste, même Pokemon, même HP, etc.) et fonder le pricing initial sur la moyenne.

**Modèle** : Sentence-BERT pour embeddings sur attributs textuels + features numériques. Stocké dans Postgres `vector` extension (pgvector).

### 8.6 Vision AI pre-grading (P4 — long terme)

**Vision** : user upload photo carte → IA détecte :
- Centering (1-10)
- Edges whitening (1-10)
- Corners damage (1-10)
- Surface scratches/print lines (1-10)
- Estimated PSA grade (probabilité par grade)

**Modèle** : fine-tuned ResNet50 ou EfficientNet sur dataset 50k+ cartes labellisées PSA.

**Cost** : training one-time $500-2000 sur Lambda Labs ou Vast.ai. Inference $0.001/image sur Modal.

**Différenciateur produit massif**. Mais P4 (post Series A).

### 8.7 Stack ML choisie

| Composant | Outil | Coût |
|---|---|---|
| Inference rapide LLM | Claude Haiku 4.5 (API) | $0.80/M tokens input |
| Training & batch | Modal (compute platform) | $30/mo budget |
| Vector store | pgvector sur Neon | 0€ |
| Embeddings | OpenAI text-embedding-3-small | $0.02/M tokens |
| Vision (futur) | Fine-tuned hosted on Modal | $50/mo après training |

**Budget AI/ML estimé** : 30-50€/mo une fois ML actif (phases 12+).

---

## 9. Infrastructure transverse

### 9.1 Stack technique consolidé

```
Frontend         → Next.js 16 + Turbopack + Tailwind + TypeScript (en place)
Auth             → Better Auth (en place)
Database         → Neon PG17 Frankfurt + TimescaleDB + pgvector (TimescaleDB à activer)
Storage          → Cloudflare R2 (en place, renommage bucket pending)
Orchestration    → Inngest (à setup)
Search           → Meilisearch self-hosted ou Algolia free tier
Real-time push   → Pusher Channels ou Ably (free tier 100 connections)
Cache L1         → In-memory LRU per Vercel instance
Cache L2         → Upstash Redis (free 10k commands/day)
Cache L3         → Postgres
Edge functions   → Vercel Edge Runtime
Observability    → Sentry + Better Stack + custom data quality dashboard
CI/CD            → GitHub Actions + Vercel deployments
LLM              → Anthropic Claude (Dexy AI en place)
Compute ML       → Modal (batch + inference)
```

### 9.2 Inngest workflows (orchestration)

20+ workflows planifiés. Quelques exemples critiques :

```typescript
// Refresh pricing tier S (every 6h)
inngest.createFunction(
  { id: "refresh-tier-s", retries: 3 },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const tierSCards = await step.run("fetch-tier-s", () => fetchTopCards(500));
    
    await Promise.all([
      step.run("ppt", () => ingestPPT(tierSCards)),
      step.run("cardmarket", () => ingestCardmarket(tierSCards)),
      step.run("poketrace", () => ingestPokeTrace(tierSCards)),
    ]);
    
    await step.run("recompute-consensus", () => recomputeConsensus(tierSCards));
    await step.run("update-alpha-signals", () => updateAlphaSignals(tierSCards));
  }
);

// On-demand pull (triggered by user view on cold card)
inngest.createFunction(
  { id: "pull-on-demand", retries: 2 },
  { event: "user/card.viewed" },
  async ({ event, step }) => {
    const cardId = event.data.cardId;
    const freshness = await getDataFreshness(cardId);
    
    if (freshness < 24) return; // already fresh
    
    await step.run("refresh-sources", () => refreshAllSources(cardId));
    await step.run("recompute", () => recomputeConsensus([cardId]));
    
    // Notify user via Pusher
    await step.sendEvent("user.card.pricing-updated", {
      userId: event.user.id,
      cardId,
    });
  }
);

// Tournament weekend refresh boost
inngest.createFunction(
  { id: "tournament-weekend-boost" },
  { event: "tournament/started" },
  async ({ event, step }) => {
    const tournamentId = event.data.tournamentId;
    const decklists = await step.run("fetch-decklists", () => fetchDeckLists(tournamentId));
    const cardIds = extractCardIds(decklists);
    
    // Boost refresh to 2h for next 72h
    await step.run("schedule-frequent-refresh", () => 
      scheduleRefresh(cardIds, "2h", "72h")
    );
  }
);

// Reprint announcement handler
inngest.createFunction(
  { id: "reprint-announcement" },
  { event: "reprint/announced" },
  async ({ event, step }) => {
    const { cardIds, reprintSetId } = event.data;
    
    await step.run("flag-reprint", () => flagReprintStatus(cardIds, reprintSetId));
    await step.run("recompute-immediate", () => recomputeConsensus(cardIds));
    await step.run("notify-portfolio-users", () => notifyAffectedUsers(cardIds));
  }
);
```

### 9.3 Search infrastructure

**Meilisearch self-hosted** sur Fly.io free tier ou Railway $5/mo.

Index `cards` avec :
- Searchable : name, set_name, rarity, artist
- Filterable : lang, set_id, rarity, has_holo, has_psa10
- Sortable : consensus_price, social_momentum, release_date

Latency typeahead : 5-20ms.

**Alternative** : Algolia free tier (10k searches/mois) si volume reste bas.

### 9.4 Real-time push layer

**Pusher Channels free tier** (100 connections, 200k messages/day).

Channels :
- `private-user-{userId}` : portfolio updates, alerts
- `public-prices-{cardId}` : updates pricing temps réel (broadcast)
- `private-whale-tracker` : whale moves (Pro only)

**Alternative** : Ably ou Supabase Realtime (mais on est sortis de Supabase).

### 9.5 Observability stack

```
Sentry        → errors, perf monitoring, releases
Better Stack  → uptime, logs aggregation, alerts
Inngest       → workflow observability built-in
Custom dashboards → /admin/data-quality, /admin/sync-status, /admin/sources-health
```

**Alerts critiques** :
- Source down > 30 min
- Pricing consensus stale > 48h
- Confidence avg drop > 10 points en 24h
- API error rate > 1%
- Database CPU > 80%
- Cardmarket API quota > 80%

---

## 10. Performance & Edge caching

### 10.1 Stratégie caching 3 niveaux

```
Request
  ↓
[L1: In-memory LRU]      ← Hit: < 1ms, 95% pricing reads
  ↓ miss
[L2: Upstash Redis]      ← Hit: 5-15ms, edge-cached
  ↓ miss
[L3: Postgres + Mat View] ← Hit: 20-50ms, baseline
  ↓
Response
```

### 10.2 Cache TTLs par data type

| Data | L1 TTL | L2 TTL | Invalidation trigger |
|---|---|---|---|
| Card metadata | 1h | 24h | manual / on update |
| Card images | 24h | 7d | manual |
| Consensus prices | 5min | 30min | Inngest event after recompute |
| POP reports | 6h | 7d | weekly cron |
| Tournament data | 1h | 6h | new tournament event |
| FX rates | 1h | 24h | daily cron |
| User portfolio | 30s | 5min | user action |

### 10.3 Vercel Edge Functions

Routes critiques en Edge runtime (latency global < 50ms) :
- `GET /api/cards/{id}` (lecture metadata)
- `GET /api/prices/{cardId}` (lecture consensus)
- `GET /api/search?q=...` (typeahead)
- `GET /api/market-indices` (KCI)

Edge ne peut pas accéder Postgres direct → bypass via Upstash Redis L2 ou edge-config snapshot daily.

### 10.4 Database performance

**Connection pooling** : Neon serverless driver pool automatique. Plus jamais `connection limit reached`.

**Read replicas** : Neon supporte read replicas même sur free tier. Une replica dédiée aux analytics queries (POP rolling, market indices computation) pour ne pas impacter pricing reads.

**Materialized views** : `v_prices_consensus_enriched` refreshée toutes les 5 min via Inngest.

**Compression TimescaleDB** : `prices_sold_raw` compressé après 30 jours → 10× moins d'espace, queries 2-3× plus rapides sur historique.

---

## 11. Roadmap d'exécution (20 phases regroupées en 4 produits)

### Vue d'ensemble — Mapping phases ↔ produits

Les phases techniques ne sont plus pensées comme un flot linéaire indépendant.
Elles sont regroupées en **4 produits autonomes** dont chacun est livrable et
utilisable sans les suivants. Voir `kodo-cards-versioning-strategy-v2.md`
pour le détail produit.

```
v0.9 BETA                 Pas de phase technique (polish + bug fixes)
                          → 2-3 semaines

v1.0 LE TRACKER           Pas de phase technique majeure
                          → Polish Holdings + Stripe + Master Sets
                          → 6 semaines

v2.0 LE TERMINAL          Phase 1 + Phase 2 + Phase 11p
                          → Inngest, PokemonPriceTracker, Observability
                          → 12 semaines

v3.0 L'ORACLE             Phase 0, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14
                          → Foundation, Cardmarket API, Oracle Engine,
                            Variants, Apify, Mercari/Yahoo JP, PSA POP,
                            Limitless, Smart refresh, Features Pack 1&2, KCI
                          → 18 semaines (~5 mois, le gros chantier)

v4.0 LA PLATEFORME        Phase 11 full + 15, 16, 17, 18, 19 + Mobile + API
                          → Better Stack paid, Social Momentum, AI Title,
                            Forecasting ML, Anomaly, Real-time push,
                            Mobile native, API publique
                          → 26 semaines (avec aide externe probable)
```

### Mapping détaillé phase → version

| Phase | Description | Version cible | Justification mapping |
|---|---|---|---|
| Phase 0 | Foundation (TimescaleDB + 10 tables) | **v3.0** | Le schema enrichi sert l'Oracle. v1.0/v2.0 utilisent le schema actuel suffisant. |
| Phase 1 | Inngest setup | **v2.0** | Le Terminal a besoin d'une orchestration stable pour les Alpha Signals. |
| Phase 2 | PokemonPriceTracker | **v2.0** | Donne un graded général "honnête" pour v2.0, avant l'Oracle complet en v3.0. |
| Phase 3 | Cardmarket API officielle | **v3.0** | Le grand débloquage EU/FR, justifie le rebranding "Oracle". |
| Phase 4 | Oracle Engine v1 (VWAP+MAD) | **v3.0** | Cœur du produit Oracle. |
| Phase 5 | Card Variants schema | **v3.0** | Indispensable pour pricing par grade granulaire. |
| Phase 6 | Apify eBay sold pipeline | **v3.0** | Fallback ciblé pour couverture sold prices. |
| Phase 7 | Mercari + Yahoo JP | **v3.0** | Couverture JP native, différenciateur Oracle. |
| Phase 8 | PSA Public API | **v3.0** | POP reports → scarcity multiplier Oracle. |
| Phase 9 | Limitless TCG + Tournament | **v3.0** | Tournament Impact alerts, feature collectible. |
| Phase 10 | Smart refresh dynamique | **v3.0** | Optimisation des coûts Apify pour Oracle. |
| Phase 11 (partial) | Sentry + Better Stack free + status page | **v2.0** | Observability minimum pour Le Terminal commercial. |
| Phase 11 (full) | Better Stack paid + dashboards complets | **v4.0** | Production-grade quand on a 30k users. |
| Phase 12 | Features Pack 1 (Reprint, Lifecycle, Fake) | **v3.0** | Features collectible-specific = essence Oracle. |
| Phase 13 | Features Pack 2 (Grade-or-Sell, Cross-Grader) | **v3.0** | Killer features Premium Oracle. |
| Phase 14 | KCI & Market Indices V2 | **v3.0** | Le "S&P500 Pokemon" = signature Oracle. |
| Phase 15 | Social Momentum | **v4.0** | Nice-to-have, pas critical pour Oracle. |
| Phase 16 | AI Title Parser | **v4.0** | ML layer arrive avec La Plateforme. |
| Phase 17 | Time-series Forecasting | **v4.0** | Predicted Fair Value pour Premium v4. |
| Phase 18 | Anomaly Detection | **v4.0** | Production quality at scale. |
| Phase 19 | Real-time push WebSocket | **v4.0** | Live experience pour mobile + Premium. |
| Phase 20 | Vision AI pre-grading | **v4.5+** | Post Series A, $500-2000 training cost. |

### Mapping inverse (par version)

**v0.9 Beta** : aucune phase technique majeure, juste polish
- Fix bug JP dropdown Holdings
- Fix Daily Hub glitch
- Page `/beta` avec waitlist
- Discord setup
- *Effort total : ~1 jour de dev*

**v1.0 Le Tracker** : aucune phase technique majeure de la spec
- Polish Holdings (limites Free, multi-binders, tags)
- Stripe + Better Auth subscriptions
- Onboarding 3 slides
- Email hebdo recap (Brevo)
- Theme creator Pro
- Status page + Sentry basique
- Master Sets system robuste
- Landing refonte axée Tracker uniquement
- Pricing graded supprimé (avec disclaimer "Oracle v3.0")
- *Effort total : ~6 semaines*

**v2.0 Le Terminal** :
- Phase 1 (Inngest)
- Phase 2 (PokemonPriceTracker pour graded général)
- Phase 11 partial (Observability minimum)
- Plus features non-spec : Alpha Signals v2, Deal Hunter avancé, Spreads, Whale Tracker, Dexy AI v2
- *Effort total : ~12 semaines*

**v3.0 L'Oracle** (le gros chantier) :
- Phase 0 (Foundation)
- Phase 3 (Cardmarket API officielle)
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
- Plus : B2B tier setup
- *Effort total : ~18 semaines (5 mois)*

**v4.0 La Plateforme** :
- Phase 11 full (Better Stack paid)
- Phase 15 (Social Momentum)
- Phase 16 (AI Title Parser)
- Phase 17 (Forecasting ML)
- Phase 18 (Anomaly Detection)
- Phase 19 (Real-time push)
- Plus : Mobile app native, API publique, SDK, white-label exploration
- *Effort total : ~26 semaines (6-7 mois)*

### Principe critique

> Les phases techniques **ne sont pas** ce que le user voit. Ce que le user voit
> est défini par la version produit. Les phases sont l'infrastructure qui
> permet aux versions de tenir leur promesse.

Une phase peut être 100% complète sans qu'un user le remarque — par exemple,
la Phase 0 (Foundation TimescaleDB) ne change rien à l'UI mais est nécessaire
pour livrer v3.0. La séparation entre "technique" et "produit" est délibérée.

---

## 12. Budget détaillé

### 12.1 Coûts mensuels par phase de maturité

| Phase | Outil | Coût démarrage | Coût croisière | Coût scale (1k+ users) |
|---|---|---|---|---|
| Always | Vercel Hobby | 0€ | 0€ → 20$ Pro | 20$ |
| Always | Neon Free | 0€ | 0€ → 19$ Pro | 19$ |
| Always | Cloudflare R2 | 0€ | ~2$ | ~5$ |
| Always | exchangerate.host | 0€ | 0€ | 0€ |
| Phase 1+ | Inngest | 0€ free | 0€ → 20$ team | 20$ |
| Phase 2+ | PokemonPriceTracker | 0€ free | 0€ → 9.99$ | 9.99$ |
| Phase 3+ | Cardmarket API | 0€ | 0€ | 0€ |
| Phase 6+ | Apify (eBay+JP) | 0€ ($5 credits) | 10-15€ | 20-30€ |
| Phase 8+ | PSA Public API | 0€ | 0€ | 0€ |
| Phase 9+ | Limitless TCG | 0€ | 0€ | 0€ |
| Phase 11+ | Sentry | 0€ free | 0€ → 26$ team | 26$ |
| Phase 11+ | Better Stack | 0€ free | 12$ | 24$ |
| Phase 11+ | Meilisearch (Fly.io) | 0€ | 5$ | 5$ |
| Phase 14+ | Upstash Redis | 0€ | 0€ → 10$ | 10$ |
| Phase 15+ | SerpAPI (social) | 0€ | 0€ (scrape direct) | 50$ |
| Phase 16+ | Claude Haiku | 0€ | 5-10$ | 30$ |
| Phase 17+ | Modal (ML compute) | 0€ free | 30$ | 50$ |
| Phase 19+ | Pusher Channels | 0€ free | 0€ → 49$ | 49$ |

### 12.2 Trois paliers budget

**Palier 1 — Démarrage (phases 0-10)** : **0-15€/mo**
- Tout en free tier, juste Apify minimal

**Palier 2 — Cruise (phases 11-15)** : **20-40€/mo**
- Better Stack actif, Apify scale, Cardmarket si quota upgrade

**Palier 3 — Scale (phases 16-20)** : **80-150€/mo**
- ML stack actif (Modal + Claude Haiku)
- Pusher Channels paid
- Vercel Pro + Neon Pro
- SerpAPI

À 100 Pro users (= 1000€/mo revenue), tu paies 0.8% du revenue en infra. À 500 Pro users (5000€/mo), 1.6%. **Économies d'échelle insolentes.**

### 12.3 Comparaison "buy" vs "build"

Si tu prends PokeTrace Pro $20/mo à la place de tout :
- Coût annuel : 240€
- Différenciation : 0
- Moat data : 0
- Vendor risk : 100%
- Revenu B2B futur : impossible (pas tes données)

Avec ton oracle propriétaire :
- Coût annuel an 1 : ~180-300€
- Différenciation : 12 features uniques
- Moat data : 5M+ transactions accumulées
- Vendor risk : 0% (8 sources redondantes)
- Revenu B2B futur : 6-7 figures potential (licensing data)

**Conclusion** : build is 100× better ROI.

---

## 13. Métriques de succès

### 13.1 Technical KPIs

| Métrique | Cible Mois 3 | Cible Mois 12 | Méthode mesure |
|---|---|---|---|
| Coverage sold prices | 80% top 5k | 95% top 30k | Count consensus rows |
| Confidence moyenne | > 60 | > 75 | AVG(confidence_pct) |
| Latency p95 API pricing | < 200ms | < 100ms | Sentry/Better Stack |
| Sources up time | > 95% | > 99% | Better Stack |
| Refresh freshness top 100 | < 12h | < 6h | NOW() - MAX(updated_at) |
| Database query p95 | < 200ms | < 50ms | Neon metrics |
| Inngest function success rate | > 95% | > 99% | Inngest dashboard |
| MTTD source failure | < 30min | < 5min | Better Stack alerts |

### 13.2 Product KPIs

| Métrique | Cible Mois 3 | Cible Mois 12 |
|---|---|---|
| Active Daily Users (DAU) | 100 | 1500 |
| Free → Pro conversion | 1.5% | 4% |
| Churn mensuel Pro | < 10% | < 5% |
| NPS | > 40 | > 60 |
| Pro features usage rate | 60% | 80% |
| Sessions per DAU | 2.5 | 4 |
| Time per session | 4 min | 8 min |
| Alpha signals click-through | 15% | 35% |

### 13.3 Business KPIs

| Métrique | Mois 3 | Mois 6 | Mois 12 | Mois 24 |
|---|---|---|---|---|
| Pro users | 30 | 200 | 1500 | 6000 |
| MRR | 300€ | 2000€ | 15000€ | 60000€ |
| ARR | 3.6k€ | 24k€ | 180k€ | 720k€ |
| Affiliate revenue | 0€ | 200€ | 2000€ | 8000€/mo |
| B2B contracts | 0 | 0 | 2 | 8 |
| LTV/CAC | n/a | 3× | 6× | 10× |

### 13.4 Dashboard de monitoring

`/admin/kpis` (à construire en Phase 11) :
- Real-time DAU/WAU/MAU
- Conversion funnel Free → Pro
- Source health matrix
- Cost burn rate vs revenue
- Top 10 anomalies investigation

---

## 14. Risques & mitigation

### 14.1 Risques techniques

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Cardmarket API throttling | Medium | High | Backoff + secondary scrape fallback |
| Apify quota dépassé | Medium | Medium | Budget cap automatique, alertes |
| Neon DB outage | Low | Critical | Backup automatique, PITR, restore docs |
| Vercel rate limits | Low | High | Edge caching agressif, Cloudflare CDN |
| TimescaleDB compatibility | Low | High | Test extensif staging avant migration prod |
| Inngest free tier dépassé | Low | Medium | Optimize event volume, upgrade si besoin |
| Anti-bot on scrape sources | Medium | Medium | Rotation user-agents, residential proxies si besoin |
| API source ferme (PPT, PokeTrace) | Low | High | 8 sources, fallback automatique |

### 14.2 Risques business

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Concurrent FR lance similaire | Medium | High | Speed-to-market, moat data accumulé |
| TPCi enforcement copyright | Low | Critical | Pas d'images TPCi reproduites, fair use |
| User acquisition lente | Medium | High | SEO + tools magnet + influenceurs FR |
| Churn élevé phase Pro | Medium | High | Continuous feature delivery, NPS tracking |
| Concurrent US (Alt.xyz, Card Ladder) entre EU | Low | High | Differentiation FR/EU/JP + UX française |

### 14.3 Risques légaux

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| RGPD non-conformité | Low | High | Audit RGPD avant 100 users, DPO si dépassement |
| eBay ToS breach (scraping) | Medium | Medium | Apify (légalement managed), API officielle dès dispo |
| Cardmarket ToS | Low | Medium | API officielle = conformité totale |
| Mercari/Yahoo JP juridiction | Low | Low | Données publiques agrégées, no PII |

### 14.4 Risques équipe

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Solo founder burnout | Medium | Critical | Pacing 1-2 sessions/sem, hire CTO Q3 |
| Bus factor 1 | High | Critical | Documentation exhaustive (ce doc !), code commentaire |
| Manque expertise scraping | Low | Medium | Apify gère le complexe, fallback consultants |

---

## 15. Monétisation diversifiée

Au-delà du SaaS Pro 9,99€/mo, 6 streams de revenus identifiés :

### 15.1 Affiliate revenue (immediate)

- **eBay Partner Network** : 1-4% commission sur achats venant de Kodo Cards
- **Cardmarket Partner Program** : 5% commission
- **PSA Submission referral** : commission sur soumissions gradation

**Implémentation** : tracking links dans Deal Hunter + Spotlight + Grade-or-Sell calculator.

**Potential** : 200€/mo dès 500 DAU, 5000€/mo à 5000 DAU.

### 15.2 B2B Data Licensing (M6+)

Une fois 6 mois de data accumulée, licence du dataset :
- **Boutiques TCG** (BBT, Asgard, Pokebip Shop, etc.) : 99-299€/mo pour API access
- **Fonds collectibles** : 500-2000€/mo pour real-time feed
- **Plateformes concurrentes** : white-label data

**Potential** : 5 contrats à 200€/mo = 1000€/mo passif.

### 15.3 White-label (M12+)

Architecture est game-agnostic. Replicate pour :
- One Piece TCG (marché en croissance)
- Disney Lorcana
- Magic the Gathering (concurrentiel mais large)
- Yu-Gi-Oh!

Branded as "Kodo Cards Lorcana" etc.

**Potential** : 1 partenariat = 5-50k€ setup + revenue share.

### 15.4 Premium reports & newsletters

- "Monthly Market Insights" PDF : 19€/issue ou 9€/mo subscription
- "Worlds 2026 Investment Guide" one-shot : 49€
- "Vintage FR Buying Guide 2026" : 29€

**Potential** : 100 buyers × 19€ = 1900€/issue.

### 15.5 SEO Traffic monetization

30k+ pages indexables (chaque carte = 1 page). Avec rich snippets et bon SEO :
- Display ads via Mediavine ou Ezoic (après 10k page views/mo)
- Sponsored content niches (booster boxes, gradation services)

**Potential** : 50-200€/mo à 100k page views/mo.

### 15.6 Marketplace fees (futur, post Series A)

Si Kodo Cards lance sa propre marketplace (M18+) :
- 1.5% transaction fee (vs Cardmarket 5%)
- Vault service Delaware-style
- Authentication + insurance

**Potential** : massif, mais nécessite capital pour lancer.

### 15.7 Revenue breakdown projeté

| Source | Mois 6 | Mois 12 | Mois 24 |
|---|---|---|---|
| Pro subscriptions | 2000€ | 15000€ | 60000€ |
| Affiliate | 200€ | 2000€ | 8000€ |
| B2B Data API | 0€ | 1000€ | 5000€ |
| Premium reports | 200€ | 1000€ | 3000€ |
| Display ads | 0€ | 100€ | 1500€ |
| **Total MRR** | **2400€** | **19100€** | **77500€** |
| **ARR projeté** | **28k€** | **230k€** | **930k€** |

---

## 16. Benchmark concurrentiel

### 16.1 Concurrents directs/indirects

| Concurrent | Marché | Tech | Force | Faiblesse |
|---|---|---|---|---|
| **Card Ladder** | TCG mondial (owned by Collectors Holdings / PSA parent) | API massive, mobile app | Multi-game, owned by PSA | US-first, design daté, pas FR |
| **Alt.xyz** | Sport US + Pokemon | Vault, marketplace, Alt Value algo, $306M raised | Capital massif, marketplace integration | Pas Pokemon-first, pas FR |
| **PriceCharting** | Tout collectibles | DB historique long | Historique 10+ ans | UX vieille, pas IA, pas EU |
| **PokemonPriceTracker** | Pokemon TCG | API-first, dev-friendly | Bon API, prix bas | Pas d'app user, no différentiation |
| **PokéWallet** | Pokemon TCG | API + dashboards | Free generous | Récent, pas de community |
| **130point** | eBay Pokemon | Best Offer detection | Niche niche | Pas Pokemon-specific, pas EU |
| **Collectr** | Pokemon mobile | Scanning + tracking mobile | UX mobile soignée | Pas pro tools, pas FR-native |
| **Pricecharting** | Multi-collectibles | Historic data | Long historique | Slow, ugly UX |
| **JustTCG** | Multi-TCG dev API | API dev-focused | Multi-game data | No app, just API |
| **Pokebip Shop** (FR) | Boutique FR | Forum communautaire | FR community | Pas un terminal, juste boutique |
| **Pokemon.fr** (Pokecardex héritier) | FR DB | DB cartes FR | FR-native | Database only, pas pricing |

### 16.2 Position Kodo Cards

```
                        FR/EU coverage
                              ▲
                              │
    Card Ladder               │              Kodo Cards (cible)
    Alt.xyz                   │              ★
                              │
    PriceCharting             │     PokemonPriceTracker
    JustTCG                   │     PokeWallet
                              │
   ───────────────────────────┼──────────────────────────► 
                              │     Differentiation features
    130point                  │     Pokebip Shop
    Collectr                  │     Pokemon.fr
                              │
                              │
                              ▼
```

**Quadrant Kodo Cards** : Haute différenciation + Native FR/EU coverage = **unique sur le marché**.

### 16.3 Différenciateurs défendables long terme

| Diff | Pourquoi défendable |
|---|---|
| **FR/EU native** | Concurrents US-first peinent à comprendre Cardmarket, PCA, CCC |
| **12 features collectible-specific** | Aucun ne fait Grade-or-Sell + Reprint Risk + Set Completion |
| **Multi-source moat** | 8 sources avec algos propriétaires = très coûteux à répliquer |
| **JP native data** | Mercari + Yahoo JP rare chez concurrents (langue, accès) |
| **Snow+ design system** | UX premium "Apple-like" rare sur le marché TCG |
| **Dexy AI integration** | Claude-powered, expérience conversationnelle unique |
| **Whale Tracker FR** | Suivi des gros collectionneurs européens, info exclusive |

### 16.4 Threats à surveiller

1. **Card Ladder lance offre EU** : peu probable court terme (US focus)
2. **PSA lance pricing tool natif** : possible 2027+
3. **Pokemon Company lance tool officiel** : très peu probable (pas leur business)
4. **Concurrent FR émerge** : real risk → speed-to-market critique
5. **eBay/Cardmarket coupe access scraping** : mitigated par API officielle Cardmarket et 8 sources

---

## 17. Resilience & DR

### 17.1 Backup strategy

```
Neon PITR (Point-in-Time Recovery)
  ├─ 7 days retention free tier
  └─ Upgrade to 30 days at Neon Pro

Daily logical backup
  ├─ pg_dump via GitHub Action cron
  ├─ Encrypted with age, key in 1Password
  └─ Stored in Cloudflare R2 bucket `kodocards-backups`

Weekly archive
  ├─ Full snapshot to R2 cold storage
  └─ 12 months retention

Critical config backup
  ├─ Vercel env vars exported monthly
  ├─ Encrypted, stored in 1Password
  └─ GitHub secrets cataloged in private docs
```

### 17.2 Failover scenarios

**Scenario 1 — Source primary down (e.g., Cardmarket API)** :
- Inngest automatic retry 3×
- Fallback to PokemonPriceTracker + PokeTrace
- Mark as `degraded` mode in observability
- Email alert if down > 30min

**Scenario 2 — Neon outage** :
- Read replicas serve reads (Neon supports HA)
- Writes queued in Inngest, replayed when DB back
- Status page `status.kodocards.com` (Better Stack)

**Scenario 3 — Vercel deploy fails** :
- Auto-rollback to previous deployment
- Promotion strategy : preview → staging → prod
- Smoke tests post-deploy

**Scenario 4 — Total data loss (worst case)** :
- Restore from R2 weekly archive (max 7 days loss)
- Replay ingestion from sources (Cardmarket has 30d history, PSA POP weekly cached)
- Estimated full restore time : 6-12 hours

### 17.3 Runbooks (à écrire)

- `docs/runbooks/source-down.md`
- `docs/runbooks/db-outage.md`
- `docs/runbooks/quota-exceeded.md`
- `docs/runbooks/auth-incident.md`
- `docs/runbooks/data-quality-anomaly.md`
- `docs/runbooks/secrets-rotation.md`

Chaque runbook : diagnostic steps, decision tree, escalation contacts.

### 17.4 Disaster Recovery objectives

- **RTO** (Recovery Time Objective) : 4 hours
- **RPO** (Recovery Point Objective) : 24 hours
- **MTTD** (Mean Time To Detect) : 5 minutes
- **MTTR** (Mean Time To Recovery) : 1 hour

---

## 18. Sécurité & compliance

### 18.1 Sécurité applicative

- **Auth** : Better Auth + sessions HttpOnly cookies + CSRF protection
- **RLS** : Row-level security Postgres sur user data
- **API rate limiting** : Upstash Ratelimit per IP + per user
- **Secrets management** : Vercel encrypted env vars + 1Password backup
- **SQL injection** : 100% parameterized queries (Drizzle / `@neondatabase/serverless` template literals)
- **XSS** : React auto-escape + CSP headers strict
- **CORS** : whitelisted origins only
- **HTTPS only** : HSTS preload, no HTTP

### 18.2 Sécurité infrastructure

- **DDoS protection** : Cloudflare + Vercel built-in
- **Penetration testing** : externe avant Series A (estimé 3-5k€)
- **Bug bounty program** : public via Huntr ou Bugcrowd (post-launch)
- **Dependabot** : auto-PR pour security patches
- **Secret scanning** : GitHub native + git-secrets pre-commit
- **Audit logs** : toutes mutations DB loggées (Inngest fournit)

### 18.3 RGPD compliance

- **Data minimization** : seulement email + password hash + portfolio data
- **Right to access** : `/account/export` exports JSON
- **Right to deletion** : `/account/delete` cascade delete sous 30 jours
- **Right to portability** : export CSV portfolio
- **Cookie banner** : Cookiebot ou solution self-hosted, conforme CNIL
- **DPA partners** : Apify, Vercel, Neon, Sentry — tous DPA signés
- **Registre des traitements** : maintenu et accessible
- **DPO** : externe si dépassement seuil

### 18.4 Légal documents (à rédiger Phase 0)

- **CGU** (Conditions Générales d'Utilisation)
- **CGV** (Conditions Générales de Vente — Pro plan)
- **Politique de confidentialité**
- **Mentions légales** (SAS recommandée vs auto-entrepreneur actuel)
- **Politique de cookies**
- **CGV API B2B** (pour phase B2B)

Recommandation : LegalStart ou avocat spécialisé tech (~800-1500€ one-shot).

### 18.5 Conformité financière

- **TVA UE** : seuil 35k€ FR. Au-delà → IOSS si vente UE.
- **Statut juridique** : auto-entrepreneur OK jusqu'à ~70k€ CA, puis SAS recommandée
- **Facturation** : Stripe Tax intégré, gère TVA automatique
- **Comptabilité** : Pennylane ou DougsCompta automatique

---

## Annexes

### A. Glossaire technique TCG

- **TCG** : Trading Card Game (Pokemon TCG = Pokemon Trading Card Game)
- **PSA** : Professional Sports Authenticator, leader gradation US
- **BGS** : Beckett Grading Services
- **CGC** : Certified Guaranty Company
- **SGC** : Sportscard Guaranty Corporation
- **PCA** : Professional Card Authentication, leader gradation FR
- **CCC** : Certified Cards Collectibles, gradation EU
- **MNT** : Mint, gradation JP
- **POP** : Population Report, nombre de cartes graded à un grade donné
- **NM** : Near Mint, condition raw
- **LP** : Lightly Played
- **MP** : Moderately Played
- **HP** : Heavily Played
- **DMG** : Damaged
- **Master Set** : Collection complète d'un set incluant toutes variantes (holo, reverse, secret rares)
- **Chase card** : Carte la plus désirée d'un set
- **Sealed** : Produit non ouvert (booster box, ETB, etc.)
- **ETB** : Elite Trainer Box
- **Holo** : Holographic
- **Reverse Holo** : Holographic reverse (effet holo sur le fond, pas l'illustration)
- **Cosmos Holo** : Pattern holo "étoiles", vintage Wizards
- **Crystal Holo** : Pattern holo "cristal", vintage Wizards
- **1st Edition** : Première impression d'une carte vintage, prime
- **Shadowless** : Sans ombre sous l'illustration, Base Set 1999 uniquement
- **Unlimited** : Impression standard sans 1st Edition stamp
- **Pre-release** : Stamp tournoi pre-release
- **Promo** : Carte promotionnelle hors-set
- **Trophy card** : Carte de récompense tournoi, ultra-rare
- **VWAP** : Volume-Weighted Average Price
- **MAD** : Median Absolute Deviation
- **KCI** : Kodo Card Index (proposé)

### B. Liens documentation sources

- Cardmarket API : https://api.cardmarket.com/ws/documentation
- PokeTrace : https://poketrace.com/docs
- PokemonPriceTracker : https://www.pokemonpricetracker.com/pokemon-card-price-api
- PSA Public API : https://www.psacard.com/publicapi
- Limitless TCG : https://limitlesstcg.com/api
- Apify : https://apify.com/automation-lab/ebay-sold-scraper
- Inngest docs : https://www.inngest.com/docs
- TimescaleDB on Neon : https://neon.tech/docs/extensions/timescaledb
- pokemontcg.io v2 : https://docs.pokemontcg.io

### C. Personas mapping (depuis Personas.docx)

| Persona | Code | Pricing besoin | Features priorisées |
|---|---|---|---|
| Expert Collectionneur | "Le Gardien" | Prix d'achat fair | Master Set Bonus, Reprint Risk, Wishlist |
| Trader Opportuniste | "Le Chasseur" | ROI rapide | Alpha Signals, Deal Hunter, Buylist |
| Investisseur Long Terme | "La Baleine" | VWAP 90j stable | Whale Tracker, KCI, Lifecycle Phase |
| Grading Arbitrage | "Grading Hunter" | Grade-or-Sell ROI | Grade-or-Sell Calculator, POP reports |
| Revendeur Pro | "Seller" | Buylist marge | Buylist Optimizer, API B2B |
| Chasseur de Hype | "Trend Follower" | Momentum signal | Social Momentum, Tournament Impact |

### D. Décisions architecturales documentées (ADR)

- ADR-001 : Build vs Buy → Build (oracle propriétaire)
- ADR-002 : Neon vs Supabase → Neon (déjà migré)
- ADR-003 : Inngest vs custom queue → Inngest (free tier suffit)
- ADR-004 : TimescaleDB activation → activated Phase 0
- ADR-005 : Meilisearch vs Algolia → Meilisearch (self-hosted, control)
- ADR-006 : Pusher vs Ably → Pusher (free tier généreux)
- ADR-007 : Claude Haiku pour title parsing → choisi (vs OpenAI gpt-4o-mini)

### E. Calendrier suggéré (par produit, ~18 mois)

```
v0.9 BETA PRIVÉE                                   Now → M+0.5
  Sem. 1-3       Polish + bug fixes + community setup
                 (Pas de phase technique majeure)

v1.0 LE TRACKER                                    M+0.5 → M+2
  Sem. 4-5       Polish Holdings + Master Sets
  Sem. 6-7       Stripe + Better Auth subscriptions
  Sem. 8         Onboarding + email recap + theme creator
  Sem. 9         Landing refonte + status page
  
v2.0 LE TERMINAL                                   M+2 → M+5
  Sem. 10        Phase 1 Inngest setup
  Sem. 11        Phase 2 PokemonPriceTracker
  Sem. 12        Phase 11 partial Observability
  Sem. 13-14     Refonte Market Terminal + indices
  Sem. 15-16     Alpha Signals engine v2
  Sem. 17-18     Deal Hunter avancé
  Sem. 19        Spreads "Pour toi" + Whale custom lists
  Sem. 20        Dexy AI v2 + push notifications
  Sem. 21        Polish + marketing assets v2.0
  
v3.0 L'ORACLE                                      M+5 → M+10 (gros chantier)
  Sem. 22        Phase 0 Foundation (TimescaleDB)
  Sem. 23-24     Phase 3 Cardmarket API officielle
  Sem. 25-26     Phase 4 Oracle Engine v1
  Sem. 27-28     Phase 5 Card Variants
  Sem. 29        Phase 8 PSA Public API
  Sem. 30        Phase 6 Apify eBay sold
  Sem. 31-32     Phase 7 Mercari + Yahoo JP
  Sem. 33-34     Phase 12 Features Pack 1
  Sem. 35-36     Phase 13 Features Pack 2
  Sem. 37        Phase 14 KCI
  Sem. 38        Phase 9 Limitless TCG
  Sem. 39        Phase 10 Smart refresh
  Sem. 40-41     B2B tier + migration UX + whitepaper

v4.0 LA PLATEFORME                                 M+10 → M+18 (avec aide externe)
  Sem. 42-43     Phase 11 full Observability
  Sem. 44-45     Phase 15 Social Momentum
  Sem. 46        Phase 16 AI Title Parser
  Sem. 47-49     Phase 17 Forecasting ML
  Sem. 50        Phase 18 Anomaly Detection
  Sem. 51-52     Phase 19 Real-time push WebSocket
  Sem. 53-60     Mobile app native (React Native)
  Sem. 61-64     API publique + SDK + docs
  Sem. 65-66     Marketing Series A + pitch deck v4
  Sem. 67-68     Launch mobile + PR

LATER (post Series A)
  Phase 20 Vision AI pre-grading (3 sessions, ~$500-2000 training)
  v5.0 Cross-game (Lorcana, OPCG) — architecture déjà prête
```

**Total : ~68 semaines = 16-18 mois** du lancement v0.9 à v4.0 Series A.

Note : ce calendrier suppose ~30h/sem dev en solo jusqu'à v3.0, puis aide externe
ou full-time founder à partir de v4.0. Ajuster selon disponibilité réelle.

---

## Conclusion

Ce document est ta source de vérité technique sur **quoi construire et comment**.
Il se lit conjointement avec `kodo-cards-versioning-strategy-v2.md` qui définit
**dans quel ordre et pour qui** ces phases sont livrées (regroupées en 4 produits
autonomes : Le Tracker, Le Terminal, L'Oracle, La Plateforme).

À garder versionné dans le repo (`docs/`), mettre à jour à chaque phase complétée.

**Prochaine action recommandée** :
1. Compléter v0.9 Beta (2-3 sem, polish + community)
2. Attaquer v1.0 Le Tracker (6 sem, focus persona Gardien)
3. Phase 0 Foundation arrive seulement en v3.0 (M+5 à M+10)

Décisions techniques à prendre avant v3.0 :
1. Activer TimescaleDB sur Neon (1 click, gratuit)
2. Créer compte Inngest (gratuit) — utile dès v2.0
3. Setup compte Cardmarket Developer Program — utile dès v3.0

---

*Document préparé en mai 2026 pour Alon, founder de Kodo Cards. Version 4, sujet à révisions trimestrielles. Voir aussi `kodo-cards-versioning-strategy-v2.md`.*
