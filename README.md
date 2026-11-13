# EventHub — Plateforme de gestion d'événements et de billetterie

Application web de création, publication et réservation d'événements, réalisée dans le cadre du module **Coordination du développement Front et Back** (Mastère 2 — Ynov).

---

## Architecture du dépôt

Conformément à notre décision d'architecture ([ADR-001](docs/adr/ADR-001-architecture-spa-api-unifiee.md)), le projet suit une architecture découplée **SPA + API REST unifiée** :

- **`frontend/`** : Application Single Page (React + Vite)
- **`backend/`** : API REST unifiée (NestJS + TypeORM) regroupant les domaines *Users*, *Events* et *Ticketing*
- **`docs/`** : Documentation technique, schémas et décisions d'architecture (ADR)
- **`documentation/`** : Audit initial et livrables d'ateliers

---

## Démarrage rapide (moins de 15 minutes)

### Prérequis
- **Docker** et **Docker Compose** v2+
- **Node.js 22 LTS** (optionnel, pour l'exécution hors conteneur)

### 1. Configuration de l'environnement
Copier le fichier d'exemple pour initialiser les variables d'environnement locales :

    cp .env.example .env

### 2. Lancement de la stack complète
Démarrer la base de données PostgreSQL 16, l'API NestJS et le Front-end React en une seule commande :

    docker compose up --build

---

## URLs locales (une fois démarré)

| Service | URL | Description |
| :--- | :--- | :--- |
| **Front-end (Web)** | `http://localhost:5173` | Interface utilisateur React / Vite |
| **API REST (Back)** | `http://localhost:3000/api` | Point d'entrée de l'API NestJS |
| **Documentation OpenAPI** | `http://localhost:3000/api/docs` | Interface interactive Swagger UI |
| **PostgreSQL** | `localhost:5432` | Base de données relationnelle (`eventhub`) |

---

## Comptes de démonstration (Seed)

- **Organisateur / Admin :** `admin@eventhub.local` / `Admin1234!`
- **Participant :** `user@eventhub.local` / `User1234!`

---

## Documentation et qualité

- [Cartographie initiale & Audit (Atelier 1)](documentation/ATELIER-1-CARTOGRAPHIE-EVENTHUB.md)
- [ADR-001 : Architecture découplée SPA + API REST unifiée](docs/adr/ADR-001-architecture-spa-api-unifiee.md)
