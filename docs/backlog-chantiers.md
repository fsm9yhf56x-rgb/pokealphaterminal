
## Alertes prix (chantier futur - 21/06)
- Aucun systeme d'alerte (pas de table price_alerts, pas de notif).
- goal_wishlist a deja un champ target_price INUTILISE = socle naturel.
- A construire: table/champ + detection changement prix + notification (email/in-app) + cron verif + UI gestion.
- NE PAS bacler "au passage" - chantier dedie (infra notifications).
- Offre prevoit "wishlist + alertes 3 max" pour Free.
- Quand fait: brancher sur goal_wishlist.target_price.
