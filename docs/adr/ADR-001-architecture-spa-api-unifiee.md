# ADR-001 : Simplification vers une architecture découplée SPA + API REST unifiée

- **Statut :** Accepté (2026-11-13)
- **Décideurs :** Équipe EventHub (Arnaud, Claudia, Chloé, Kenzo, Robin)

## Contexte

Le dépôt initial (`event-platform-main`) reposait sur une architecture microservices distribuée composée de 4 services NestJS (`api-gateway`, `users-service`, `events-service`, `ticketing-service`), d'un broker RabbitMQ et de 3 bases de données PostgreSQL distinctes, sans service Front-end intégré dans Docker Compose.

Dans le cadre du module *Coordination du développement Front et Back* (21 heures de TD), les enjeux principaux portent sur le contrat OpenAPI 3.x, la pyramide de tests, l'intégration continue multi-couches et la gestion de la concurrence sur les réservations.

## Décision

Conserver le découplage Front/Back recommandé par le cours tout en simplifiant l'infrastructure vers **3 briques principales** :
1. **Front-end (`frontend/`) :** Application SPA React + Vite (extraite depuis `services/users-service/ui`).
2. **Back-end (`backend/`) :** Application unique **NestJS** regroupant les domaines *Users*, *Events* et *Ticketing* en architecture en couches (Contrôleur, Service, Dépôt).
3. **Base de données :** Instance unique **PostgreSQL 16**.

Les composants RabbitMQ, `notifications-service` (emails simulés dans le périmètre MVP) et `payment-service` sont écartés.

## Alternatives écartées

- **Conserver les microservices et RabbitMQ :** Coût d'exploitation, de maintenance CI/CD et de synchronisation asynchrone disproportionné par rapport à la taille de l'équipe (5 personnes) et à la durée du projet.
- **Monolithe à rendu serveur (MPA) :** Écarté afin de conserver le découplage Front/Back piloté par contrat OpenAPI 3.x.

## Conséquences

- **Positives :**
  - Démarrage local unifié en une seule commande (`docker compose up`) avec 3 conteneurs (`db`, `api`, `web`).
  - Transactions ACID natives en base PostgreSQL pour gérer le conflit sur la dernière place disponible sans verrou distribué.
  - Pipelines CI/CD simplifiés (Front, Back, Contrat OpenAPI) et temps d'exécution réduit sous les 10 minutes.
- **Négatives :**
  - Nécessite une phase initiale de rapatriement des modules métier existants (`users`, `events`, `ticketing`) dans l'API Back-end unique et de déplacement du Front-end.
