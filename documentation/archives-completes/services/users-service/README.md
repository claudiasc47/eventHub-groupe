# Users Service

## Rôle du service
Le **users-service** est responsable de la gestion des utilisateurs de la plateforme.
Il centralise l’authentification, l’autorisation et la gestion des profils.

Il fournit :
- la création des utilisateurs
- l’authentification via JWT
- la gestion des rôles (admin, organizer, participant)
- l’accès aux informations du profil utilisateur

---

## Architecture interne
Le service est développé en **NestJS (TypeScript)** et suit une architecture classique en couches :

- **Controller** : exposition des routes HTTP
- **Service** : logique métier (authentification, gestion utilisateurs)
- **Entity (TypeORM)** : persistance en base PostgreSQL
- **Guards & Decorators** : sécurisation par JWT et rôles

---

## Authentification & sécurité
- Authentification basée sur **JWT**
- Le token contient :
  - l’identifiant utilisateur
  - l’email
  - le rôle
- Les routes sensibles sont protégées par :
  - `JwtAuthGuard`
  - `RolesGuard`

La vérification du token peut être faite localement par chaque service ou par l’API Gateway.

---

## Routes exposées

### Authentification
- `POST /auth/login`  
  Authentifie un utilisateur et retourne un access token et un refresh token.

- `POST /auth/refresh`  
  Génère un nouveau token à partir d’un refresh token valide.

---

### Utilisateurs
- `POST /users/register`  
  Création d’un utilisateur (role requis).

- `GET /users/me`  
  Retourne le profil de l’utilisateur connecté (JWT requis).

- `GET /users/admin`  
  Route réservée aux administrateurs.

- `GET /users/all`  
  Liste tous les utilisateurs (admin uniquement).

- `DELETE /users/:id`  
  Supprime un utilisateur (admin uniquement).

- `POST /users/reset-password`  
  Permet à un utilisateur connecté de changer son mot de passe.

---

## Base de données
- PostgreSQL
- Table `user`
- Champs principaux :
  - id
  - email
  - password
  - role

---

## Tests
Les tests du users-service ont été réalisés via **Postman** :
- création d’utilisateurs
- authentification
- accès aux routes protégées
- gestion des rôles

Une collection Postman est fournie pour reproduire les tests.

---

## Communication inter-services
Le users-service expose une API REST.
Il ne consomme pas directement RabbitMQ dans l’état actuel du projet.
