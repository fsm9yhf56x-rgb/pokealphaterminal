# Regle de prix de reference — Kodo Engine

## Principe
Le prix de reference d'une carte = **la source avec le plus de ventes pour cette carte**,
a etat/grade egal. Dynamique : la source dominante depend du marche de chaque carte.

## Sources eligibles au classement (volume comptable)
- eBay sold (vraies ventes finalisees)
- TCGPlayer sold
- Cardmarket "CM Price Trend" (source `cardmarket` AGGREGATED, volume "100+ ventes")
- PPT gradé (`ppt_ebay`, pour les cartes notees)

La source retenue est celle au plus grand `sale_count` pour le tier/grade demande.

## Sources EXCLUES du prix de reference (mais affichees a part)
- Cardmarket Listings (`cardmarket_unsold`, is_asking=true) = ANNONCES, pas des ventes.
  Affichees separement, etiquetees "annonce" / "listing". Jamais en prix dominant.

## Comparaison a etat/grade egal
"Plus de ventes" se compare au sein du meme tier : pour une carte NM, on compare le
sale_count NM de chaque source. On ne compare jamais le NM d'une source au PSA10 d'une autre.

## Affichage
Toujours indiquer l'origine du prix : "d'apres X ventes sur [source]".
Transparence totale facon PokeTrace : chaque source dans son bloc, etiquetee.

## Comportement attendu (valide sur PokeTrace)
- Carte US / vintage -> TCGPlayer gagne (gros volume). Ex: Alakazam Holo = TCGPlayer.
- Carte EU / recente -> Cardmarket gagne (seul marche actif). Ex: Breloom = Cardmarket.
- Carte FR -> Cardmarket FR (le FR ne se vend ni sur eBay US ni TCGPlayer).
La regle dynamique s'adapte sans rien forcer.

## Fallback
Si aucune source a ventes comptables : Cardmarket trend etiquete "tendance" (pas "vendu").
Si vraiment rien : "pas de cote".

## A implementer (demain, FR ingere)
- scripts/kodo-compute-signals.js : fair_value = source max(sale_count) par tier
- /api/cron/portfolio-prices : current_price suit la meme regle
- Affichage : exposer la source retenue (deja partiellement fait : drapeau US->$ / EU->EUR)

## Note importante
PokeTrace ne moyenne PAS CM Trend et CM Listings : il les affiche en 2 blocs separes.
Kodo fait pareil : Trend (eligible reference) vs Listings (annonces, a part).
